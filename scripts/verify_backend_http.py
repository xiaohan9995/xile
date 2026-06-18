import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get("XILE_BACKEND_SMOKE_PORT", "5017"))
BASE_URL = f"http://127.0.0.1:{PORT}"


def request_json(path, method="GET", data=None, headers=None, timeout=3):
    body = None
    request_headers = headers or {}
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        request_headers = {"Content-Type": "application/json", **request_headers}
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers=request_headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def wait_for_server(process):
    last_error = None
    for _ in range(40):
      if process.poll() is not None:
          raise RuntimeError(f"backend exited early with code {process.returncode}")
      try:
          status, payload = request_json("/api/health", timeout=1)
          if status == 200 and payload.get("status") == "ok":
              return
      except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
          last_error = error
      time.sleep(0.25)
    raise RuntimeError(f"backend did not become ready: {last_error}")


def assert_equal(actual, expected, label):
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def main():
    with tempfile.TemporaryDirectory(prefix="xile-backend-smoke-") as tmpdir:
        db_path = Path(tmpdir) / "xile-smoke.db"
        env = {
            **os.environ,
            "PYTHONPATH": str(ROOT),
            "MYSQL_DATABASE_URI": f"sqlite:///{db_path.as_posix()}",
            "ADMIN_DEV_TOKEN": "dev-admin-token",
            "FLASK_DEBUG": "0",
        }
        command = [
            sys.executable,
            "-c",
            (
                "from backend.app import create_app;"
                "app=create_app({'SEED_DEMO_DATA': True, 'ADMIN_DEV_TOKEN': 'dev-admin-token'});"
                f"app.run(host='127.0.0.1', port={PORT}, debug=False, use_reloader=False)"
            ),
        ]
        process = subprocess.Popen(
            command,
            cwd=ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
        )
        try:
            wait_for_server(process)

            _, teachers = request_json("/api/mp/teachers/search?q=%E5%BC%A0")
            assert_equal(teachers["total"], 1, "teacher search total")
            assert_equal(teachers["items"][0]["name"], "张三", "teacher search name")

            _, certification = request_json("/api/mp/teachers/2/certification")
            assert_equal(certification["teacher"]["name"], "李四", "certification teacher name")
            assert_equal(certification["reviews"][0]["status"], "submitted", "certification review status")

            _, studios = request_json("/api/mp/studios")
            assert_equal(studios["total"], 2, "open studios total")

            _, login = request_json(
                "/api/admin/login",
                method="POST",
                data={"username": "admin", "password": "password"},
            )
            token = login["token"]
            _, dashboard = request_json(
                "/api/admin/stats/dashboard",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert_equal(dashboard["pendingReviewCount"], 1, "pending review count")
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()

    print("backend HTTP smoke verification passed")


if __name__ == "__main__":
    main()
