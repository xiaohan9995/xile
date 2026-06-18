from ..extensions import db


class ImportBatch(db.Model):
    __tablename__ = "import_batches"

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"), nullable=False)
    total_rows = db.Column(db.Integer, default=0)
    success_rows = db.Column(db.Integer, default=0)
    error_rows = db.Column(db.Integer, default=0)
    status = db.Column(db.String(16), default="preview")  # preview/committed/failed
    created_at = db.Column(db.DateTime, server_default=db.func.now())
