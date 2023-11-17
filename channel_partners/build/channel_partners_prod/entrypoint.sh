#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

envsubst < /app/app/config/channel_partners.prod.yaml > temp.yaml
mv temp.yaml /app/app/config/channel_partners.prod.yaml

for command in $@

do
    case "$command" in
        migratedb)
            python manage.py migrate
        ;;
        web)
            exec gunicorn channel_partners.asgi:application --capture-output --workers ${WEB_WORKERS} --bind :8000 --log-level=debug --timeout 300 -k gevent
        ;;
    esac
done
