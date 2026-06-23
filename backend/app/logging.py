import logging
import uuid

from flask import g, request
from pythonjsonlogger import jsonlogger


def init_logging(app):
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={"asctime": "timestamp", "levelname": "level", "name": "logger"},
    )
    handler.setFormatter(formatter)

    app.logger.handlers = [handler]
    app.logger.setLevel(logging.INFO)

    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def init_request_id(app):
    @app.before_request
    def set_request_id():
        g.request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]

    @app.after_request
    def add_request_id_header(response):
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-Id"] = request_id
        return response


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = getattr(g, "request_id", "-")
        return True
