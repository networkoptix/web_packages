#!/bin/bash
set -ex

echo "Running with args: $@"
echo "Environment:"
env
echo "---------------------------"

PORTAL_WORKERS=${PORTAL_WORKERS:-1}

function update_with_module_configuration()
{
    local config_file=$1
    local configuration=$2

    echo "$configuration" | /usr/local/bin/merge_config.py "$config_file"
}

function instantiate_config()
{
    export CLOUD_PORTAL_CONF_DIR=$CLOUD_PORTAL_BASE_CONF_DIR
    mkdir -p $CLOUD_PORTAL_CONF_DIR

    local CLOUD_PORTAL_CONF_TEMPLATE=$CLOUD_PORTAL_BASE_CONF_DIR/_source/cloud_portal.yaml
    local CLOUD_PORTAL_CONF=$CLOUD_PORTAL_CONF_DIR/cloud_portal.yaml
    local CLOUD_PORTAL_LOCK=${CLOUD_PORTAL_CONF}.lock

    (
        flock -n 9 || exit 1
        tmp=$(mktemp)

        envsubst < $CLOUD_PORTAL_CONF_TEMPLATE > $tmp
        mv $tmp $CLOUD_PORTAL_CONF

        if [ -n "$MODULE_CONFIGURATION" ]
        then
            update_with_module_configuration $CLOUD_PORTAL_CONF "$MODULE_CONFIGURATION"
        fi

        rm $CLOUD_PORTAL_LOCK
    ) 9> $CLOUD_PORTAL_LOCK

}

function write_my_cnf()
{
    cat > ~/.my.cnf << EOF
[client]
user = $DB_USER
password = $DB_PASSWORD
host = $DB_HOST
port = $DB_PORT
database = $DB_NAME
EOF
}

function instantiate_configs()
{
    ORIG_CUSTOMIZATION=$CUSTOMIZATION

    for customization in $ALL_CUSTOMIZATIONS
    do
        instantiate_config $customization
    done

    CUSTOMIZATION=$ORIG_CUSTOMIZATION
}

for command in $@
do
    case "$command" in
        migratedb)
            write_my_cnf
            python manage.py resetdeploymentstatus
            echo "CREATE DATABASE IF NOT EXISTS $DB_NAME" | mysql -Dinformation_schema

            yes "yes" | python manage.py migrate
            python manage.py update_hosts_from_ireg
            python manage.py readstructure
            python manage.py update_ipvd
            sleep 10 # Wait a bit to make sure cache is set
            ;;
        config)
            instantiate_config
            ;;
        copystatic)
            cp -R /app/app/static /static_volume
            ;;
        web)
            write_my_cnf
            sleep 10
            if ! python manage.py healthcheck; then
                sleep 10
                exit
            fi

            # On non-prod instances block webcrawlers
            if [ $INSTANCE_NAME != "prod" ]; then
                sed -i 's$<base href="/">$<base href="/"><meta name="robots" content="noindex,nofollow">$g' static/_source/*/static/index.html
                # Delete robots.txt for non prod instances to allow nginx to serve from django app instead
                rm static/_source/*/static/robots.txt

                # Hash needs to be recalculated since index.html was changed
                for skinDir in static/_source/*/
                do
                  index_sha1=$(sha1sum "$skinDir"static/index.html | cut -d " " -f 1)
                  sed -i 's/\(index.html": "\).*"/\1'"$index_sha1"'"/g' "$skinDir"static/ngsw.json
                done

            fi
#            python manage.py update_host --customization $CUSTOMIZATION
#            python manage.py filldata --customization $CUSTOMIZATION
#            python manage.py filldata --customization $CUSTOMIZATION --preview=True &  # Removing for now

            find /app/app/static | xargs touch
            exec gunicorn cloud.asgi:application --capture-output --workers ${PORTAL_WORKERS} --bind :5000 --log-level=debug --timeout 300 -k uvicorn.workers.UvicornWorker
            ;;
        celery)
            write_my_cnf
            rm -f /tmp/*.pid

            # On non-prod instances run celery as with debug logging
            if [ "$INSTANCE_NAME" != "prod" ] && [ "$INSTANCE_NAME" != "stage" ]; then
              LOG_LEVEL="debug"
            else
              LOG_LEVEL="info"
            fi

            echo $'\n'Celery started: Version $VERSION$'\n'
            exec celery -A notifications worker -l $LOG_LEVEL --concurrency=1 --pidfile=/tmp/celery-w1.pid
            ;;
        notification_module)
            write_my_cnf
            rm -f /tmp/*.pid

            # On non-prod instances run celery as with debug logging
            if [ "$INSTANCE_NAME" != "prod" ] && [ "$INSTANCE_NAME" != "stage" ]; then
              LOG_LEVEL="debug"
            else
              LOG_LEVEL="info"
            fi

            echo $'\n'Notifications started: Version $VERSION$'\n'
            exec celery -A notifications worker -Q cloud-emails -l $LOG_LEVEL --concurrency=4 --pidfile=/tmp/celery-w1.pid
            ;;
        celery_beat)
            write_my_cnf

            echo Starting celery beat: Version $VERSION$'\n'
            exec celery -A notifications beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
            ;;
        broadcast_notifications)
            write_my_cnf
            rm -f /tmp/*.pid

            echo $'\n'Broadcast notifications started: Version $VERSION$'\n'
            exec celery -A notifications worker -Q broadcast-notifications -l info -B --concurrency=1 --pidfile=/tmp/celery-broadcast-w1.pid
            ;;
        system_notifications)
            write_my_cnf
            rm -f /tmp/*.pid

            echo $'\n'System notifications started: Version $VERSION$'\n'
            exec celery -A notifications worker -Q system-notifications -l info -B --concurrency=1 --pidfile=/tmp/celery-system-w1.pid
            ;;
        push_notifications)
            write_my_cnf
            rm -f /tmp/*.pid

            echo $'\n'Push Notifications started: Version $VERSION$'\n'
            exec celery -A notifications worker -Q push-notification -l info --pidfile=/tmp/celery-push-w1.pid
            ;;
        *)
            echo Usage: cloud_portal '[web|broadcast_notifications|system_notifications|push_notifications|celery|celery_beat|config|copystatic|migratedb]'
            ;;
    esac
done
