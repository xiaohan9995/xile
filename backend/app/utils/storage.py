import os


class StorageNotConfiguredError(RuntimeError):
    pass


def _cos_settings():
    return {
        "bucket": os.getenv("COS_BUCKET"),
        "region": os.getenv("COS_REGION"),
        "secret_id": os.getenv("COS_SECRET_ID"),
        "secret_key": os.getenv("COS_SECRET_KEY"),
    }


def cos_is_configured():
    settings = _cos_settings()
    return all(settings.values())


def object_url(file_key):
    settings = _cos_settings()
    if not settings["bucket"] or not settings["region"]:
        raise StorageNotConfiguredError("对象存储未配置")
    return f"https://{settings['bucket']}.cos.{settings['region']}.myqcloud.com/{file_key}"


def upload_to_cos(file_stream, file_key, content_type=None):
    """Store an uploaded object in COS and return its public delivery URL."""
    settings = _cos_settings()
    if not all(settings.values()):
        raise StorageNotConfiguredError("对象存储未配置，请设置 COS_BUCKET、COS_REGION、COS_SECRET_ID 和 COS_SECRET_KEY")

    from qcloud_cos import CosConfig, CosS3Client

    client = CosS3Client(CosConfig(
        Region=settings["region"],
        SecretId=settings["secret_id"],
        SecretKey=settings["secret_key"],
    ))
    client.put_object(
        Bucket=settings["bucket"],
        Body=file_stream,
        Key=file_key,
        ContentType=content_type or "application/octet-stream",
    )
    return object_url(file_key)


def file_url(file_key):
    """Convert a file_key to an accessible URL based on storage mode (COS or local)."""
    if not file_key:
        return None
    if file_key.startswith(("https://", "http://", "/uploads/", "/static/")):
        return file_key
    settings = _cos_settings()
    if settings["bucket"] and settings["region"]:
        return object_url(file_key)
    filename = file_key.split("/")[-1] if "/" in file_key else file_key
    if file_key.startswith("reviews/"):
        return f"/uploads/reviews/{filename}"
    if file_key.startswith("avatars/"):
        return f"/uploads/avatars/{filename}"
    return f"/uploads/{file_key}"
