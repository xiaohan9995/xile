FROM python:3.10-slim

WORKDIR /app

# install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# app code
COPY . .

# nginx config
COPY nginx.conf /etc/nginx/sites-available/default

# build admin static (placeholder)
# RUN mkdir -p /var/www/admin

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]
