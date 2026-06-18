from ..extensions import db


class ImportError(db.Model):
    __tablename__ = "import_errors"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("import_batches.id"), nullable=False, index=True)
    row_number = db.Column(db.Integer, nullable=False)
    field = db.Column(db.String(32))
    error_message = db.Column(db.String(256))
