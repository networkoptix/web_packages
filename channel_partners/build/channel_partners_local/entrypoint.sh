#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

function check_exit_code() {
  if [[ $1 -ne 0 ]]; then
    exit 1
  fi
}

for command in $@

do
    case "$command" in
        migratedb)
            python manage.py migrate
            check_exit_code $?

            python manage.py collectstatic --no-input
            check_exit_code $?

            python manage.py runscript create_root_channel_partner --script-args ${INSTANCE_NAME} "${ROOT_NAME}"
            check_exit_code $?

            python manage.py runscript update_internal_token --script-args "${INTERNAL_AUTH_KEY}"
            check_exit_code $?
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
