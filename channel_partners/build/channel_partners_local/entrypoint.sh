#!/bin/bash

WEB_WORKERS=${WEB_WORKERS:-1}

echo "Arguments: '$@'"

if [[ $1 == "" ]]; then
  echo "Command is required"
  exit 1
fi

# Left for better times
#for cmd in $@; do
#  if [[ "migratedb web celery celery_beat" != *$cmd* ]]; then
#    echo "Invalid command: '$cmd'"
#    exit 2
#  fi
#done

python manage.py makemigrations --check
echo "Checking if there are not saved migrations"
if [[ $? -ne 0 ]]; then
    echo "Error: The are changes that are not yet reflected in a migration"
    exit 101
fi

function wait_migration() {
    echo "Checking if there are not applied migrations"
    python manage.py healthcheck
    if [[ $? -ne 0 ]]; then
        echo "Error: Health check failed"
        exit 102
    fi
}

for cmd in $@;
do
    echo "Running command: '$cmd'"
    case "$cmd" in
        migratedb)
            if [[ $(echo $@ | grep -c 'celery') -eq 1 ]]; then
                echo "Skipping migration in celery containers"
                continue
            fi
            # In some really weird cases, there could be a kind of race condition,
            # when the migration is executed and on a next deployment it fails.
            # Cache lock cannot be cleared when some of containers are checking for that.
            # It's hard to imagine a case when it could happen, but leaving this
            # note to remember about this possibility.
            python manage.py set_migrations_status --is_ready=0
            python manage.py migrate
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to migrate database"
                exit 103
            fi
            python manage.py runscript create_root_channel_partner --script-args ${INSTANCE_NAME} "${ROOT_NAME}"
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to create root channel partner"
                exit 104
            fi
            python manage.py runscript update_internal_token --script-args "${INTERNAL_AUTH_KEY}"
            if [[ $? -ne 0 ]]; then
                echo "Error: Failed to update internal token"
                exit 105
            fi
            python manage.py set_migrations_status --is_ready=1
        ;;
        web)
            wait_migration
            exec gunicorn channel_partners.wsgi:application --capture-output --workers ${WEB_WORKERS} --bind :8000 --log-level=info --timeout 300 -k gevent
        ;;
        celery)
            wait_migration
            exec celery -A channel_partners worker -l INFO --concurrency=2 --pidfile=/tmp/celery-w1.pid
        ;;
        celery_beat)
            wait_migration
            exec celery -A channel_partners beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler --pidfile=/tmp/celery-beat.pid
        ;;
        *)
            echo "Invalid command: '$cmd'. Skipping"
    esac
done

