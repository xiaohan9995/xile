from ..extensions import db


class SystemConfig(db.Model):
    __tablename__ = "system_configs"

    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=False, default="")
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
