import re
import json as _json
import requests
from datetime import datetime, timedelta, timezone
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

LEVEL_TOUR = {
    101: "World Tour", 117: "World Tour", 97: "World Tour",
    100: "World Tour", 99: "World Tour", 116: "World Tour",
    108: "World Tour", 110: "World Tour", 107: "Challenger Tour",
    109: "Challenger Tour", 104: "Challenger Tour", 106: "Qualifying", 98: "Challenger Tour",
}

_GENDER_SUFFIX = re.compile(r'\s*\((men|women|open|mixed)\)\s*$', re.IGNORECASE)


def _base_name(name: str) -> str:
    """Strip Men/Women/Open/Mixed suffix for dedup purposes."""
    return _GENDER_SUFFIX.sub("", name).strip().lower()


def _dedupe_key(result: dict) -> str:
    """Base name (no gender) + start_date. Prevents live results from adding a
    3rd generic entry when DB already has (Men) + (Women) entries."""
    return f"{_base_name(result['name'])}|{result.get('start_date', '')}"


def _actual_draw_size(comp: dict) -> int:
    """Use confirmed player count from the draw rather than the capacity slot count.
    The PSA API's draws[].size is the max capacity; actual entries are often much lower."""
    draws = comp.get("draws") or []
    if not draws:
        return 16
    players = draws[0].get("players") or []
    if players:
        return len(players)
    # Fall back to capacity, but cap it conservatively so we don't over-estimate
    capacity = draws[0].get("size", 16)
    return min(capacity, 32)


def _estimate_prize_rounds(prize_total: float, draw_size: int, tier: str) -> dict:
    """Estimate per-round prize breakdown. Tier takes priority over draw size so a
    Silver event with 32 capacity slots doesn't get Gold percentages."""
    if not prize_total or prize_total <= 0:
        return {}
    p = lambda pct: round(prize_total * pct)

    if tier in ("Platinum", "Finals") or draw_size >= 64:
        return {"r1": p(0.008), "r2": p(0.015), "r3": p(0.028), "qf": p(0.055), "sf": p(0.105), "f": p(0.20), "w": p(0.35)}
    if tier == "Gold" or draw_size >= 32:
        return {"r1": p(0.015), "r2": p(0.03), "qf": p(0.065), "sf": p(0.115), "f": p(0.22), "w": p(0.40)}
    if tier == "Silver" or draw_size >= 16:
        return {"r1": p(0.04), "qf": p(0.085), "sf": p(0.14), "f": p(0.26), "w": p(0.44)}
    # Bronze / Challenger / Qualifying (small draws, 8–12 players)
    return {"qf": p(0.06), "sf": p(0.16), "f": p(0.29), "w": p(0.50)}


def _comp_to_result(raw: dict, comp: dict, start_date: str | None, end_date: str | None,
                    city: str, country: str, duration: int, start: datetime | None) -> dict:
    """Convert a single PSA competition dict into a search result dict."""
    level_id = comp.get("level_id")
    tier = LEVEL_TIERS.get(level_id, "Open")
    tour_level = LEVEL_TOUR.get(level_id, "World Tour")
    prize_total = float(comp.get("prize_total") or 0)
    draw_size = _actual_draw_size(comp)
    gender = (comp.get("name") or "").strip()

    base_title = (raw.get("title") or {}).get("rendered", "Unknown")
    name = f"{base_title} ({gender})" if gender and gender.lower() not in ("open", "") else base_title

    return {
        "id": f"psa-live-{raw['id']}-{comp.get('competition_id', 0)}",
        "name": name,
        "sport": "squash",
        "tier": tier,
        "tour_level": tour_level,
        "location": city,
        "country": country,
        "currency": "USD",
        "typical_month": start.month if start else 6,
        "duration_days": duration,
        "prize_total": prize_total,
        "prize_rounds": _estimate_prize_rounds(prize_total, draw_size, tier),
        "start_date": start_date,
        "end_date": end_date,
    }


def _psa_raw_to_results(raw: dict) -> list[dict]:
    """Return one result per competition (Men/Women/Open) from a PSA tournament record."""
    try:
        meta = raw.get("meta") or {}
        loc = meta.get("location", "")
        parts = loc.rsplit(", ", 1)
        city = parts[0] if len(parts) > 1 else loc
        country = parts[-1] if len(parts) > 1 else ""

        def parse_date(s: str):
            return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if s and len(s) >= 8 else None

        start_date = parse_date(meta.get("start_date", ""))
        end_date = parse_date(meta.get("end_date", ""))
        start = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        duration = max(1, (end_dt - start).days) if start and end_dt else 7

        comps = meta.get("competitions", "[]")
        if isinstance(comps, str):
            comps = _json.loads(comps)
        if not comps:
            return []

        return [
            _comp_to_result(raw, comp, start_date, end_date, city, country, duration, start)
            for comp in comps
            if isinstance(comp, dict)
        ]
    except Exception:
        return []


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
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).date().isoformat()
        results = []
        for r in resp.json():
            results.extend(_psa_raw_to_results(r))
        return [r for r in results if (r.get("start_date") or "9999") >= cutoff]
    except Exception:
        return []


@bp.get("/api/tournaments/search")
def search_tournaments():
    q = request.args.get("q", "").strip()
    sport = request.args.get("sport", "").strip().lower() or None

    upcoming_cutoff = datetime.now(timezone.utc) - timedelta(days=14)

    db_results = []
    try:
        with Session() as db:
            query = db.query(KnownTournament).filter(
                KnownTournament.start_date >= upcoming_cutoff
            )
            if sport:
                query = query.filter(KnownTournament.sport == sport)
            if q:
                query = query.filter(
                    or_(
                        func.lower(KnownTournament.name).contains(q.lower()),
                        func.lower(KnownTournament.location).contains(q.lower()),
                        func.lower(KnownTournament.country).contains(q.lower()),
                        func.lower(KnownTournament.tier).contains(q.lower()),
                        func.lower(KnownTournament.tour_level).contains(q.lower()),
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
        # Dedupe by base name (stripped of gender) + start_date so live results
        # don't add a 3rd generic entry when DB already has (Men) + (Women)
        existing_keys = {_dedupe_key(r) for r in db_results}
        fresh = [r for r in live if _dedupe_key(r) not in existing_keys]
        merged = (db_results + fresh)[:12]
        if merged:
            return jsonify(merged)

    return jsonify(db_results)
