from celery import Celery
from app.core.config import settings

celery_app = Celery("worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(task_track_started=True)

# Configure Celery Beat schedule
celery_app.conf.beat_schedule = {
    'check-schedules-every-minute': {
        'task': 'app.tasks.sync.check_schedules_task',
        'schedule': 60.0,  # Run every 60 seconds
    },
}
celery_app.conf.timezone = 'UTC'

# Import tasks to register them
from app.tasks import sync  # noqa
from app.tasks import m3u_sync  # noqa
