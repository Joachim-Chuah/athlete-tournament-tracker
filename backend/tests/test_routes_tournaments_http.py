"""
HTTP-level tests for POST /api/tournaments (create) and PATCH /api/tournaments/<id>.
Focus: validation parity (create now matches patch/preview), date parsing, FX errors.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from backend.tests.conftest import (
    USER_ID,
    make_mock_user,
    make_mock_tournament,
    make_session_cm,
)
from backend.models import User, Tournament

VALID_BODY = {
    "name": "British Open",
    "location": "Birmingham",
    "country": "UK",
    "currency": "USD",
    "start_date": "2026-05-01",
    "end_date": "2026-05-07",
    "duration_days": 7,
    "entry_fee": 250,
    "flight_cost": 800,
    "accommodation_total": 1000,
    "daily_spending_cap": 100,
    "coaching_cost": 0,
    "misc_cost": 0,
    "prize_rounds": {"r1": 500, "qf": 4800, "w": 25000},
}


def _make_db(user, tournament=None):
    mock_db = MagicMock()
    user_q = MagicMock()
    user_q.filter_by.return_value.first.return_value = user

    def _query(model):
        if model is User:
            return user_q
        return MagicMock()

    mock_db.query.side_effect = _query
    return mock_db


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

class TestCreateTournamentAuth:
    def test_no_token_returns_401(self, client):
        r = client.post("/api/tournaments", data=json.dumps(VALID_BODY),
                        content_type="application/json")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Required field validation
# ---------------------------------------------------------------------------

class TestCreateTournamentRequiredFields:
    @pytest.mark.parametrize("missing_field", [
        "name", "location", "country", "currency", "start_date", "end_date", "duration_days"
    ])
    def test_missing_required_field_returns_422(self, client, mock_auth, auth_headers, missing_field):
        body = {**VALID_BODY}
        del body[missing_field]
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert missing_field in r.get_json()["error"]


# ---------------------------------------------------------------------------
# Monetary field validation (parity with PATCH + preview) — was the critical bug
# ---------------------------------------------------------------------------

class TestCreateTournamentMoneyValidation:
    def test_negative_entry_fee_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "entry_fee": -1}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "entry_fee" in r.get_json()["error"]

    def test_negative_flight_cost_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "flight_cost": -100}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    def test_non_numeric_money_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "accommodation_total": "lots"}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "accommodation_total" in r.get_json()["error"]

    def test_zero_duration_days_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "duration_days": 0}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    def test_negative_duration_days_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "duration_days": -3}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    def test_invalid_prize_round_key_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "prize_rounds": {"bronze": 100}}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    def test_negative_prize_round_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "prize_rounds": {"r1": -50}}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422

    @pytest.mark.parametrize("rate", [-1, 100.01, "nan"])
    def test_invalid_prize_tax_rate_returns_422(
        self,
        client,
        mock_auth,
        auth_headers,
        rate,
    ):
        body = {**VALID_BODY, "prize_tax_rate": rate}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "prize_tax_rate" in r.get_json()["error"]


class TestCreateTournamentPrizeTax:
    def test_create_persists_prize_tax_rate(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "prize_tax_rate": "30"}
        user = make_mock_user()
        mock_db = _make_db(user)
        cm = make_session_cm(mock_db)
        mock_t = make_mock_tournament()

        with patch("backend.routes.tournaments.Session", return_value=cm):
            with patch("backend.routes.tournaments.Tournament", return_value=mock_t) as tournament_cls:
                with patch("backend.routes.tournaments._with_pnl", return_value={}):
                    r = client.post(
                        "/api/tournaments",
                        data=json.dumps(body),
                        headers=auth_headers,
                    )

        assert r.status_code == 201
        assert tournament_cls.call_args.kwargs["prize_tax_rate"] == 30.0


# ---------------------------------------------------------------------------
# Date validation (was missing from create, only worked on update)
# ---------------------------------------------------------------------------

class TestCreateTournamentDateValidation:
    def test_invalid_start_date_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "start_date": "not-a-date"}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "start_date" in r.get_json()["error"]

    def test_invalid_end_date_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "end_date": "2026-99-99"}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "end_date" in r.get_json()["error"]


# ---------------------------------------------------------------------------
# Subsidy validation
# ---------------------------------------------------------------------------

class TestCreateTournamentSubsidy:
    def test_invalid_subsidy_covers_returns_422(self, client, mock_auth, auth_headers):
        body = {**VALID_BODY, "subsidy_covers": "everything"}
        r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 422
        assert "subsidy_covers" in r.get_json()["error"]

    @pytest.mark.parametrize("valid_subsidy", [
        "flights", "accommodation", "full_expenses", "flat_stipend"
    ])
    def test_valid_subsidy_covers_accepted(self, client, mock_auth, auth_headers, valid_subsidy):
        body = {**VALID_BODY, "subsidy_covers": valid_subsidy, "subsidy_amount": 500}
        user = make_mock_user()
        mock_db = _make_db(user)
        cm = make_session_cm(mock_db)
        mock_t = make_mock_tournament()
        with patch("backend.routes.tournaments.Session", return_value=cm):
            with patch("backend.routes.tournaments._to_home_currency", return_value={**body}):
                with patch("backend.routes.tournaments.Tournament", return_value=mock_t):
                    with patch("backend.routes.tournaments._with_pnl", return_value={}):
                        r = client.post("/api/tournaments", data=json.dumps(body),
                                        headers=auth_headers)
        # Should not return 422 for subsidy_covers
        assert r.status_code != 422 or "subsidy_covers" not in (r.get_json() or {}).get("error", "")


# ---------------------------------------------------------------------------
# Profile guard (user must exist before creating tournament)
# ---------------------------------------------------------------------------

class TestCreateTournamentProfileGuard:
    def test_no_profile_returns_409(self, client, mock_auth, auth_headers):
        mock_db = _make_db(user=None)
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.post("/api/tournaments", data=json.dumps(VALID_BODY), headers=auth_headers)
        assert r.status_code == 409
        assert "profile" in r.get_json()["error"].lower()


# ---------------------------------------------------------------------------
# FX failure (critical bug: was an unhandled 500)
# ---------------------------------------------------------------------------

class TestCreateTournamentFxFailure:
    def test_fx_api_down_returns_503(self, client, mock_auth, auth_headers):
        user = make_mock_user(home_currency="GBP")
        mock_db = _make_db(user)
        cm = make_session_cm(mock_db)
        # Force FX failure by patching _to_home_currency
        with patch("backend.routes.tournaments.Session", return_value=cm):
            with patch("backend.routes.tournaments._to_home_currency",
                       side_effect=RuntimeError("OPEN_EXCHANGE_RATES_KEY is not set")):
                # Currency != home_currency so conversion path is hit
                body = {**VALID_BODY, "currency": "EUR"}
                r = client.post("/api/tournaments", data=json.dumps(body), headers=auth_headers)
        assert r.status_code == 503
        assert "currency conversion" in r.get_json()["error"].lower()


# ---------------------------------------------------------------------------
# PATCH /api/tournaments/<id>
# ---------------------------------------------------------------------------

class TestUpdateTournament:
    def test_update_negative_money_returns_422(self, client, mock_auth, auth_headers):
        r = client.patch(
            "/api/tournaments/some-id",
            data=json.dumps({"entry_fee": -50}),
            headers=auth_headers,
        )
        assert r.status_code == 422

    def test_update_invalid_prize_tax_rate_returns_422(
        self,
        client,
        mock_auth,
        auth_headers,
    ):
        r = client.patch(
            "/api/tournaments/some-id",
            data=json.dumps({"prize_tax_rate": 101}),
            headers=auth_headers,
        )
        assert r.status_code == 422
        assert "prize_tax_rate" in r.get_json()["error"]

    def test_update_invalid_date_returns_422(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = USER_ID
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_t
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.patch(
                f"/api/tournaments/{mock_t.id}",
                data=json.dumps({"entry_fee": 100, "start_date": "bad-date"}),
                headers=auth_headers,
            )
        assert r.status_code == 422
        assert "start_date" in r.get_json()["error"]

    def test_update_not_found_returns_404(self, client, mock_auth, auth_headers):
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.patch(
                "/api/tournaments/nonexistent",
                data=json.dumps({"entry_fee": 100}),
                headers=auth_headers,
            )
        assert r.status_code == 404

    def test_update_persists_prize_tax_rate(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = USER_ID
        user = make_mock_user()
        mock_db = MagicMock()
        tournament_q = MagicMock()
        tournament_q.filter_by.return_value.first.return_value = mock_t
        user_q = MagicMock()
        user_q.filter_by.return_value.first.return_value = user

        def _query(model):
            if model is Tournament:
                return tournament_q
            if model is User:
                return user_q
            return MagicMock()

        mock_db.query.side_effect = _query
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            with patch("backend.routes.tournaments._with_pnl", return_value={}):
                r = client.patch(
                    f"/api/tournaments/{mock_t.id}",
                    data=json.dumps({"prize_tax_rate": "25"}),
                    headers=auth_headers,
                )

        assert r.status_code == 200
        assert mock_t.prize_tax_rate == 25.0
        mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# DELETE /api/tournaments/<id>
# ---------------------------------------------------------------------------

class TestDeleteTournament:
    def test_delete_not_found_returns_404(self, client, mock_auth, auth_headers):
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.delete("/api/tournaments/nonexistent", headers=auth_headers)
        assert r.status_code == 404

    def test_delete_wrong_user_returns_404(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = "other-user"
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_t
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.delete("/api/tournaments/some-id", headers=auth_headers)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/tournaments (list)
# ---------------------------------------------------------------------------

class TestListTournaments:
    def test_returns_list(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.to_dict.return_value = {
            **mock_t.to_dict(),
            "prize_rounds": {"r1": 500, "w": 10000},
        }
        user = make_mock_user()

        mock_db = MagicMock()
        user_q = MagicMock()
        user_q.filter_by.return_value.first.return_value = user
        t_q = MagicMock()
        t_q.filter_by.return_value.order_by.return_value.all.return_value = [mock_t]

        def _query(model):
            if model is User:
                return user_q
            if model is Tournament:
                return t_q
            return MagicMock()

        mock_db.query.side_effect = _query
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.get("/api/tournaments", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_no_auth_returns_401(self, client):
        r = client.get("/api/tournaments")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/tournaments/<id>
# ---------------------------------------------------------------------------

class TestGetTournament:
    def test_returns_tournament_with_pnl(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = USER_ID
        user = make_mock_user()

        mock_db = MagicMock()
        t_q = MagicMock()
        t_q.filter_by.return_value.first.return_value = mock_t
        user_q = MagicMock()
        user_q.filter_by.return_value.first.return_value = user

        def _query(model):
            if model is Tournament:
                return t_q
            if model is User:
                return user_q
            return MagicMock()

        mock_db.query.side_effect = _query
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.get(f"/api/tournaments/{mock_t.id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.get_json()
        assert "pnl" in data

    def test_not_found_returns_404(self, client, mock_auth, auth_headers):
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = None
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.get("/api/tournaments/nonexistent", headers=auth_headers)
        assert r.status_code == 404

    def test_wrong_user_returns_404(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = "someone-else"
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_t
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.get("/api/tournaments/some-id", headers=auth_headers)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# DELETE success path
# ---------------------------------------------------------------------------

class TestDeleteSuccess:
    def test_delete_returns_success(self, client, mock_auth, auth_headers):
        mock_t = make_mock_tournament()
        mock_t.user_id = USER_ID
        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = mock_t
        cm = make_session_cm(mock_db)
        with patch("backend.routes.tournaments.Session", return_value=cm):
            r = client.delete(f"/api/tournaments/{mock_t.id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.get_json()["success"] is True


# ---------------------------------------------------------------------------
# PnL preview endpoint
# ---------------------------------------------------------------------------

class TestPnlPreview:
    def test_preview_rejects_negative_entry_fee(self, client, mock_auth, auth_headers):
        r = client.post(
            "/api/tournaments/pnl-preview",
            data=json.dumps({"entry_fee": -1, "prize_rounds": {"w": 10000}}),
            headers=auth_headers,
        )
        assert r.status_code == 422

    def test_preview_returns_scenarios(self, client, mock_auth, auth_headers):
        r = client.post(
            "/api/tournaments/pnl-preview",
            data=json.dumps({"prize_rounds": {"r1": 500, "w": 10000}, "entry_fee": 200}),
            headers=auth_headers,
        )
        assert r.status_code == 200
        data = r.get_json()
        assert "scenarios" in data
        assert len(data["scenarios"]) == 3

    def test_preview_applies_prize_tax_rate(self, client, mock_auth, auth_headers):
        r = client.post(
            "/api/tournaments/pnl-preview",
            data=json.dumps({
                "prize_rounds": {"w": 10000},
                "prize_tax_rate": 30,
            }),
            headers=auth_headers,
        )

        assert r.status_code == 200
        scenario = r.get_json()["scenarios"][0]
        assert scenario["prize_money"] == 10000
        assert scenario["prize_money_after_tax"] == 7000

    def test_preview_rejects_invalid_prize_tax_rate(
        self,
        client,
        mock_auth,
        auth_headers,
    ):
        r = client.post(
            "/api/tournaments/pnl-preview",
            data=json.dumps({
                "prize_rounds": {"w": 10000},
                "prize_tax_rate": 101,
            }),
            headers=auth_headers,
        )

        assert r.status_code == 422
        assert "prize_tax_rate" in r.get_json()["error"]
