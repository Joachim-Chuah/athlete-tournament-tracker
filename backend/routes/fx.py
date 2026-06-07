from flask import Blueprint, request, jsonify
from backend.utils.currency import fetch_rates, convert

bp = Blueprint("fx", __name__)


@bp.get("/api/fx")
def fx_convert():
    from_ = request.args.get("from", "").upper()
    to = request.args.get("to", "").upper()
    try:
        amount = float(request.args.get("amount", "1"))
    except ValueError:
        return jsonify({"error": "amount must be a number"}), 400

    if not from_ or not to:
        return jsonify({"error": "from and to currency codes required"}), 400

    try:
        rates = fetch_rates("USD")
    except Exception:
        return jsonify({"error": "exchange rate service unavailable"}), 503

    converted = convert(amount, from_, to, rates)

    if converted is None:
        return jsonify({"error": f"Unknown currency: {from_} or {to}"}), 400

    return jsonify({
        "from": from_,
        "to": to,
        "amount": amount,
        "converted": converted,
        "rate": converted / amount if amount else 0,
    })
