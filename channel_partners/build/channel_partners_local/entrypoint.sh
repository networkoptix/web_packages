#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

for command in $@

do
    case "$command" in
        migratedb)
            python manage.py migrate && python manage.py collectstatic --no-input
        ;;
        web)
            exec gunicorn channel_partners.asgi:application --capture-output --workers ${WEB_WORKERS} --bind :8000 --log-level=debug --timeout 300 -k uvicorn.workers.UvicornWorker
        ;;
        celery)
            echo "Running in $(pwd)" >> /dev/stdout
            ls -las >> /dev/stdout
            ls -las /app/common_python >> /dev/stdout
            exec celery -A channel_partners worker -l DEBUG --concurrency=2 --pidfile=/tmp/celery-w1.pid
        ;;
    esac
done
