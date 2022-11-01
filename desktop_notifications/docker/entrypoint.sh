#!/bin/sh

for command in $@
do
    case "$command" in
        provider)
            echo "Running provider hypercorn"
            cd notification_provider
            exec hypercorn --workers 4 --bind 0.0.0.0:8000 --root-path /cloud_notifications/provider --websocket-ping-interval 30 --log-level debug --access-logfile - --error-logfile - main:app
            ;;
        receiver)
            echo "Running receiver hypercorn"
            cd notification_receiver
            exec hypercorn --workers 4 --bind 0.0.0.0:8000 --root-path /cloud_notifications/receiver --log-level debug --access-logfile - --error-logfile - main:app
            ;;
    esac
done
