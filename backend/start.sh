#!/bin/bash
set -e

# Start Redis server in the background if available
if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes || true
    # Wait for Redis to be ready
    sleep 2
else
    echo "redis-server not found, assuming external redis or skipping"
fi

# Start Celery worker in the background
./venv/bin/celery -A app.core.celery_app worker --loglevel=info 2>&1 | tee -a app.log &

# Start the FastAPI application
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | tee -a app.log

