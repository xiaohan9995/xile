import os
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ADMIN_ROOT = ROOT / "admin-src"
VISUAL_DIR = ROOT / "docss" / "visual-qa" / "admin-browser"
PORT = int(os.environ.get("XILE_ADMIN_VISUAL_PORT", "4187"))
BASE_URL = f"http://127.0.0.1:{PORT}"
CHROME_CANDIDATES = [
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
]

ROUTES = {
    "login": "/admin/login",
    "dashboard": "/admin/dashboard",
    "teachers": "/admin/teachers",
    "reviews": "/admin/reviews",
    "studios": "/admin/studios",
    "analytics": "/admin/analytics",
    "settings": "/admin/settings",
}


def run(command, cwd):
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(command)} failed with {result.returncode}")


def find_chrome():
    for candidate in CHROME_CANDIDATES:
        if candidate.exists():
            return candidate
    raise RuntimeError("Chrome or Edge executable was not found")


def wait_for_preview(process):
    last_error = None
    for _ in range(40):
        if process.poll() is not None:
            raise RuntimeError(f"vite preview exited early with {process.returncode}")
        try:
            with urllib.request.urlopen(f"{BASE_URL}/admin/", timeout=2) as response:
                if response.status == 200 and b'<div id="app"></div>' in response.read():
                    return
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(0.25)
    raise RuntimeError(f"vite preview did not become ready: {last_error}")


def screenshot(chrome, name, route):
    target = VISUAL_DIR / f"{name}.png"
    with tempfile.TemporaryDirectory(prefix=f"xile-chrome-{name}-") as user_data_dir:
        command = [
            str(chrome),
            "--headless=new",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={user_data_dir}",
            "--window-size=1440,1000",
            f"--screenshot={target}",
            f"{BASE_URL}{route}",
        ]
        try:
            result = subprocess.run(
                command,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=35,
            )
        except subprocess.TimeoutExpired as error:
            if not target.exists():
                raise RuntimeError(f"Chrome screenshot timed out for {route}: {error}") from error
            return target
        if result.returncode != 0:
            raise RuntimeError(f"Chrome screenshot failed for {route}: {result.stdout}")
    return target


def verify_png(path):
    with Image.open(path) as image:
        if image.size != (1440, 1000):
            raise AssertionError(f"{path.name}: expected 1440x1000, got {image.size}")
        sample = image.resize((36, 25))
        colors = sample.convert("RGB").getcolors(maxcolors=36 * 25)
        if not colors or len(colors) < 8:
            raise AssertionError(f"{path.name}: screenshot appears blank or too low detail")
        extrema = image.convert("L").getextrema()
        if extrema[1] - extrema[0] < 20:
            raise AssertionError(f"{path.name}: screenshot contrast is too low")


def cleanup_preview(process):
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/pid", str(process.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        process.terminate()


def main():
    VISUAL_DIR.mkdir(parents=True, exist_ok=True)
    chrome = find_chrome()
    run([os.environ.get("ComSpec", "cmd.exe"), "/d", "/s", "/c", "npm.cmd run build"], ADMIN_ROOT)

    preview = subprocess.Popen(
        [os.environ.get("ComSpec", "cmd.exe"), "/d", "/s", "/c", f"npm.cmd run preview -- --host 127.0.0.1 --port {PORT}"],
        cwd=ADMIN_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_for_preview(preview)
        outputs = []
        for name, route in ROUTES.items():
            path = screenshot(chrome, name, route)
            verify_png(path)
            outputs.append(path.relative_to(ROOT).as_posix())
    finally:
        cleanup_preview(preview)

    print("admin browser visual verification passed")
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
