import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from backend.database import Session
from backend.models import User, Tournament
from backend.utils.pnl import calculate_pnl
from backend.utils.currency import fetch_rates, convert

bp = Blueprint("tournaments", __name__)

VALID_SUBSIDY = {"flights", "accommodation", "full_expenses", "flat_stipend"}


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


@bp.get("/api/tournaments")
def list_tournaments():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

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


@bp.post("/api/tournaments")
def create_tournament():
    body = request.get_json(silent=True) or {}

    required = ["user_id", "name", "location", "country", "currency", "start_date", "end_date", "duration_days"]
    for field in required:
        if body.get(field) is None:
            return jsonify({"error": f"{field} is required"}), 422

    subsidy_covers = body.get("subsidy_covers")
    if subsidy_covers and subsidy_covers not in VALID_SUBSIDY:
        return jsonify({"error": f"invalid subsidy_covers: {subsidy_covers}"}), 422

    with Session() as db:
        user = db.query(User).filter_by(id=body["user_id"]).first()
        if not user:
            return jsonify({"error": "user not found"}), 404

        converted = _to_home_currency(body, user.home_currency)

        t = Tournament(
            id=str(uuid.uuid4()),
            user_id=body["user_id"],
            name=converted["name"],
            location=converted["location"],
            country=converted["country"],
            currency=converted["currency"],
            start_date=datetime.fromisoformat(converted["start_date"]).replace(tzinfo=timezone.utc),
            end_date=datetime.fromisoformat(converted["end_date"]).replace(tzinfo=timezone.utc),
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
        )
        db.add(t)
        db.commit()
        return jsonify(_with_pnl(t, user.home_currency)), 201


@bp.get("/api/tournaments/<id>")
def get_tournament(id: str):
    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t:
            return jsonify({"error": "not found"}), 404
        user = db.query(User).filter_by(id=t.user_id).first()
        home_currency = user.home_currency if user else "USD"
        return jsonify(_with_pnl(t, home_currency))


@bp.patch("/api/tournaments/<id>")
def update_tournament(id: str):
    body = request.get_json(silent=True) or {}

    subsidy_covers = body.get("subsidy_covers")
    if subsidy_covers and subsidy_covers not in VALID_SUBSIDY:
        return jsonify({"error": f"invalid subsidy_covers: {subsidy_covers}"}), 422

    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t:
            return jsonify({"error": "not found"}), 404

        updatable = [
            "name", "location", "country", "currency", "duration_days",
            "entry_fee", "flight_cost", "accommodation_total", "daily_spending_cap",
            "coaching_cost", "misc_cost", "subsidy_by", "subsidy_amount",
            "subsidy_covers", "sponsorship_allocated", "prize_rounds",
        ]
        for field in updatable:
            if field in body:
                setattr(t, field, body[field])

        if "start_date" in body:
            t.start_date = datetime.fromisoformat(body["start_date"]).replace(tzinfo=timezone.utc)
        if "end_date" in body:
            t.end_date = datetime.fromisoformat(body["end_date"]).replace(tzinfo=timezone.utc)

        t.updated_at = datetime.now(timezone.utc)
        db.commit()

        user = db.query(User).filter_by(id=t.user_id).first()
        home_currency = user.home_currency if user else "USD"
        return jsonify(_with_pnl(t, home_currency))


@bp.delete("/api/tournaments/<id>")
def delete_tournament(id: str):
    with Session() as db:
        t = db.query(Tournament).filter_by(id=id).first()
        if not t:
            return jsonify({"error": "not found"}), 404
        db.delete(t)
        db.commit()
        return jsonify({"success": True})
