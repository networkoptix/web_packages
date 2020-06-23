#!/bin/bash

mkdir -p /root/.config/nx_ini
#tail --pid $$ -n0 -F /opt/networkoptix/mediaserver/var/log/log_file.log

PORT=${PORT:-7001}

/opt/networkoptix/mediaserver/bin/config_helper.py /opt/networkoptix/mediaserver/etc/mediaserver.conf port "${PORT}"

exec /opt/networkoptix/mediaserver/bin/mediaserver-bin -e