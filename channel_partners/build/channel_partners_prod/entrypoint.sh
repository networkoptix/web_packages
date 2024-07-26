#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

for command in $@

do
    case "$command" in
        migratedb)
            python manage.py migrate
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to migrate database"
                exit 1
            fi
            python manage.py runscript create_root_channel_partner --script-args ${INSTANCE_NAME} "${ROOT_NAME}"
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to create root channel partner"
                exit 1
            fi
            python manage.py runscript update_internal_token --script-args "${INTERNAL_AUTH_KEY}"
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to update internal token"
                exit 1
            fi
        ;;
        web)
            exec gunicorn channel_partners.wsgi:application --capture-output --workers ${WEB_WORKERS} --bind :8000 --log-level=info --timeout 300 -k gevent
        ;;
        celery)
            exec celery -A channel_partners worker -l INFO --concurrency=2 --pidfile=/tmp/celery-w1.pid
        ;;
        celery_beat)
            exec celery -A channel_partners beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler --pidfile=/tmp/celery-beat.pid
        ;;
    esac
done
