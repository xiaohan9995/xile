import os


def file_url(file_key):
    """Convert a file_key to an accessible URL based on storage mode (COS or local)."""
    if not file_key:
        return None
    cos_bucket = os.getenv("COS_BUCKET")
    cos_region = os.getenv("COS_REGION")
    if cos_bucket and cos_region:
        return f"https://{cos_bucket}.cos.{cos_region}.myqcloud.com/{file_key}"
    filename = file_key.split("/")[-1] if "/" in file_key else file_key
    if file_key.startswith("reviews/"):
        return f"/uploads/reviews/{filename}"
    if file_key.startswith("avatars/"):
        return f"/uploads/avatars/{filename}"
    return f"/uploads/{file_key}"
