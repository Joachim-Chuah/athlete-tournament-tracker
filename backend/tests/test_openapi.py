import json

from backend.api_schemas import KnownTournament
from backend.openapi import OUTPUT_PATH, generate_openapi, rendered_openapi


def _flask_path_to_openapi(path: str) -> str:
    return path.replace("<id>", "{id}")


def test_checked_in_openapi_is_current():
    assert OUTPUT_PATH.read_text() == rendered_openapi()


def test_openapi_generation_is_deterministic():
    assert rendered_openapi() == rendered_openapi()


def test_openapi_matches_registered_v1_operations(app):
    contract = generate_openapi()
    documented = {
        (method.upper(), path)
        for path, path_item in contract["paths"].items()
        if path.startswith("/api/v1/")
        for method in path_item
        if method in {"get", "post", "patch", "delete"}
    }
    registered = {
        (method, _flask_path_to_openapi(rule.rule))
        for rule in app.url_map.iter_rules()
        if rule.rule.startswith("/api/v1/")
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }

    assert documented == registered


def test_contract_contains_required_components_and_security():
    contract = json.loads(rendered_openapi())
    schemas = contract["components"]["schemas"]

    assert "/api/v1/tournaments" in contract["paths"]
    assert contract["paths"]["/health"]["get"]["security"] == []
    assert {"Profile", "Tournament", "PnlScenario", "KnownTournament", "Fx", "DeleteResult"} <= set(schemas)
    assert contract["components"]["securitySchemes"]["bearerAuth"]["scheme"] == "bearer"


def test_contract_marks_top_level_requests_and_responses_additive():
    schemas = generate_openapi()["components"]["schemas"]
    user_id = schemas["TournamentInput"]["properties"]["user_id"]

    assert schemas["TournamentInput"]["additionalProperties"] is True
    assert schemas["ProfileRequest"]["additionalProperties"] is True
    assert schemas["PrizeRoundsInput"]["additionalProperties"] is False
    assert schemas["TournamentWithPnl"]["additionalProperties"] is True
    assert schemas["PnlResult"]["additionalProperties"] is True
    assert user_id["deprecated"] is True
    assert "authenticated bearer token" in user_id["description"]


def test_known_tournament_schema_requires_equal_alias_fields_from_route_data():
    data = {
        "id": "psa-1",
        "name": "Test Open",
        "sport": "squash",
        "tier": "Silver",
        "tour_level": "World Tour",
        "location": "London",
        "country": "UK",
        "currency": "USD",
        "typical_month": 5,
        "duration_days": 7,
        "prize_total": 50_000,
        "estimated_prize_total": 50_000,
        "prize_rounds": {"r1": 2_000, "w": 22_000},
        "start_date": "2026-05-01",
        "end_date": "2026-05-07",
    }

    parsed = KnownTournament.model_validate(data)
    assert parsed.estimated_prize_total == parsed.prize_total
