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


def mp_login(teacher_id=1):
    """Return a mini-program JWT using the development mock login code."""
    _, payload = request_json(
        "/api/mp/auth/login",
        method="POST",
        data={"code": f"dev-mock-code-{teacher_id}"},
    )
    token = payload.get("token")
    if not token:
        raise AssertionError("mini-program login did not return a token")
    return token


def main():
    with tempfile.TemporaryDirectory(prefix="xile-backend-smoke-") as tmpdir:
        db_path = Path(tmpdir) / "xile-smoke.db"
        env = {
            **os.environ,
            "PYTHONPATH": str(ROOT),
            "MYSQL_DATABASE_URI": f"sqlite:///{db_path.as_posix()}",
            "ADMIN_DEV_TOKEN": "dev-admin-token",
        }
        command = [
            sys.executable,
            "-c",
            (
                "from backend.app import create_app;"
                # DEBUG must stay enabled: the development mock login in
                # services/auth_service.py only applies when app.debug is true,
                # and Flask.run(debug=...) would overwrite it.
                "app=create_app({'SEED_DEMO_DATA': True, 'ADMIN_DEV_TOKEN': 'dev-admin-token', 'DEBUG': True});"
                f"app.run(host='127.0.0.1', port={PORT}, use_reloader=False, use_debugger=False)"
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

            # Mini-program business endpoints require a session token.
            try:
                request_json("/api/mp/teachers/search?q=%E5%BC%A0")
            except urllib.error.HTTPError as error:
                assert_equal(error.code, 401, "teacher search without token")
            else:
                raise AssertionError("teacher search without token: expected 401")

            mp_headers = {"Authorization": f"Bearer {mp_login(1)}"}

            _, teachers = request_json("/api/mp/teachers/search?q=%E5%BC%A0", headers=mp_headers)
            assert_equal(teachers["total"], 1, "teacher search total")
            assert_equal(teachers["items"][0]["name"], "善悦", "teacher search name")

            # Non-owners only receive the public summary, so the review history
            # has to be read through the owner endpoint instead.
            _, public_certification = request_json("/api/mp/teachers/2/certification", headers=mp_headers)
            assert_equal(public_certification["teacher"]["teacherNo"], "JY20230002", "public certification teacher no")
            if "reviews" in public_certification:
                raise AssertionError("public certification leaked review history")

            _, certification = request_json(
                "/api/mp/teachers/me/certification",
                headers={"Authorization": f"Bearer {mp_login(2)}"},
            )
            assert_equal(certification["teacher"]["name"], "清心", "certification teacher name")
            assert_equal(certification["reviews"][0]["status"], "submitted", "certification review status")

            _, studios = request_json("/api/mp/studios", headers=mp_headers)
            assert_equal(studios["total"], 3, "open studios total")

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
