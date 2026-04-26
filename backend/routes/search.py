import requests
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func
from backend.database import Session
from backend.models import KnownTournament

bp = Blueprint("search", __name__)

PSA_API = "https://www.psasquashtour.com/wp-json/wp/v2/tournament"

LEVEL_TIERS = {
    101: "Finals", 117: "Platinum", 97: "Platinum",
    100: "Platinum", 99: "Platinum", 116: "Gold",
    108: "Silver", 110: "Silver", 107: "Bronze",
    109: "Challenger", 104: "Challenger", 106: "Qualifying", 98: "Challenger",
}


def _estimate_prize_rounds(prize_total: float, draw_size: int, tier: str) -> dict:
    if not prize_total or prize_total <= 0:
        return {}
    p = lambda pct: round(prize_total * pct)
    if draw_size >= 64 or tier in ("Platinum", "Finals"):
        return {"r1": p(0.008), "r2": p(0.015), "r3": p(0.028), "qf": p(0.055), "sf": p(0.105), "f": p(0.20), "w": p(0.35)}
    if draw_size >= 32 or tier == "Gold":
        return {"r1": p(0.015), "r2": p(0.03), "qf": p(0.065), "sf": p(0.115), "f": p(0.22), "w": p(0.40)}
    if draw_size >= 16 or tier == "Silver":
        return {"r1": p(0.03), "qf": p(0.075), "sf": p(0.13), "f": p(0.25), "w": p(0.44)}
    return {"qf": p(0.05), "sf": p(0.15), "f": p(0.27), "w": p(0.50)}


def _psa_raw_to_result(raw: dict) -> dict | None:
    try:
        meta = raw.get("meta") or {}
        name = (raw.get("title") or {}).get("rendered", "Unknown")
        loc = meta.get("location", "")
        parts = loc.rsplit(", ", 1)
        city = parts[0] if len(parts) > 1 else loc
        country = parts[-1] if len(parts) > 1 else ""

        start_str = meta.get("start_date", "")
        end_str = meta.get("end_date", "")

        def parse_date(s):
            if len(s) < 8:
                return None
            return f"{s[:4]}-{s[4:6]}-{s[6:8]}"

        start_date = parse_date(start_str)
        end_date = parse_date(end_str)

        import json
        comps = meta.get("competitions", "[]")
        if isinstance(comps, str):
            comps = json.loads(comps)
        comp = comps[0] if comps else {}

        level_id = comp.get("level_id")
        tier = LEVEL_TIERS.get(level_id, "Open")
        prize_total = comp.get("prize_total") or 0
        draw_size = (comp.get("draws") or [{}])[0].get("size", 32) if comp.get("draws") else 32

        from datetime import datetime
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        duration = max(1, (end - start).days) if start and end else 7

        return {
            "id": f"psa-live-{raw['id']}",
            "name": name,
            "sport": "squash",
            "tier": tier,
            "location": city,
            "country": country,
            "currency": "USD",
            "typical_month": start.month if start else 6,
            "duration_days": duration,
            "prize_rounds": _estimate_prize_rounds(prize_total, draw_size, tier),
            "start_date": start_date,
            "end_date": end_date,
        }
    except Exception:
        return None


def _search_psa_live(q: str) -> list:
    try:
        resp = requests.get(
            PSA_API,
            params={"search": q, "per_page": 8, "_fields": "id,slug,title,meta"},
            headers={"User-Agent": "AthleteTracker/1.0"},
            timeout=4,
        )
        if not resp.ok:
            return []
        results = [_psa_raw_to_result(r) for r in resp.json()]
        return [r for r in results if r is not None]
    except Exception:
        return []


@bp.get("/api/tournaments/search")
def search_tournaments():
    q = request.args.get("q", "").strip()
    sport = request.args.get("sport", "").strip().lower() or None

    db_results = []
    try:
        with Session() as db:
            query = db.query(KnownTournament)
            if sport:
                query = query.filter(KnownTournament.sport == sport)
            if q:
                query = query.filter(
                    or_(
                        func.lower(KnownTournament.name).contains(q.lower()),
                        func.lower(KnownTournament.location).contains(q.lower()),
                        func.lower(KnownTournament.country).contains(q.lower()),
                        func.lower(KnownTournament.tier).contains(q.lower()),
                    )
                )
            results = (
                query.order_by(KnownTournament.prize_total.desc(), KnownTournament.start_date.asc())
                .limit(12)
                .all()
            )
            db_results = [r.to_dict() for r in results]
    except Exception:
        pass

    is_squash = not sport or sport == "squash"
    needs_live = is_squash and len(q) > 1 and len(db_results) < 4

    if needs_live:
        live = _search_psa_live(q)
        existing_names = {r["name"].lower() for r in db_results}
        fresh = [r for r in live if r["name"].lower() not in existing_names]
        merged = (db_results + fresh)[:12]
        if merged:
            return jsonify(merged)

    return jsonify(db_results)
