"""存储引用归一：入库统一存 COS 对象键，换桶/换账号不需要改历史数据。"""

from backend.app.utils.storage import storage_reference

BUCKET_URL = "https://xile-yoga-1305573525.cos.ap-shanghai.myqcloud.com"


def _configure(monkeypatch):
    monkeypatch.setenv("COS_BUCKET", "xile-yoga-1305573525")
    monkeypatch.setenv("COS_REGION", "ap-shanghai")


def test_storage_reference_returns_object_key(monkeypatch):
    _configure(monkeypatch)

    assert storage_reference(f"{BUCKET_URL}/teacher-avatars/abc.png") == "teacher-avatars/abc.png"


def test_storage_reference_strips_signature_query(monkeypatch):
    _configure(monkeypatch)

    signed = f"{BUCKET_URL}/teacher-certificates/x.jpg?q-sign-algorithm=sha1&sign=abc"
    assert storage_reference(signed) == "teacher-certificates/x.jpg"


def test_storage_reference_keeps_object_key_and_external_urls(monkeypatch):
    _configure(monkeypatch)

    assert storage_reference("teacher-avatars/abc.png") == "teacher-avatars/abc.png"
    assert storage_reference("/uploads/reviews/a.pdf") == "/uploads/reviews/a.pdf"
    # 微信头像等外部地址无法转成对象键，原样保留。
    external = "https://thirdwx.qlogo.cn/mmopen/abc/132"
    assert storage_reference(external) == external
    assert storage_reference(None) is None


def test_storage_reference_keeps_foreign_bucket_url(monkeypatch):
    _configure(monkeypatch)

    foreign = "https://other-bucket-123.cos.ap-shanghai.myqcloud.com/a.png"
    assert storage_reference(foreign) == foreign
