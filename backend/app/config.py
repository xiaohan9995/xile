import os
from datetime import timedelta


class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("MYSQL_DATABASE_URI", "sqlite:///xile.db")
    ADMIN_DEV_TOKEN = os.getenv("ADMIN_DEV_TOKEN")


class DevelopmentConfig(Config):
    DEBUG = True
    ADMIN_DEV_TOKEN = os.getenv("ADMIN_DEV_TOKEN", "dev-admin-token")


class ProductionConfig(Config):
    DEBUG = False
    ADMIN_DEV_TOKEN = None  # Force-disabled in production

    def __init__(self):
        super().__init__()
        missing = []
        if self.SECRET_KEY == "dev-secret":
            missing.append("SECRET_KEY")
        if self.JWT_SECRET_KEY == "dev-jwt-secret":
            missing.append("JWT_SECRET_KEY")
        if len(self.JWT_SECRET_KEY or "") < 32:
            missing.append("JWT_SECRET_KEY (min 32 bytes)")
        if "sqlite" in (self.SQLALCHEMY_DATABASE_URI or ""):
            missing.append("MYSQL_DATABASE_URI")
        if missing:
            raise RuntimeError(
                f"Production config error: missing or insecure env vars: {', '.join(missing)}"
            )


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    RATELIMIT_ENABLED = False


_config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    env = os.getenv("FLASK_ENV", "development").lower()
    config_class = _config_map.get(env, DevelopmentConfig)
    return config_class()
