import os
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

from backend.routes import profile, tournaments, fx, search
from backend.utils.auth import verify_token, AuthError

# Paths reachable without a valid token.
PUBLIC_PATHS = {"/health"}


def create_app() -> Flask:
    app = Flask(__name__)

    allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    CORS(app, origins=allowed_origins)

    @app.before_request
    def authenticate():
        # CORS preflight carries no Authorization header — let flask-cors answer it.
        if request.method == "OPTIONS":
            return None
        if request.path in PUBLIC_PATHS:
            return None

        header = request.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else None
        try:
            identity = verify_token(token)
        except AuthError as e:
            return jsonify({"error": e.message}), e.status

        g.user_id = identity["user_id"]
        g.email = identity["email"]
        return None

    blueprints = (
        ("profile", profile.bp),
        ("tournaments", tournaments.bp),
        ("fx", fx.bp),
        ("search", search.bp),
    )
    for name, blueprint in blueprints:
        app.register_blueprint(blueprint, url_prefix="/api", name=f"{name}_legacy")
        app.register_blueprint(blueprint, url_prefix="/api/v1", name=f"{name}_v1")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(port=port, debug=True)
