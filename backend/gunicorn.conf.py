# gunicorn.conf.py
import os

bind = "127.0.0.1:5000"
workers = int(os.getenv("GUNICORN_WORKERS", 2))
threads = int(os.getenv("GUNICORN_THREADS", 4))
timeout = 120
accesslog = "-"
errorlog = "-"
loglevel = "info"
