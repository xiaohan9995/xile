import os
from urllib.parse import unquote, urlparse


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


def storage_reference(file_ref):
    """Return a stable COS object URL without temporary signature parameters."""
    if not file_ref:
        return None
    settings = _cos_settings()
    if settings["bucket"] and settings["region"]:
        key = _cos_key(file_ref, settings)
        if key:
            return object_url(key)
    return file_ref


def _cos_client(settings):
    from qcloud_cos import CosConfig, CosS3Client

    return CosS3Client(CosConfig(
        Region=settings["region"],
        SecretId=settings["secret_id"],
        SecretKey=settings["secret_key"],
    ))


def _cos_key(file_ref, settings):
    if not file_ref.startswith(("https://", "http://")):
        return file_ref
    parsed = urlparse(file_ref)
    expected_host = f"{settings['bucket']}.cos.{settings['region']}.myqcloud.com"
    if parsed.netloc != expected_host:
        return None
    return unquote(parsed.path.lstrip("/"))


def signed_object_url(file_ref, expires=3600):
    """Create a temporary GET URL for a private COS object."""
    settings = _cos_settings()
    if not all(settings.values()):
        raise StorageNotConfiguredError("对象存储未配置")
    key = _cos_key(file_ref, settings)
    if not key:
        return file_ref
    return _cos_client(settings).get_presigned_url(
        Method="GET", Bucket=settings["bucket"], Key=key, Expired=expires,
    )


def upload_to_cos(file_stream, file_key, content_type=None, public_read=False):
    """Store an object in COS and return its delivery URL.

    Public-read ACLs are opt-in because certificates and review materials may
    contain sensitive information.
    """
    settings = _cos_settings()
    if not all(settings.values()):
        raise StorageNotConfiguredError("对象存储未配置，请设置 COS_BUCKET、COS_REGION、COS_SECRET_ID 和 COS_SECRET_KEY")

    client = _cos_client(settings)
    put_options = {
        "Bucket": settings["bucket"],
        "Body": file_stream,
        "Key": file_key,
        "ContentType": content_type or "application/octet-stream",
    }
    if public_read:
        put_options["ACL"] = "public-read"
    client.put_object(
        **put_options,
    )
    return object_url(file_key)


def file_url(file_key):
    """Convert a file_key to an accessible URL based on storage mode (COS or local)."""
    if not file_key:
        return None
    if file_key.startswith(("/uploads/", "/static/")):
        return file_key
    settings = _cos_settings()
    if all(settings.values()) and (not file_key.startswith(("https://", "http://")) or _cos_key(file_key, settings)):
        try:
            return signed_object_url(file_key)
        except Exception:
            # A storage outage or incomplete COS credentials must not make
            # admin list APIs fail. The browser can handle an unavailable
            # image URL while the record itself remains visible.
            return file_key
    if file_key.startswith(("https://", "http://")):
        return file_key
    filename = file_key.split("/")[-1] if "/" in file_key else file_key
    if file_key.startswith("reviews/"):
        return f"/uploads/reviews/{filename}"
    if file_key.startswith("avatars/"):
        return f"/uploads/avatars/{filename}"
    return f"/uploads/{file_key}"
