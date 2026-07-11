"""HTTP characterization tests for the public Flask API surface."""

from unittest.mock import MagicMock, patch

import pytest

from backend.api_schemas import (
    PnlResult,
    TournamentCreate,
    TournamentInput,
    TournamentWithPnl,
)
from backend.models import User, Tournament
from backend.tests.conftest import (
    USER_ID,
    make_mock_tournament,
    make_mock_user,
    make_session_cm,
)


LEGACY_OPERATIONS = {
    ("GET", "/api/profile"),
    ("POST", "/api/profile"),
    ("GET", "/api/tournaments"),
    ("POST", "/api/tournaments"),
    ("GET", "/api/tournaments/search"),
    ("POST", "/api/tournaments/pnl-preview"),
    ("GET", "/api/tournaments/<id>"),
    ("PATCH", "/api/tournaments/<id>"),
    ("DELETE", "/api/tournaments/<id>"),
    ("GET", "/api/fx"),
}
V1_OPERATIONS = {
    (method, path.replace("/api/", "/api/v1/", 1))
    for method, path in LEGACY_OPERATIONS
}


def test_health_is_public_and_stable(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_legacy_and_v1_route_inventories_are_complete(app):
    operations = {
        (method, rule.rule)
        for rule in app.url_map.iter_rules()
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }

    assert LEGACY_OPERATIONS | V1_OPERATIONS <= operations


@pytest.mark.parametrize("prefix", ["/api", "/api/v1"])
@pytest.mark.parametrize(
    ("method", "suffix"),
    [
        ("get", "/profile"),
        ("post", "/profile"),
        ("get", "/tournaments"),
        ("post", "/tournaments"),
        ("get", "/tournaments/search"),
        ("post", "/tournaments/pnl-preview"),
        ("get", "/tournaments/example"),
        ("patch", "/tournaments/example"),
        ("delete", "/tournaments/example"),
        ("get", "/fx"),
    ],
)
def test_protected_operations_share_auth_error_contract(client, prefix, method, suffix):
    response = getattr(client, method)(f"{prefix}{suffix}")

    assert response.status_code == 401
    assert response.get_json() == {"error": "missing token"}


@pytest.mark.parametrize("prefix", ["/api", "/api/v1"])
def test_pnl_preview_success_shape_is_equivalent(
    client, mock_auth, auth_headers, prefix
):
    response = client.post(
        f"{prefix}/tournaments/pnl-preview",
        json={"entry_fee": 100, "prize_rounds": {"r1": 50, "w": 500}},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert set(response.get_json()) == {
        "break_even_round",
        "scenarios",
        "total_expenses",
        "total_income_base",
    }
    PnlResult.model_validate({**response.get_json(), "future_metric": 1})


@pytest.mark.parametrize("prefix", ["/api", "/api/v1"])
def test_create_contract_ignores_compatibility_user_id_and_validates_response(
    client, mock_auth, auth_headers, prefix
):
    body = {
        "user_id": "client-supplied-user",
        "name": "British Open",
        "location": "Birmingham",
        "country": "UK",
        "currency": "USD",
        "start_date": "2026-05-01",
        "end_date": "2026-05-07",
        "duration_days": 7,
        "entry_fee": 250,
        "prize_rounds": {"r1": 500, "w": 25_000},
    }
    request_contract = TournamentCreate.model_validate(body)
    user = make_mock_user()
    tournament = make_mock_tournament(prize_rounds=body["prize_rounds"])
    mock_db = MagicMock()
    mock_db.query.return_value.filter_by.return_value.first.return_value = user

    with patch(
        "backend.routes.tournaments.Session",
        return_value=make_session_cm(mock_db),
    ), patch(
        "backend.routes.tournaments.Tournament", return_value=tournament
    ) as tournament_model:
        response = client.post(
            f"{prefix}/tournaments", json=body, headers=auth_headers
        )

    assert request_contract.model_dump()["user_id"] == "client-supplied-user"
    assert response.status_code == 201
    assert tournament_model.call_args.kwargs["user_id"] == USER_ID
    assert tournament_model.call_args.kwargs["user_id"] != body["user_id"]

    response_body = response.get_json()
    response_body["future_additive_field"] = {"enabled": True}
    response_body["pnl"]["future_additive_metric"] = 1
    parsed = TournamentWithPnl.model_validate(response_body)
    assert parsed.user_id == USER_ID


@pytest.mark.parametrize("prefix", ["/api", "/api/v1"])
def test_update_contract_ignores_compatibility_user_id_and_validates_response(
    client, mock_auth, auth_headers, prefix
):
    body = {"user_id": "client-supplied-user", "entry_fee": 300}
    request_contract = TournamentInput.model_validate(body)
    tournament = make_mock_tournament()
    user = make_mock_user()
    mock_db = MagicMock()
    tournament_query = MagicMock()
    tournament_query.filter_by.return_value.first.return_value = tournament
    user_query = MagicMock()
    user_query.filter_by.return_value.first.return_value = user

    def query(model):
        if model is Tournament:
            return tournament_query
        if model is User:
            return user_query
        return MagicMock()

    mock_db.query.side_effect = query
    with patch(
        "backend.routes.tournaments.Session",
        return_value=make_session_cm(mock_db),
    ):
        response = client.patch(
            f"{prefix}/tournaments/{tournament.id}",
            json=body,
            headers=auth_headers,
        )

    assert request_contract.model_dump()["user_id"] == "client-supplied-user"
    assert response.status_code == 200
    assert tournament.user_id == USER_ID
    parsed = TournamentWithPnl.model_validate(response.get_json())
    assert parsed.user_id == USER_ID
