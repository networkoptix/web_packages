#!/bin/bash

mkdir -p /root/.config/nx_ini
touch -p /root/.config/nx_ini/nx_vms_server.ini


#mkdir -p /opt/networkoptix/mediaserver/{etc,var/log,var/ssl}
#tail --pid $$ -n0 -F /opt/networkoptix/mediaserver/var/log/log_file.log &

PORT=${PORT:-7001}

# Patch the port if port is passed as argument
if [[ $PORT -ne 7001 ]]
then
#    /opt/networkoptix/mediaserver/bin/config_helper.sh /opt/networkoptix/mediaserver/etc/mediaserver.conf port "${PORT}"
    sed -i "s/port=7001/port=${PORT}/g" /opt/networkoptix/mediaserver/etc/mediaserver.conf
fi

exec /opt/networkoptix/mediaserver/bin/mediaserver -e
