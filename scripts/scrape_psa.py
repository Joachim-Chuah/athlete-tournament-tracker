#!/usr/bin/env python3
"""
PSA World Tour scraper — fetches from the PSA public WordPress REST API.
Replaces the old Node.js scraper. Run from project root:
    python scripts/scrape_psa.py
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timezone
from pathlib import Path

# Load .env.local before importing db/models
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env.local")

# Add project root to path so backend imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import Session
from backend.models import KnownTournament

PSA_API = "https://www.psasquashtour.com/wp-json/wp/v2/tournament"
PER_PAGE = 100
CUTOFF = datetime(2025, 1, 1, tzinfo=timezone.utc)

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

COUNTRY_NAMES = {
    "US": "United States", "GB": "United Kingdom", "UK": "United Kingdom",
    "BR": "Brazil", "EG": "Egypt", "QA": "Qatar", "MY": "Malaysia",
    "HK": "Hong Kong", "FR": "France", "DE": "Germany", "AU": "Australia",
    "NL": "Netherlands", "BE": "Belgium", "CH": "Switzerland", "AT": "Austria",
    "SA": "Saudi Arabia", "AE": "United Arab Emirates", "KW": "Kuwait",
    "OM": "Oman", "PK": "Pakistan", "IN": "India", "CN": "China",
    "JP": "Japan", "KR": "South Korea", "MX": "Mexico", "CO": "Colombia",
    "AR": "Argentina", "GH": "Ghana", "NG": "Nigeria", "ZA": "South Africa",
    "KE": "Kenya", "MA": "Morocco", "TN": "Tunisia", "CA": "Canada",
    "NZ": "New Zealand", "SG": "Singapore", "PH": "Philippines", "TH": "Thailand",
    "ZW": "Zimbabwe", "ES": "Spain", "IT": "Italy", "PT": "Portugal",
    "SE": "Sweden", "NO": "Norway", "DK": "Denmark", "FI": "Finland",
    "CZ": "Czech Republic", "PL": "Poland", "RO": "Romania", "HU": "Hungary",
    "GR": "Greece", "IE": "Ireland", "TR": "Turkey", "GY": "Guyana",
    "TT": "Trinidad and Tobago", "JM": "Jamaica", "LK": "Sri Lanka",
}


def actual_draw_size(comp: dict) -> int:
    """Use confirmed player count from the draw, not the capacity slot count.
    The PSA API's draws[].size is the max capacity; actual entries are often lower."""
    draws = comp.get("draws") or []
    if not draws:
        return 16
    players = draws[0].get("players") or []
    if players:
        return len(players)
    capacity = draws[0].get("size", 16)
    return min(capacity, 32)


def estimate_prize_rounds(prize_total: float, draw_size: int, tier: str) -> dict:
    """Tier takes priority over draw size so a Silver event with 32 capacity
    slots doesn't get Gold percentages."""
    if not prize_total or prize_total <= 0:
        return {}
    p = lambda pct: round(prize_total * pct)
    if tier in ("Platinum", "Finals") or draw_size >= 64:
        return {"r1": p(0.008), "r2": p(0.015), "r3": p(0.028), "qf": p(0.055), "sf": p(0.105), "f": p(0.20), "w": p(0.35)}
    if tier == "Gold" or draw_size >= 32:
        return {"r1": p(0.015), "r2": p(0.03), "qf": p(0.065), "sf": p(0.115), "f": p(0.22), "w": p(0.40)}
    if tier == "Silver" or draw_size >= 16:
        return {"r1": p(0.04), "qf": p(0.085), "sf": p(0.14), "f": p(0.26), "w": p(0.44)}
    return {"qf": p(0.06), "sf": p(0.16), "f": p(0.29), "w": p(0.50)}


def parse_location(loc: str) -> tuple[str, str, str]:
    if not loc:
        return "Unknown", "??", "Unknown"
    parts = loc.rsplit(", ", 1)
    code = parts[-1].strip().upper() if len(parts) > 1 else "??"
    city = parts[0].strip() if len(parts) > 1 else loc
    country = COUNTRY_NAMES.get(code, code)
    return city, code, country


def parse_date(s: str):
    if not s or len(s) < 8:
        return None
    try:
        return datetime(int(s[:4]), int(s[4:6]), int(s[6:8]), tzinfo=timezone.utc)
    except ValueError:
        return None


def fetch_page(page: int) -> tuple[list, int]:
    resp = requests.get(
        PSA_API,
        params={"per_page": PER_PAGE, "page": page, "_fields": "id,slug,title,meta"},
        headers={"User-Agent": "AthleteTracker/1.0 (tournament data aggregation)"},
        timeout=15,
    )
    resp.raise_for_status()
    total_pages = int(resp.headers.get("x-wp-totalpages", 1))
    return resp.json(), total_pages


def scrape():
    print("Fetching PSA tournament data...")
    first_page, total_pages = fetch_page(1)
    print(f"Total pages: {total_pages}")

    all_tournaments = list(first_page)
    for page in range(2, min(total_pages, 51)):
        data, _ = fetch_page(page)
        all_tournaments.extend(data)
        if page % 10 == 0:
            print(f"  Fetched page {page}/{min(total_pages, 50)}")
        time.sleep(0.15)

    print(f"Processing {len(all_tournaments)} tournaments...")
    upserted = 0
    skipped = 0

    with Session() as db:
        for raw in all_tournaments:
            if not isinstance(raw, dict):
                continue

            meta = raw.get("meta") or {}
            start_date = parse_date(meta.get("start_date", ""))
            end_date = parse_date(meta.get("end_date", ""))

            if not start_date or start_date < CUTOFF:
                skipped += 1
                continue

            city, code, country = parse_location(meta.get("location", ""))

            comps_raw = meta.get("competitions", "[]")
            try:
                comps = json.loads(comps_raw) if isinstance(comps_raw, str) else (comps_raw or [])
            except Exception:
                comps = []

            for comp in comps:
                if not isinstance(comp, dict):
                    continue

                level_id = comp.get("level_id")
                tier = LEVEL_TIERS.get(level_id, "Open")
                tour_level = LEVEL_TOUR.get(level_id, "World Tour")
                prize_total = comp.get("prize_total") or 0
                draw_size = actual_draw_size(comp)
                gender = comp.get("name") or "Open"

                duration = max(1, (end_date - start_date).days) if end_date else 7
                prize_rounds = estimate_prize_rounds(prize_total, draw_size, tier)
                psa_id = f"psa-{raw['id']}-{comp.get('competition_id', 0)}"
                title = raw.get("title", {}).get("rendered", "Unknown")
                name = title if gender == "Open" else f"{title} ({gender})"

                existing = db.query(KnownTournament).filter_by(psa_id=psa_id).first()
                if existing:
                    existing.name = name
                    existing.tier = tier
                    existing.tour_level = tour_level
                    existing.level_id = level_id
                    existing.location = city
                    existing.country = country
                    existing.country_code = code
                    existing.start_date = start_date
                    existing.end_date = end_date
                    existing.duration_days = duration
                    existing.prize_total = prize_total
                    existing.prize_rounds = prize_rounds
                    existing.draw_size = draw_size
                    existing.gender = gender
                    existing.updated_at = datetime.now(timezone.utc)
                else:
                    import uuid
                    db.add(KnownTournament(
                        id=str(uuid.uuid4()),
                        psa_id=psa_id,
                        name=name,
                        sport="squash",
                        tier=tier,
                        tour_level=tour_level,
                        level_id=level_id,
                        location=city,
                        country=country,
                        country_code=code,
                        currency="USD",
                        start_date=start_date,
                        end_date=end_date,
                        duration_days=duration,
                        prize_total=prize_total,
                        prize_rounds=prize_rounds,
                        draw_size=draw_size,
                        gender=gender,
                        source="psa",
                    ))

                upserted += 1

        db.commit()

    print(f"Done. Upserted: {upserted}, Skipped (pre-2025): {skipped}")


if __name__ == "__main__":
    scrape()
