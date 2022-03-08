#!/bin/sh

htpasswd -cb /etc/nginx/notification.passwd $(echo -ne $NOTIFICATION_SECRET | tr : ' ')
[ -n "$MAINTENANCE_PASSWORD" ] && htpasswd -b /etc/nginx/notification.passwd nx "$MAINTENANCE_PASSWORD"

DATA_HOSTS_STR="$(echo $DATA_HOSTS | tr , '\n' | awk '{print "https://" $1}' | tr '\n' ' ')"
export DATA_HOSTS_STR

export DOLLAR='$'
export BUILD=${WEB_ENV_VERSION//*.}

envsubst < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g "daemon off;"
