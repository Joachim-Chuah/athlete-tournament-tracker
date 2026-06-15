from flask import Blueprint, request, jsonify, g
from backend.database import Session
from backend.models import User, Tournament
from backend.utils.pnl import calculate_pnl, calculate_runway

bp = Blueprint("profile", __name__)


@bp.get("/api/profile")
def get_profile():
    with Session() as db:
        user = db.query(User).filter_by(id=g.user_id).first()
        if not user:
            return jsonify(None)

        result = user.to_dict()

        tournaments = db.query(Tournament).filter_by(user_id=g.user_id).all()
        net_losses = []
        for t in tournaments:
            pnl = calculate_pnl(t.to_dict())
            realistic = next((s for s in pnl["scenarios"] if s["scenario"] == "realistic"), None)
            if realistic and realistic["net_result"] < 0:
                net_losses.append(abs(realistic["net_result"]))

        if net_losses:
            avg_spend = sum(net_losses) / len(net_losses)
            result["runway_tournaments"] = calculate_runway(user.savings_balance, avg_spend)
        else:
            result["runway_tournaments"] = None

        return jsonify(result)


@bp.post("/api/profile")
def save_profile():
    body = request.get_json(silent=True) or {}

    # Identity comes from the verified token, never the client.
    required = ["name", "home_country", "home_currency", "sport"]
    for field in required:
        if not body.get(field):
            return jsonify({"error": f"{field} is required"}), 422

    if len(body["home_currency"]) != 3:
        return jsonify({"error": "home_currency must be a 3-letter code"}), 422

    with Session() as db:
        user = db.query(User).filter_by(id=g.user_id).first()
        if user:
            user.name = body["name"]
            user.home_country = body["home_country"]
            user.home_currency = body["home_currency"]
            user.sport = body["sport"]
            user.monthly_income = float(body.get("monthly_income") or 0)
            user.savings_balance = float(body.get("savings_balance") or 0)
            user.monthly_sponsorship = float(body.get("monthly_sponsorship") or 0)
        else:
            # email is a NOT NULL column but isn't a guaranteed JWT claim — bail
            # out cleanly rather than letting the insert raise an IntegrityError.
            if not g.email:
                return jsonify({"error": "token is missing an email claim"}), 422
            user = User(
                id=g.user_id,
                email=g.email,
                name=body["name"],
                home_country=body["home_country"],
                home_currency=body["home_currency"],
                sport=body["sport"],
                monthly_income=float(body.get("monthly_income") or 0),
                savings_balance=float(body.get("savings_balance") or 0),
                monthly_sponsorship=float(body.get("monthly_sponsorship") or 0),
            )
            db.add(user)

        db.commit()
        return jsonify(user.to_dict()), 201
