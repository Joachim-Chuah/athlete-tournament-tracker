from flask import Blueprint, request, jsonify, g
from backend.database import Session
from backend.models import User

bp = Blueprint("profile", __name__)


@bp.get("/api/profile")
def get_profile():
    with Session() as db:
        user = db.query(User).filter_by(id=g.user_id).first()
        return jsonify(user.to_dict() if user else None)


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
