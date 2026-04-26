import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

from backend.routes import profile, tournaments, fx, search


def create_app() -> Flask:
    app = Flask(__name__)

    allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    CORS(app, origins=allowed_origins)

    app.register_blueprint(profile.bp)
    app.register_blueprint(tournaments.bp)
    app.register_blueprint(fx.bp)
    app.register_blueprint(search.bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(port=port, debug=True)
