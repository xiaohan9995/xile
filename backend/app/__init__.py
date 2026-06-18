import os

from flask import Flask

from .extensions import db, jwt, migrate


def create_app(config=None):
    app = Flask(__name__)

    # --- config ---
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "MYSQL_DATABASE_URI",
        "sqlite:///xile.db",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")

    if config:
        app.config.update(config)

    # --- extensions ---
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # --- blueprints ---
    from .api.mp import mp_bp as mp_api
    from .api.admin import admin_bp as admin_api

    app.register_blueprint(mp_api, url_prefix="/api/mp")
    app.register_blueprint(admin_api, url_prefix="/api/admin")

    # --- health ---
    @app.route("/api/health")
    def health():
        return {"service": "xile-yoga-certification", "status": "ok"}

    if app.config.get("SEED_DEMO_DATA"):
        from .seed import seed_demo_data

        with app.app_context():
            db.create_all()
            seed_demo_data()

    return app
