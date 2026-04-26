import uuid
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from backend.database import Session
from backend.models import User

bp = Blueprint("profile", __name__)


@bp.get("/api/profile")
def get_profile():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "email required"}), 400

    with Session() as db:
        user = db.query(User).filter_by(email=email).first()
        return jsonify(user.to_dict() if user else None)


@bp.post("/api/profile")
def save_profile():
    body = request.get_json(silent=True) or {}

    required = ["email", "name", "home_country", "home_currency", "sport"]
    for field in required:
        if not body.get(field):
            return jsonify({"error": f"{field} is required"}), 422

    if len(body["home_currency"]) != 3:
        return jsonify({"error": "home_currency must be a 3-letter code"}), 422

    with Session() as db:
        user = db.query(User).filter_by(email=body["email"]).first()
        if user:
            user.name = body["name"]
            user.home_country = body["home_country"]
            user.home_currency = body["home_currency"]
            user.sport = body["sport"]
            user.monthly_income = float(body.get("monthly_income") or 0)
            user.savings_balance = float(body.get("savings_balance") or 0)
            user.monthly_sponsorship = float(body.get("monthly_sponsorship") or 0)
        else:
            user = User(
                id=str(uuid.uuid4()),
                email=body["email"],
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
