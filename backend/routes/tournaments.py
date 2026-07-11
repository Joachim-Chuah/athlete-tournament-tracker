import math
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from backend.database import Session
from backend.models import User, Tournament
from backend.utils.pnl import calculate_pnl
from backend.utils.currency import fetch_rates, convert

bp = Blueprint("tournaments", __name__)

VALID_SUBSIDY = {"flights", "accommodation", "full_expenses", "flat_stipend"}
VALID_PRIZE_ROUNDS = {"r1", "r2", "r3", "qf", "sf", "f", "w"}
MONEY_FIELDS = {
    "entry_fee",
    "flight_cost",
    "accommodation_total",
    "daily_spending_cap",
    "coaching_cost",
    "misc_cost",
    "subsidy_amount",
    "sponsorship_allocated",
}
PASSTHROUGH_FIELDS = {
    "name",
    "location",
    "country",
    "currency",
    "subsidy_by",
    "subsidy_covers",
}


class TournamentFieldError(ValueError):
    pass


def _coerce_non_negative_float(field: str, value) -> float:
    try:
        coerced = float(value or 0)
    except (TypeError, ValueError) as exc:
        raise TournamentFieldError(f"{field} must be a number") from exc

    if not math.isfinite(coerced):
        raise TournamentFieldError(f"{field} must be a finite number")
    if coerced < 0:
        raise TournamentFieldError(f"{field} must be greater than or equal to 0")
    return coerced


def _coerce_prize_tax_rate(value) -> float:
    try:
        rate = float(value)
    except (TypeError, ValueError) as exc:
        raise TournamentFieldError("prize_tax_rate must be a number") from exc

    if not math.isfinite(rate) or not 0 <= rate <= 100:
        raise TournamentFieldError("prize_tax_rate must be between 0 and 100")

    return rate


def _coerce_prize_rounds(value) -> dict:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise TournamentFieldError("prize_rounds must be an object")

    coerced = {}
    for round_key, amount in value.items():
        if round_key not in VALID_PRIZE_ROUNDS:
            raise TournamentFieldError(f"invalid prize round: {round_key}")
        if amount is not None:
            coerced[round_key] = _coerce_non_negative_float(f"prize_rounds.{round_key}", amount)
    return coerced


def coerce_tournament_fields(body: dict) -> dict:
    coerced = {}

    for field in MONEY_FIELDS:
        if field in body:
            coerced[field] = _coerce_non_negative_float(field, body[field])

    if "duration_days" in body:
        try:
            coerced["duration_days"] = int(body["duration_days"] or 0)
        except (TypeError, ValueError) as exc:
            raise TournamentFieldError("duration_days must be an integer") from exc
        if coerced["duration_days"] < 1:
            raise TournamentFieldError("duration_days must be greater than or equal to 1")

    for field in PASSTHROUGH_FIELDS:
        if field in body:
            coerced[field] = body[field]

    if "prize_tax_rate" in body:
        coerced["prize_tax_rate"] = _coerce_prize_tax_rate(
            body["prize_tax_rate"]
        )

    if "prize_rounds" in body:
        coerced["prize_rounds"] = _coerce_prize_rounds(body["prize_rounds"])

    return coerced


def parse_tournament_date(field: str, value) -> datetime:
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise TournamentFieldError(f"{field} must be a valid ISO date") from exc


def _to_home_currency(data: dict, home_currency: str) -> dict:
    tournament_currency = data.get("currency", home_currency)
    if tournament_currency == home_currency:
        return data

    rates = fetch_rates("USD")

    def cvt(val):
        result = convert(float(val or 0), tournament_currency, home_currency, rates)
        return result if result is not None else float(val or 0)

    prize_rounds = data.get("prize_rounds", {})
    converted_rounds = {k: cvt(v) for k, v in prize_rounds.items() if v is not None}

    return {
        **data,
        "entry_fee": cvt(data.get("entry_fee", 0)),
        "flight_cost": cvt(data.get("flight_cost", 0)),
        "accommodation_total": cvt(data.get("accommodation_total", 0)),
        "daily_spending_cap": cvt(data.get("daily_spending_cap", 0)),
        "coaching_cost": cvt(data.get("coaching_cost", 0)),
        "misc_cost": cvt(data.get("misc_cost", 0)),
        "subsidy_amount": cvt(data.get("subsidy_amount", 0)),
        "sponsorship_allocated": cvt(data.get("sponsorship_allocated", 0)),
        "prize_rounds": converted_rounds,
    }


def _with_pnl(t: Tournament, home_currency: str) -> dict:
    d = t.to_dict()
    d["pnl"] = calculate_pnl(d)
    d["home_currency"] = home_currency
    return d


@bp.get("/tournaments")
def list_tournaments():
    user_id = g.user_id

    with Session() as db:
        user = db.query(User).filter_by(id=user_id).first()
        home_currency = user.home_currency if user else "USD"

        tournaments = (
            db.query(Tournament)
            .filter_by(user_id=user_id)
            .order_by(Tournament.start_date.asc())
            .all()
        )
        return jsonify([_with_pnl(t, home_currency) for t in tournaments])


@bp.post("/tournaments")
def create_tournament():
    body = request.get_json(silent=True) or {}

    required = ["name", "location", "country", "currency", "start_date", "end_date", "duration_days"]
    for field in required:
        if body.get(field) is None:
            return jsonify({"error": f"{field} is required"}), 422

    subsidy_covers = body.get("subsidy_covers")
    if subsidy_covers and subsidy_covers not in VALID_SUBSIDY:
        return jsonify({"error": f"invalid subsidy_covers: {subsidy_covers}"}), 422

    try:
        coerced = coerce_tournament_fields(body)
    except TournamentFieldError as exc:
        return jsonify({"error": str(exc)}), 422

    try:
        start_date = parse_tournament_date("start_date", body["start_date"])
        end_date = parse_tournament_date("end_date", body["end_date"])
    except TournamentFieldError as exc:
        return jsonify({"error": str(exc)}), 422

    with Session() as db:
        user = db.query(User).filter_by(id=g.user_id).first()
        if not user:
            # Authenticated, but profile setup hasn't happened yet.
            return jsonify({"error": "complete your profile before adding tournaments"}), 409

        try:
            converted = _to_home_currency({**body, **coerced}, user.home_currency)
        except Exception:
            return jsonify({"error": "currency conversion failed — try again later"}), 503

        t = Tournament(
            id=str(uuid.uuid4()),
            user_id=g.user_id,
            name=converted["name"],
            location=converted["location"],
            country=converted["country"],
            currency=converted["currency"],
            start_date=start_date,
            end_date=end_date,
            duration_days=int(converted["duration_days"]),
            entry_fee=float(converted.get("entry_fee") or 0),
            flight_cost=float(converted.get("flight_cost") or 0),
            accommodation_total=float(converted.get("accommodation_total") or 0),
            daily_spending_cap=float(converted.get("daily_spending_cap") or 0),
            coaching_cost=float(converted.get("coaching_cost") or 0),
            misc_cost=float(converted.get("misc_cost") or 0),
            subsidy_by=converted.get("subsidy_by"),
            subsidy_amount=float(converted.get("subsidy_amount") or 0),
            subsidy_covers=subsidy_covers,
            sponsorship_allocated=float(converted.get("sponsorship_allocated") or 0),
            prize_rounds=converted.get("prize_rounds") or {},
            prize_tax_rate=float(converted.get("prize_tax_rate") or 0),
        )
        db.add(t)
        db.commit()
        return jsonify(_with_pnl(t, user.home_currency)), 201


@bp.post("/tournaments/pnl-preview")
def preview_tournament_pnl():
    body = request.get_json(silent=True) or {}

    subsidy_covers = body.get("subsidy_covers")
    if subsidy_covers and subsidy_covers not in VALID_SUBSIDY:
        return jsonify({"error": f"invalid subsidy_covers: {subsidy_covers}"}), 422

    try:
        coerced = coerce_tournament_fields(body)
    except TournamentFieldError as exc:
        return jsonify({"error": str(exc)}), 422

    return jsonify(calculate_pnl(coerced))


@bp.get("/tournaments/<id>")
def get_tournament(id: str):
    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t or t.user_id != g.user_id:
            return jsonify({"error": "not found"}), 404
        user = db.query(User).filter_by(id=t.user_id).first()
        home_currency = user.home_currency if user else "USD"
        return jsonify(_with_pnl(t, home_currency))


@bp.patch("/tournaments/<id>")
def update_tournament(id: str):
    body = request.get_json(silent=True) or {}

    subsidy_covers = body.get("subsidy_covers")
    if subsidy_covers and subsidy_covers not in VALID_SUBSIDY:
        return jsonify({"error": f"invalid subsidy_covers: {subsidy_covers}"}), 422

    try:
        coerced = coerce_tournament_fields(body)
    except TournamentFieldError as exc:
        return jsonify({"error": str(exc)}), 422

    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t or t.user_id != g.user_id:
            return jsonify({"error": "not found"}), 404

        # PATCH receives home-currency values; FX conversion is a create-only concern.
        for field, value in coerced.items():
            setattr(t, field, value)

        try:
            if "start_date" in body:
                t.start_date = parse_tournament_date("start_date", body["start_date"])
            if "end_date" in body:
                t.end_date = parse_tournament_date("end_date", body["end_date"])
        except TournamentFieldError as exc:
            return jsonify({"error": str(exc)}), 422

        t.updated_at = datetime.now(timezone.utc)
        db.commit()

        user = db.query(User).filter_by(id=t.user_id).first()
        home_currency = user.home_currency if user else "USD"
        return jsonify(_with_pnl(t, home_currency))


@bp.delete("/tournaments/<id>")
def delete_tournament(id: str):
    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t or t.user_id != g.user_id:
            return jsonify({"error": "not found"}), 404
        db.delete(t)
        db.commit()
        return jsonify({"success": True})
