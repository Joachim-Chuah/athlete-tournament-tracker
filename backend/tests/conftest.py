"""
Shared pytest fixtures for HTTP-level route tests.
All fixtures here avoid touching the real database or auth service.
"""

from unittest.mock import MagicMock, patch

import pytest

from backend.app import create_app

USER_ID = "user-123"
USER_EMAIL = "test@example.com"
FAKE_IDENTITY = {"user_id": USER_ID, "email": USER_EMAIL, "claims": {}}


@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    with app.test_client() as c:
        yield c


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer fake-token", "Content-Type": "application/json"}


@pytest.fixture
def mock_auth():
    """Bypass JWT verification for the duration of one test."""
    with patch("backend.app.verify_token", return_value=FAKE_IDENTITY):
        yield


def make_mock_user(
    *,
    home_currency="USD",
    savings_balance=10_000.0,
    name="Test Athlete",
    sport="squash",
):
    user = MagicMock()
    user.id = USER_ID
    user.email = USER_EMAIL
    user.name = name
    user.home_currency = home_currency
    user.savings_balance = savings_balance
    user.to_dict.return_value = {
        "id": USER_ID,
        "email": USER_EMAIL,
        "name": name,
        "home_country": "US",
        "home_currency": home_currency,
        "sport": sport,
        "monthly_income": 0.0,
        "savings_balance": savings_balance,
        "monthly_sponsorship": 0.0,
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    return user


def make_mock_tournament(prize_rounds=None, net_loss_realistic=4200.0):
    """Return a mock Tournament whose to_dict() produces a lossy realistic scenario."""
    t = MagicMock()
    t.id = "tournament-456"
    t.user_id = USER_ID
    t.to_dict.return_value = {
        "id": "tournament-456",
        "user_id": USER_ID,
        "name": "Test Open",
        "location": "London",
        "country": "UK",
        "currency": "USD",
        "start_date": "2026-03-01T00:00:00+00:00",
        "end_date": "2026-03-07T00:00:00+00:00",
        "duration_days": 7,
        "entry_fee": 250,
        "flight_cost": 1200,
        "accommodation_total": 1400,
        "daily_spending_cap": 150,
        "coaching_cost": 600,
        "misc_cost": 200,
        "subsidy_amount": 0,
        "subsidy_covers": None,
        "sponsorship_allocated": 500,
        "prize_rounds": prize_rounds or {"r1": 500, "qf": 4800, "sf": 9000, "w": 25000},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    return t


def make_session_cm(mock_db):
    """Wrap a mock db in a context manager that supports `with Session() as db:`."""
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=mock_db)
    cm.__exit__ = MagicMock(return_value=False)
    return cm
