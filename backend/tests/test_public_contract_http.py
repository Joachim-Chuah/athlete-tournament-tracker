"""HTTP characterization tests for the public Flask API surface."""

import pytest


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
