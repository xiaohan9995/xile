#!/usr/bin/env python3
"""
将本地 Markdown 文件导入为飞书新版文档（docx）。

依赖环境变量（或项目根目录 .env 文件）：
  FEISHU_APP_ID       飞书自建应用 App ID
  FEISHU_APP_SECRET   飞书自建应用 App Secret
  FEISHU_FOLDER_TOKEN 目标文件夹 token（可选，不填则导入到应用云空间根目录）

用法：
  python scripts/feishu_upload.py
  python scripts/feishu_upload.py docss/需求调研-喜乐瑜伽教师管理小程序.md
  python scripts/feishu_upload.py --folder-token fldcnXXXX  path/to/file.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("请先安装依赖: pip install requests", file=sys.stderr)
    sys.exit(1)

FEISHU_API = "https://open.feishu.cn/open-apis"
DEFAULT_MD = Path(__file__).resolve().parent.parent / "docss" / "需求调研-喜乐瑜伽教师管理小程序.md"
POLL_INTERVAL_SEC = 2
POLL_TIMEOUT_SEC = 120
BLOCK_INSERT_BATCH = 15
BLOCK_INSERT_SKIP_TYPES = {14, 31, 32}  # code、mermaid、表格（需嵌套创建，导入更可靠）
REQUEST_RETRIES = 3


def load_dotenv() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(
            f"缺少环境变量 {name}。请复制 .env.example 为 .env 并填写，或在终端 export 该变量。"
        )
    return value


def get_tenant_access_token(app_id: str, app_secret: str) -> str:
    resp = requests.post(
        f"{FEISHU_API}/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
        timeout=30,
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"获取 tenant_access_token 失败: {data}")
    token = data.get("tenant_access_token")
    if not token:
        raise RuntimeError(f"响应中无 tenant_access_token: {data}")
    return token


def upload_for_import(token: str, file_path: Path) -> str:
    """上传 Markdown 到导入专用节点，返回 file_token。"""
    file_size = file_path.stat().st_size
    if file_size == 0:
        raise ValueError("不能上传空文件")
    if file_size > 20 * 1024 * 1024:
        raise ValueError("文件超过 20MB，请拆分后上传")

    ext = file_path.suffix.lstrip(".").lower() or "md"
    if ext not in {"md", "markdown", "mark"}:
        raise ValueError(f"仅支持 md/markdown/mark 后缀，当前: .{ext}")

    extra = json.dumps({"obj_type": "docx", "file_extension": ext}, ensure_ascii=False)
    headers = {"Authorization": f"Bearer {token}"}

    with file_path.open("rb") as f:
        resp = requests.post(
            f"{FEISHU_API}/drive/v1/medias/upload_all",
            headers=headers,
            data={
                "file_name": file_path.name,
                "parent_type": "ccm_import_open",
                "parent_node": "",
                "size": str(file_size),
                "extra": extra,
            },
            files={"file": (file_path.name, f, "text/markdown")},
            timeout=120,
        )

    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"上传素材失败: {data}")
    file_token = data.get("data", {}).get("file_token")
    if not file_token:
        raise RuntimeError(f"响应中无 file_token: {data}")
    return file_token


def create_import_task(
    token: str,
    file_token: str,
    file_path: Path,
    folder_token: str | None,
    doc_title: str | None,
) -> str:
    ext = file_path.suffix.lstrip(".").lower() or "md"
    body: dict = {
        "file_extension": ext,
        "file_token": file_token,
        "type": "docx",
    }
    if doc_title:
        body["file_name"] = doc_title
    if folder_token:
        body["point"] = {"mount_type": 1, "mount_key": folder_token}

    resp = requests.post(
        f"{FEISHU_API}/drive/v1/import_tasks",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30,
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"创建导入任务失败: {data}")
    ticket = data.get("data", {}).get("ticket")
    if not ticket:
        raise RuntimeError(f"响应中无 ticket: {data}")
    return ticket


def wait_import_result(token: str, ticket: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    deadline = time.time() + POLL_TIMEOUT_SEC

    while time.time() < deadline:
        resp = requests.get(
            f"{FEISHU_API}/drive/v1/import_tasks/{ticket}",
            headers=headers,
            timeout=30,
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"查询导入结果失败: {data}")

        result = data.get("data", {}).get("result", {})
        status = result.get("job_status")
        if status == 0:
            return result
        if status in {3, 100, 101, 102, 103, 104, 105, 106, 108, 109, 110, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 129, 5000, 7000, 7001, 7002}:
            raise RuntimeError(
                f"导入失败，job_status={status}，原因: {result.get('job_error_msg')}"
            )
        time.sleep(POLL_INTERVAL_SEC)

    raise TimeoutError(f"导入超时（>{POLL_TIMEOUT_SEC}s），ticket={ticket}")


def api_post(token: str, path: str, *, json_body: dict | None = None, timeout: int = 120) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    last_err: Exception | None = None
    for attempt in range(REQUEST_RETRIES):
        try:
            resp = requests.post(
                f"{FEISHU_API}{path}",
                headers=headers,
                json=json_body,
                timeout=timeout,
            )
            return resp.json()
        except requests.RequestException as exc:
            last_err = exc
            time.sleep(1 + attempt)
    raise RuntimeError(f"请求失败: {path}") from last_err


def preprocess_markdown(text: str) -> str:
    text = re.sub(
        r"```mermaid.*?```",
        "> （架构关系图：教师管理委员会 / 认证教师 / 学员 三类用户，围绕分级管理、年审、教学记录、查询与资讯展示）\n",
        text,
        flags=re.S,
    )
    return text


def create_docx_document(token: str, title: str) -> str:
    data = api_post(token, "/docx/v1/documents", json_body={})
    if data.get("code") != 0:
        raise RuntimeError(f"创建文档失败: {data}")
    doc_id = data["data"]["document"]["document_id"]
    if title:
        patch = api_post(
            token,
            f"/docx/v1/documents/{doc_id}",
            json_body={"document": {"title": title}},
        )
        if patch.get("code") != 0:
            print(f"提示: 设置标题失败，将使用默认标题: {patch.get('msg')}")
    return doc_id


def convert_markdown_blocks(token: str, markdown: str) -> list[dict]:
    data = api_post(
        token,
        "/docx/v1/documents/blocks/convert",
        json_body={"content_type": "markdown", "content": markdown},
    )
    if data.get("code") != 0:
        raise RuntimeError(f"Markdown 转换失败: {data}")
    blocks: list[dict] = []
    for block in data["data"]["blocks"]:
        if block["block_type"] in BLOCK_INSERT_SKIP_TYPES:
            continue
        cleaned = {k: v for k, v in block.items() if k not in ("block_id", "parent_id", "children")}
        blocks.append(cleaned)
    return blocks


def insert_docx_blocks(token: str, doc_id: str, blocks: list[dict]) -> None:
    total = len(blocks)
    inserted = 0
    for start in range(0, total, BLOCK_INSERT_BATCH):
        chunk = blocks[start : start + BLOCK_INSERT_BATCH]
        data = api_post(
            token,
            f"/docx/v1/documents/{doc_id}/blocks/{doc_id}/children",
            json_body={"children": chunk, "index": -1},
        )
        if data.get("code") != 0:
            for block in chunk:
                single = api_post(
                    token,
                    f"/docx/v1/documents/{doc_id}/blocks/{doc_id}/children",
                    json_body={"children": [block], "index": -1},
                )
                if single.get("code") == 0:
                    inserted += 1
            continue
        inserted += len(chunk)
        print(f"  已写入 {min(start + len(chunk), total)} / {total} 块")
        time.sleep(0.12)
    if inserted == 0:
        raise RuntimeError("未能写入任何内容块")


def upload_via_docx_blocks(
    token: str,
    file_path: Path,
    doc_title: str | None,
) -> dict:
    title = doc_title or file_path.stem
    markdown = preprocess_markdown(file_path.read_text(encoding="utf-8"))

    print("[备选方案] 创建飞书新版文档并写入内容 ...")
    doc_id = create_docx_document(token, title)
    print(f"  文档 ID: {doc_id}")

    print("  转换 Markdown ...")
    blocks = convert_markdown_blocks(token, markdown)
    print(f"  可写入内容块: {len(blocks)}（已跳过表格/Mermaid 代码块）")

    print("  批量写入文档 ...")
    insert_docx_blocks(token, doc_id, blocks)

    url = f"https://feishu.cn/docx/{doc_id}"
    return {"token": doc_id, "url": url, "method": "docx_blocks"}


def parse_folder_token(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if "/folder/" in value:
        return value.rstrip("/").split("/folder/")[-1].split("?")[0]
    return value


def upload_markdown(
    file_path: Path,
    folder_token: str | None = None,
    doc_title: str | None = None,
) -> dict:
    load_dotenv()
    app_id = require_env("FEISHU_APP_ID")
    app_secret = require_env("FEISHU_APP_SECRET")
    folder_token = folder_token or parse_folder_token(os.environ.get("FEISHU_FOLDER_TOKEN"))
    if doc_title is None:
        doc_title = file_path.stem

    if not file_path.is_file():
        raise FileNotFoundError(f"文件不存在: {file_path}")

    print("[1/3] 获取 access token ...")
    access_token = get_tenant_access_token(app_id, app_secret)

    use_import = bool(folder_token and folder_token.startswith("fld"))
    if use_import:
        try:
            print(f"[2/3] 导入模式: 上传文件 {file_path.name}")
            file_token = upload_for_import(access_token, file_path)
            print("[3/3] 创建导入任务并等待完成 ...")
            ticket = create_import_task(access_token, file_token, file_path, folder_token, doc_title)
            result = wait_import_result(access_token, ticket)
            result["method"] = "import"
            extra = result.get("extra") or []
            if extra:
                print(f"提示: 导入有部分截断/告警，extra={extra}")
            return result
        except RuntimeError as exc:
            print(f"导入模式失败，自动切换写入模式: {exc}")

    return upload_via_docx_blocks(access_token, file_path, doc_title)


def main() -> None:
    parser = argparse.ArgumentParser(description="上传 Markdown 到飞书云文档")
    parser.add_argument(
        "file",
        nargs="?",
        default=str(DEFAULT_MD),
        help="要上传的 .md 文件路径",
    )
    parser.add_argument(
        "--folder-token",
        help="目标文件夹 token，或飞书文件夹 URL（覆盖 FEISHU_FOLDER_TOKEN）",
    )
    parser.add_argument(
        "--title",
        help="导入后的文档标题（默认取文件名不含后缀）",
    )
    args = parser.parse_args()

    try:
        result = upload_markdown(
            Path(args.file).resolve(),
            folder_token=parse_folder_token(args.folder_token),
            doc_title=args.title,
        )
    except (RuntimeError, TimeoutError, ValueError, FileNotFoundError, requests.RequestException) as exc:
        print(f"错误: {exc}", file=sys.stderr)
        sys.exit(1)

    url = result.get("url", "")
    doc_token = result.get("token", "")
    print("\n上传成功!")
    if url:
        print(f"文档链接: {url}")
    if doc_token:
        print(f"文档 token: {doc_token}")


if __name__ == "__main__":
    main()
