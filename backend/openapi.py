"""Deterministically generate and check the checked-in OpenAPI v1 contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from backend.api_schemas import (
    DeleteResult,
    ErrorResponse,
    Fx,
    Health,
    KnownTournament,
    PnlResult,
    PnlScenario,
    PrizeRounds,
    PrizeRoundsInput,
    Profile,
    ProfileRequest,
    Tournament,
    TournamentCreate,
    TournamentInput,
    TournamentWithPnl,
)


OUTPUT_PATH = Path(__file__).with_name("openapi.json")
MODELS: tuple[type[BaseModel], ...] = (
    ErrorResponse,
    Health,
    ProfileRequest,
    Profile,
    PrizeRounds,
    PrizeRoundsInput,
    PnlScenario,
    PnlResult,
    TournamentInput,
    TournamentCreate,
    Tournament,
    TournamentWithPnl,
    KnownTournament,
    Fx,
    DeleteResult,
)


def _schema_ref(model: type[BaseModel]) -> dict[str, str]:
    return {"$ref": f"#/components/schemas/{model.__name__}"}


def _json_response(model: type[BaseModel], *, array: bool = False) -> dict[str, Any]:
    schema: dict[str, Any] = _schema_ref(model)
    if array:
        schema = {"type": "array", "items": schema}
    return {
        "description": "Success",
        "content": {"application/json": {"schema": schema}},
    }


def _error_response(description: str) -> dict[str, Any]:
    return {
        "description": description,
        "content": {"application/json": {"schema": _schema_ref(ErrorResponse)}},
    }


def _request_body(model: type[BaseModel]) -> dict[str, Any]:
    return {
        "required": True,
        "content": {"application/json": {"schema": _schema_ref(model)}},
    }


def _protected_responses(*status_codes: int) -> dict[str, Any]:
    descriptions = {
        400: "Invalid query parameters",
        401: "Missing or invalid bearer token",
        404: "Resource not found or not owned by the caller",
        409: "Profile setup required",
        422: "Invalid request body",
        503: "Upstream service unavailable",
    }
    responses = {"401": _error_response(descriptions[401])}
    for status in status_codes:
        responses[str(status)] = _error_response(descriptions[status])
    return responses


def _component_schemas() -> dict[str, Any]:
    components: dict[str, Any] = {}
    for model in MODELS:
        schema = model.model_json_schema(
            by_alias=True,
            ref_template="#/components/schemas/{model}",
        )
        definitions = schema.pop("$defs", {})
        components.update(definitions)
        components[model.__name__] = schema
    return components


def generate_openapi() -> dict[str, Any]:
    tournament_id = {
        "name": "id",
        "in": "path",
        "required": True,
        "schema": {"type": "string"},
    }
    paths = {
        "/health": {
            "get": {
                "operationId": "health",
                "security": [],
                "responses": {"200": _json_response(Health)},
            }
        },
        "/api/v1/profile": {
            "get": {
                "operationId": "getProfile",
                "responses": {
                    "200": {
                        "description": "Profile or null before setup",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "oneOf": [_schema_ref(Profile), {"type": "null"}]
                                }
                            }
                        },
                    },
                    **_protected_responses(503),
                },
            },
            "post": {
                "operationId": "saveProfile",
                "requestBody": _request_body(ProfileRequest),
                "responses": {
                    "201": _json_response(Profile),
                    **_protected_responses(422, 503),
                },
            },
        },
        "/api/v1/tournaments": {
            "get": {
                "operationId": "listTournaments",
                "responses": {
                    "200": _json_response(TournamentWithPnl, array=True),
                    **_protected_responses(503),
                },
            },
            "post": {
                "operationId": "createTournament",
                "requestBody": _request_body(TournamentCreate),
                "responses": {
                    "201": _json_response(TournamentWithPnl),
                    **_protected_responses(409, 422, 503),
                },
            },
        },
        "/api/v1/tournaments/search": {
            "get": {
                "operationId": "searchKnownTournaments",
                "parameters": [
                    {"name": "q", "in": "query", "schema": {"type": "string"}},
                    {"name": "sport", "in": "query", "schema": {"type": "string"}},
                ],
                "responses": {
                    "200": _json_response(KnownTournament, array=True),
                    **_protected_responses(503),
                },
            }
        },
        "/api/v1/tournaments/pnl-preview": {
            "post": {
                "operationId": "previewTournamentPnl",
                "requestBody": _request_body(TournamentInput),
                "responses": {
                    "200": _json_response(PnlResult),
                    **_protected_responses(422, 503),
                },
            }
        },
        "/api/v1/tournaments/{id}": {
            "parameters": [tournament_id],
            "get": {
                "operationId": "getTournament",
                "responses": {
                    "200": _json_response(TournamentWithPnl),
                    **_protected_responses(404, 503),
                },
            },
            "patch": {
                "operationId": "updateTournament",
                "requestBody": _request_body(TournamentInput),
                "responses": {
                    "200": _json_response(TournamentWithPnl),
                    **_protected_responses(404, 422, 503),
                },
            },
            "delete": {
                "operationId": "deleteTournament",
                "responses": {
                    "200": _json_response(DeleteResult),
                    **_protected_responses(404, 503),
                },
            },
        },
        "/api/v1/fx": {
            "get": {
                "operationId": "convertCurrency",
                "parameters": [
                    {
                        "name": "from",
                        "in": "query",
                        "required": True,
                        "schema": {"type": "string", "minLength": 3, "maxLength": 3},
                    },
                    {
                        "name": "to",
                        "in": "query",
                        "required": True,
                        "schema": {"type": "string", "minLength": 3, "maxLength": 3},
                    },
                    {"name": "amount", "in": "query", "schema": {"type": "number", "default": 1}},
                ],
                "responses": {
                    "200": _json_response(Fx),
                    **_protected_responses(400, 503),
                },
            }
        },
    }
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "Athlete Tournament Tracker API",
            "version": "1.0.0",
            "description": "Versioned contract for web and mobile consumers.",
        },
        "security": [{"bearerAuth": []}],
        "paths": paths,
        "components": {
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "Supabase JWT",
                }
            },
            "schemas": _component_schemas(),
        },
    }


def rendered_openapi() -> str:
    return json.dumps(generate_openapi(), indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write backend/openapi.json")
    mode.add_argument("--check", action="store_true", help="fail if backend/openapi.json is stale")
    args = parser.parse_args()

    rendered = rendered_openapi()
    if args.write:
        OUTPUT_PATH.write_text(rendered)
        return 0

    if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text() != rendered:
        print("backend/openapi.json is stale; run: .venv/bin/python -m backend.openapi --write")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
