"""
HTTP-level tests for GET /api/profile and POST /api/profile
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from backend.tests.conftest import (
    USER_ID,
    USER_EMAIL,
    make_mock_user,
    make_mock_tournament,
    make_session_cm,
)
from backend.models import User, Tournament


def _mock_db_for_get(user, tournaments=None):
    """Build a mock db whose query() dispatches correctly for User and Tournament."""
    mock_db = MagicMock()
    tournaments = tournaments or []

    user_q = MagicMock()
    user_q.filter_by.return_value.first.return_value = user

    tournament_q = MagicMock()
    tournament_q.filter_by.return_value.all.return_value = tournaments

    def _query(model):
        if model is User:
            return user_q
        if model is Tournament:
            return tournament_q
        return MagicMock()

    mock_db.query.side_effect = _query
    return mock_db


# ---------------------------------------------------------------------------
# GET /api/profile
# ---------------------------------------------------------------------------

class TestGetProfile:
    def test_returns_null_when_no_profile(self, client, mock_auth, auth_headers):
        mock_db = _mock_db_for_get(user=None)
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.get("/api/profile", headers=auth_headers)
        assert r.status_code == 200
        assert r.get_json() is None

    def test_returns_user_dict(self, client, mock_auth, auth_headers):
        user = make_mock_user()
        mock_db = _mock_db_for_get(user=user, tournaments=[])
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.get("/api/profile", headers=auth_headers)
        assert r.status_code == 200
        data = r.get_json()
        assert data["id"] == USER_ID
        assert data["home_currency"] == "USD"

    def test_runway_is_none_when_no_tournaments(self, client, mock_auth, auth_headers):
        user = make_mock_user(savings_balance=10_000)
        mock_db = _mock_db_for_get(user=user, tournaments=[])
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.get("/api/profile", headers=auth_headers)
        assert r.get_json()["runway_tournaments"] is None

    def test_runway_is_none_when_all_tournaments_profitable(self, client, mock_auth, auth_headers):
        user = make_mock_user(savings_balance=10_000)
        # Tournament where every scenario is profitable (huge prize, tiny costs)
        t = make_mock_tournament()
        t.to_dict.return_value = {
            **t.to_dict(),
            "prize_rounds": {"r1": 50_000, "w": 100_000},
            "flight_cost": 100, "accommodation_total": 100,
            "daily_spending_cap": 10, "duration_days": 3,
            "entry_fee": 0, "coaching_cost": 0, "misc_cost": 0,
            "sponsorship_allocated": 0, "subsidy_amount": 0, "subsidy_covers": None,
        }
        mock_db = _mock_db_for_get(user=user, tournaments=[t])
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.get("/api/profile", headers=auth_headers)
        assert r.get_json()["runway_tournaments"] is None

    def test_runway_calculated_from_avg_realistic_loss(self, client, mock_auth, auth_headers):
        # expenses = 1200+1400+(150×7)+600+200+250 = 4700, sponsorship = 500
        # realistic = qf at 4800 → net = 4800+500-4700 = +600 (profitable)
        # worst = r1 at 500 → net = 500+500-4700 = -3700 (loss)
        # The realistic scenario here is profitable so runway = None
        # Let's use a tournament where realistic is a loss
        user = make_mock_user(savings_balance=10_000)
        t = make_mock_tournament()
        # Only one round: w (so worst=realistic=best all the same). Set prize low.
        t.to_dict.return_value = {
            **t.to_dict(),
            "prize_rounds": {"w": 1000},  # only 1 round
            "flight_cost": 2000, "accommodation_total": 1000,
            "daily_spending_cap": 100, "duration_days": 7,
            "entry_fee": 0, "coaching_cost": 0, "misc_cost": 0,
            "sponsorship_allocated": 0, "subsidy_amount": 0, "subsidy_covers": None,
        }
        # expenses = 2000+1000+700 = 3700, prize = 1000, realistic net = 1000-3700 = -2700
        mock_db = _mock_db_for_get(user=user, tournaments=[t])
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.get("/api/profile", headers=auth_headers)
        data = r.get_json()
        # savings=10000, avg_loss=2700 → runway = int(10000/2700) = 3
        assert data["runway_tournaments"] == 3

    def test_no_auth_returns_401(self, client):
        r = client.get("/api/profile")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/profile
# ---------------------------------------------------------------------------

class TestPostProfile:
    VALID_BODY = {
        "name": "Test Athlete",
        "home_country": "US",
        "home_currency": "USD",
        "sport": "squash",
        "savings_balance": 5000,
    }

    def test_missing_name_returns_422(self, client, mock_auth, auth_headers):
        body = {**self.VALID_BODY}
        del body["name"]
        r = client.post("/api/profile", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "name" in r.get_json()["error"]

    def test_missing_home_currency_returns_422(self, client, mock_auth, auth_headers):
        body = {**self.VALID_BODY}
        del body["home_currency"]
        r = client.post("/api/profile", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    def test_invalid_currency_length_returns_422(self, client, mock_auth, auth_headers):
        body = {**self.VALID_BODY, "home_currency": "USDD"}
        r = client.post("/api/profile", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "3-letter" in r.get_json()["error"]

    def test_creates_new_user_returns_201(self, client, mock_auth, auth_headers):
        user = make_mock_user()
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            with patch("backend.routes.profile.User", return_value=user):
                r = client.post("/api/profile", data=json.dumps(self.VALID_BODY),
                                headers=auth_headers)
        assert r.status_code == 201

    def test_updates_existing_user_returns_201(self, client, mock_auth, auth_headers):
        existing = make_mock_user()
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = existing
        cm = make_session_cm(mock_db)
        with patch("backend.routes.profile.Session", return_value=cm):
            r = client.post("/api/profile", data=json.dumps(self.VALID_BODY),
                            headers=auth_headers)
        assert r.status_code == 201
        assert existing.name == "Test Athlete"
        assert existing.home_currency == "USD"
