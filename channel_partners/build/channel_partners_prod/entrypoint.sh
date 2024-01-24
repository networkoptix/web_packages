#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

envsubst < /app/app/config/channel_partners.prod.yaml > temp.yaml
mv temp.yaml /app/app/config/channel_partners.prod.yaml

for command in $@

do
    case "$command" in
        migratedb)
            python manage.py migrate
            python manage.py runscript create_root_channel_partner --script-args ${INSTANCE_NAME}
        ;;
        web)
            exec gunicorn channel_partners.wsgi:application --capture-output --workers ${WEB_WORKERS} --bind :8000 --log-level=debug --timeout 300 -k gevent
        ;;
        celery)
            exec celery -A channel_partners worker -l DEBUG --concurrency=2 --pidfile=/tmp/celery-w1.pid
        ;;
        celery_beat)
            exec celery -A channel_partners beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler --pidfile=/tmp/celery-beat.pid
        ;;
    esac
done
