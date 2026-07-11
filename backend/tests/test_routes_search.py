"""
Tests for backend/routes/search.py — pure helper functions and HTTP endpoint.
"""

from unittest.mock import MagicMock, patch

import pytest

from backend.routes.search import (
    _actual_draw_size,
    _base_name,
    _dedupe_key,
    _estimate_prize_rounds,
    _psa_raw_to_results,
    _search_psa_live,
)
from backend.tests.conftest import make_session_cm


# ---------------------------------------------------------------------------
# _base_name — strips gender suffix for deduplication
# ---------------------------------------------------------------------------

class TestBaseName:
    def test_strips_men_suffix(self):
        assert _base_name("World Open (Men)") == "world open"

    def test_strips_women_suffix(self):
        assert _base_name("British Open (Women)") == "british open"

    def test_strips_open_suffix(self):
        assert _base_name("US Open (Open)") == "us open"

    def test_strips_mixed_suffix(self):
        assert _base_name("Grand Prix (Mixed)") == "grand prix"

    def test_lowercases_result(self):
        assert _base_name("World Open") == "world open"

    def test_no_suffix_still_lowercased(self):
        assert _base_name("World Open") == "world open"


# ---------------------------------------------------------------------------
# _dedupe_key
# ---------------------------------------------------------------------------

class TestDedupeKey:
    def test_includes_base_name_and_start_date(self):
        result = {"name": "World Open (Men)", "start_date": "2026-03-01"}
        key = _dedupe_key(result)
        assert "world open" in key
        assert "2026-03-01" in key

    def test_men_and_women_same_tournament_produce_same_key(self):
        men = {"name": "British Open (Men)", "start_date": "2026-05-01"}
        women = {"name": "British Open (Women)", "start_date": "2026-05-01"}
        assert _dedupe_key(men) == _dedupe_key(women)

    def test_different_dates_produce_different_keys(self):
        a = {"name": "British Open (Men)", "start_date": "2026-05-01"}
        b = {"name": "British Open (Men)", "start_date": "2026-06-01"}
        assert _dedupe_key(a) != _dedupe_key(b)

    def test_missing_start_date_does_not_raise(self):
        result = {"name": "World Open (Men)"}
        key = _dedupe_key(result)
        assert isinstance(key, str)


# ---------------------------------------------------------------------------
# _actual_draw_size
# ---------------------------------------------------------------------------

class TestActualDrawSize:
    def test_returns_16_for_no_draws(self):
        assert _actual_draw_size({}) == 16

    def test_returns_16_for_empty_draws(self):
        assert _actual_draw_size({"draws": []}) == 16

    def test_uses_player_count_when_available(self):
        comp = {"draws": [{"players": ["a", "b", "c", "d"]}]}
        assert _actual_draw_size(comp) == 4

    def test_falls_back_to_capacity_when_no_players(self):
        comp = {"draws": [{"size": 64}]}
        assert _actual_draw_size(comp) == 32  # capped at 32

    def test_caps_capacity_at_32(self):
        comp = {"draws": [{"size": 128}]}
        assert _actual_draw_size(comp) == 32

    def test_small_capacity_below_cap_passes_through(self):
        comp = {"draws": [{"size": 16}]}
        assert _actual_draw_size(comp) == 16


# ---------------------------------------------------------------------------
# _estimate_prize_rounds
# ---------------------------------------------------------------------------

class TestEstimatePrizeRounds:
    def test_zero_prize_returns_empty(self):
        assert _estimate_prize_rounds(0, 32, "Gold") == {}

    def test_none_prize_returns_empty(self):
        assert _estimate_prize_rounds(None, 32, "Gold") == {}

    def test_negative_prize_returns_empty(self):
        assert _estimate_prize_rounds(-100, 32, "Gold") == {}

    def test_platinum_tier_includes_r1(self):
        rounds = _estimate_prize_rounds(100_000, 64, "Platinum")
        assert "r1" in rounds

    def test_gold_tier_includes_r1_and_r2(self):
        rounds = _estimate_prize_rounds(100_000, 32, "Gold")
        assert "r1" in rounds
        assert "r2" in rounds

    def test_silver_tier_structure(self):
        rounds = _estimate_prize_rounds(50_000, 16, "Silver")
        assert "r1" in rounds
        assert "w" in rounds

    def test_bronze_tier_starts_from_qf(self):
        rounds = _estimate_prize_rounds(20_000, 8, "Bronze")
        assert "r1" not in rounds
        assert "qf" in rounds

    def test_winner_gets_largest_share(self):
        rounds = _estimate_prize_rounds(100_000, 32, "Gold")
        assert rounds["w"] == max(rounds.values())

    def test_prize_amounts_sum_below_total(self):
        # Percentages don't necessarily sum to 100% — check they're reasonable
        rounds = _estimate_prize_rounds(100_000, 64, "Platinum")
        assert sum(rounds.values()) < 100_000  # individual rounds, not full pot


# ---------------------------------------------------------------------------
# _psa_raw_to_results — parses a raw PSA API tournament record
# ---------------------------------------------------------------------------

RAW_TOURNAMENT = {
    "id": 9999,
    "title": {"rendered": "Test Open"},
    "meta": {
        "location": "London, UK",
        "start_date": "20260501",
        "end_date": "20260507",
        "competitions": [
            {"competition_id": 1, "name": "Men", "level_id": 108, "prize_total": 50000,
             "draws": [{"size": 32, "players": ["p"] * 16}]}
        ],
    },
}


class TestPsaRawToResults:
    def test_returns_list(self):
        results = _psa_raw_to_results(RAW_TOURNAMENT)
        assert isinstance(results, list)

    def test_parses_one_competition(self):
        results = _psa_raw_to_results(RAW_TOURNAMENT)
        assert len(results) == 1

    def test_result_has_expected_fields(self):
        r = _psa_raw_to_results(RAW_TOURNAMENT)[0]
        assert r["name"] == "Test Open (Men)"
        assert r["country"] == "UK"
        assert r["location"] == "London"
        assert r["prize_total"] == 50_000
        assert r["estimated_prize_total"] == r["prize_total"]
        assert "prize_rounds" in r

    def test_result_start_and_end_dates(self):
        r = _psa_raw_to_results(RAW_TOURNAMENT)[0]
        assert r["start_date"] == "2026-05-01"
        assert r["end_date"] == "2026-05-07"

    def test_malformed_record_returns_empty_list(self):
        results = _psa_raw_to_results({"id": 1, "meta": None})
        assert results == []

    def test_empty_competitions_returns_empty_list(self):
        raw = {**RAW_TOURNAMENT, "meta": {**RAW_TOURNAMENT["meta"], "competitions": []}}
        assert _psa_raw_to_results(raw) == []

    def test_competitions_as_json_string(self):
        import json
        comp_str = json.dumps(RAW_TOURNAMENT["meta"]["competitions"])
        raw = {**RAW_TOURNAMENT, "meta": {**RAW_TOURNAMENT["meta"], "competitions": comp_str}}
        results = _psa_raw_to_results(raw)
        assert len(results) == 1


# ---------------------------------------------------------------------------
# _search_psa_live — returns empty list on failure (graceful degradation)
# ---------------------------------------------------------------------------

class TestSearchPsaLive:
    def test_returns_empty_on_http_error(self):
        import requests as req
        with patch("backend.routes.search.requests.get",
                   side_effect=req.exceptions.ConnectionError):
            result = _search_psa_live("world open")
        assert result == []

    def test_returns_empty_on_non_ok_response(self):
        mock_resp = MagicMock()
        mock_resp.ok = False
        with patch("backend.routes.search.requests.get", return_value=mock_resp):
            result = _search_psa_live("world open")
        assert result == []

    def test_filters_out_old_tournaments(self):
        mock_resp = MagicMock()
        mock_resp.ok = True
        # Return a tournament with a very old start date
        old_raw = {**RAW_TOURNAMENT, "meta": {**RAW_TOURNAMENT["meta"], "start_date": "20200101",
                                                "end_date": "20200107"}}
        mock_resp.json.return_value = [old_raw]
        with patch("backend.routes.search.requests.get", return_value=mock_resp):
            result = _search_psa_live("test")
        assert result == []


# ---------------------------------------------------------------------------
# HTTP endpoint — GET /api/tournaments/search
# ---------------------------------------------------------------------------

class TestSearchEndpoint:
    def test_no_auth_returns_401(self, client):
        r = client.get("/api/tournaments/search?q=world")
        assert r.status_code == 401

    def test_empty_query_returns_list(self, client, mock_auth, auth_headers):
        mock_db = MagicMock()
        query_chain = MagicMock()
        query_chain.filter.return_value = query_chain
        query_chain.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value = query_chain
        cm = make_session_cm(mock_db)
        with patch("backend.routes.search.Session", return_value=cm):
            r = client.get("/api/tournaments/search", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_db_error_still_returns_200(self, client, mock_auth, auth_headers):
        # When DB fails the route logs the error and falls through gracefully.
        # If PSA live search is also stubbed out, we get an empty list.
        with patch("backend.routes.search.Session", side_effect=Exception("db down")):
            with patch("backend.routes.search._search_psa_live", return_value=[]):
                r = client.get("/api/tournaments/search?q=open", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_sport_filter_passed_through(self, client, mock_auth, auth_headers):
        mock_db = MagicMock()
        query_chain = MagicMock()
        query_chain.filter.return_value = query_chain
        query_chain.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value = query_chain
        cm = make_session_cm(mock_db)
        with patch("backend.routes.search.Session", return_value=cm):
            with patch("backend.routes.search._search_psa_live", return_value=[]):
                r = client.get("/api/tournaments/search?q=open&sport=squash",
                               headers=auth_headers)
        assert r.status_code == 200

    def test_db_result_preserves_both_equal_prize_total_fields(
        self, client, mock_auth, auth_headers
    ):
        known = MagicMock()
        known.to_dict.return_value = {
            "id": "psa-1",
            "name": "Test Open",
            "prize_total": 50_000,
            "estimated_prize_total": 50_000,
            "start_date": "2026-05-01",
        }
        mock_db = MagicMock()
        query_chain = MagicMock()
        query_chain.filter.return_value = query_chain
        query_chain.order_by.return_value.limit.return_value.all.return_value = [known]
        mock_db.query.return_value = query_chain
        cm = make_session_cm(mock_db)

        with patch("backend.routes.search.Session", return_value=cm):
            response = client.get("/api/tournaments/search", headers=auth_headers)

        result = response.get_json()[0]
        assert result["estimated_prize_total"] == result["prize_total"]
