"""工作室审批相关的公共逻辑，供管理后台与小程序端复用。"""
from ..utils.storage import storage_reference


def normalize_storage_url(url):
    """把 COS 签名 URL 转成稳定对象 URL（无签名、长度短）。

    教师提交的图片可能是签名 URL（带签名参数，长度可达数百字符），直接写入
    cover_url(String 256)/contact_image(String 512) 会在 MySQL 上触发
    "Data too long"。这里把 http(s) 图片地址归一化为稳定对象 URL；相对路径
    （本地开发）保持原样。
    """
    if not url:
        return None
    url = str(url).strip()
    if url.startswith(("https://", "http://")):
        return storage_reference(url) or url
    return url


def apply_pending_draft(studio, draft):
    """把草稿字段应用到工作室的已发布字段上。

    Only the editable fields (地址/城市/地区/联系方式/标签/课程介绍/图片/坐标)
    are applied; intro stays admin-owned and never changes here.
    """
    if "address" in draft:
        studio.address = draft.get("address")
    # 城市/地区随地址一起审批生效，保证与地图选点结果一致。
    if "city" in draft:
        studio.city = draft.get("city")
    if "district" in draft:
        studio.district = draft.get("district")
    # 经纬度随地址一同审批生效，保证地图位置与地址一致。
    if "latitude" in draft and "longitude" in draft:
        lat = draft.get("latitude")
        lng = draft.get("longitude")
        if lat is not None and lng is not None:
            studio.latitude = lat
            studio.longitude = lng
    if "contact" in draft:
        studio.contact_text = draft.get("contact")
    # 联系工作室图片随草稿一同审批生效；图片 URL 先归一化为稳定地址。
    if "contactImage" in draft:
        studio.contact_image = normalize_storage_url(draft.get("contactImage"))
    if "tags" in draft:
        studio.tags = draft.get("tags")
    if "courseIntro" in draft:
        studio.course_intro = draft.get("courseIntro")
    if "images" in draft:
        images = [normalize_storage_url(u) for u in (draft.get("images") or [])]
        images = [u for u in images if u]
        studio.images = ",".join(images) if images else None
        if images:
            studio.cover_url = images[0]
