import os
import re

from flask import Flask, current_app, g, jsonify, request
from werkzeug.exceptions import HTTPException

from .config import get_config
from .extensions import db, jwt, migrate, limiter
from .logging import init_logging, init_request_id, RequestIdFilter


_SENSITIVE_ERROR_TEXT = re.compile(r"(?i)(password|secret|token|authorization)\s*([=:])\s*[^\s,;]+")


def _public_error_detail(error):
    """Return actionable diagnostics without disclosing credentials."""
    detail = str(error).strip() or error.__class__.__name__
    detail = _SENSITIVE_ERROR_TEXT.sub(r"\1\2[已隐藏]", detail)
    return detail[:300]


def create_app(config=None):
    app = Flask(__name__)

    # --- config ---
    app.config.from_object(get_config())
    if config:
        app.config.update(config)

    # --- logging & request-id ---
    if not app.config.get("TESTING"):
        init_logging(app)
        app.logger.addFilter(RequestIdFilter())
    init_request_id(app)

    # --- extensions ---
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # --- global error handlers ---
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error=str(e.description) if hasattr(e, "description") else "bad request", requestId=getattr(g, "request_id", None)), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="not found", requestId=getattr(g, "request_id", None)), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify(error="method not allowed", requestId=getattr(g, "request_id", None)), 405

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify(error="file too large", requestId=getattr(g, "request_id", None)), 413

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify(error="rate limit exceeded, please slow down", requestId=getattr(g, "request_id", None)), 429

    @app.errorhandler(Exception)
    def unhandled_exception(error):
        if isinstance(error, HTTPException):
            return error
        request_id = getattr(g, "request_id", "-")
        app.logger.exception(
            "Unhandled request exception method=%s path=%s requestId=%s",
            request.method,
            request.path,
            request_id,
        )
        return jsonify(
            error="请求处理失败",
            reason=_public_error_detail(error),
            requestId=request_id,
        ), 500

    # --- security response headers ---
    @app.after_request
    def set_security_headers(response):
        if response.status_code >= 400 and response.is_json:
            payload = response.get_json(silent=True)
            if isinstance(payload, dict) and "requestId" not in payload:
                payload["requestId"] = getattr(g, "request_id", None)
                response.set_data(current_app.json.dumps(payload))
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "0"
        if not app.debug:
            response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'"
        return response

    # --- blueprints ---
    from .api.mp import mp_bp as mp_api
    from .api.admin import admin_bp as admin_api

    app.register_blueprint(mp_api, url_prefix="/api/mp")
    app.register_blueprint(admin_api, url_prefix="/api/admin")

    # --- health check with DB ping ---
    @app.route("/api/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            db_status = "ok"
        except Exception as e:
            app.logger.error(f"Health check DB failure: {e}")
            return jsonify(service="xile-yoga-certification", status="degraded", db="unreachable"), 503
        return jsonify(service="xile-yoga-certification", status="ok", db=db_status)

    # --- authenticated file access (Nginx proxies /uploads/ here) ---
    import os
    from flask import send_from_directory
    from flask_jwt_extended import jwt_required as _jwt_required

    @app.route("/uploads/reviews/<path:filename>")
    @_jwt_required()
    def serve_review_file_root(filename):
        upload_dir = os.path.join(app.instance_path, "..", "uploads", "reviews")
        return send_from_directory(upload_dir, filename)

    # --- seed demo data (dev/test only) ---
    if app.config.get("SEED_DEMO_DATA"):
        from .seed import seed_demo_data

        with app.app_context():
            db.create_all()
            seed_demo_data()

    return app
