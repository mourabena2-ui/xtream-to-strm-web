#!/bin/bash
set -e

# Start Redis server in the background
# Start Redis server in the background
redis-server --dir /app --dbfilename dump.rdb --daemonize yes --pidfile /app/redis.pid --logfile /app/redis.log

# Wait for Redis to be ready
sleep 2

# Start Celery worker in the background
celery -A app.core.celery_app worker --loglevel=info 2>&1 | tee -a app.log &

# Start Celery Beat in the background
celery -A app.core.celery_app beat --loglevel=info 2>&1 | tee -a app.log &

# Start the FastAPI application
uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | tee -a app.log
