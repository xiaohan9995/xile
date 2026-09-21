"""首页 / 工作室页横幅图配置的公共读写逻辑，供管理后台与小程序端复用。

横幅图 URL 存入 system_configs（home_banner_url / studio_banner_url），
统一存「稳定对象 URL」，读取时经 file_url 重新签名（与工作室图片策略一致）。
"""
from ..extensions import db
from ..models import SystemConfig
from ..utils.storage import file_url as _file_url, storage_reference

BANNER_KEYS = ("home_banner_url", "studio_banner_url")


def get_banners():
    # 私有桶下稳定对象 URL 无法直接访问，必须经 file_url 重新签发临时签名地址。
    configs = {c.key: c.value for c in SystemConfig.query.filter(SystemConfig.key.in_(BANNER_KEYS)).all()}
    return {
        "home": _file_url(configs.get("home_banner_url")),
        "studio": _file_url(configs.get("studio_banner_url")),
    }


def _normalize(value):
    if not value:
        return None
    return storage_reference(str(value).strip())


def update_banners(home=None, studio=None):
    """保存横幅图；home/studio 传 None 表示不修改该槽位，传空串表示清除。"""
    updates = {}
    if home is not None:
        updates["home_banner_url"] = _normalize(home)
    if studio is not None:
        updates["studio_banner_url"] = _normalize(studio)

    for key, value in updates.items():
        config = db.session.get(SystemConfig, key)
        if not value:
            if config:
                db.session.delete(config)
        elif config:
            config.value = value
        else:
            db.session.add(SystemConfig(key=key, value=value))
    db.session.commit()
    return get_banners()
