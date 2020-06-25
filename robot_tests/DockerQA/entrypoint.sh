#!/bin/bash

PORT=${PORT:-7001}

mkdir -p /root/.config/nx_ini

# If port is passed as argument
if [[ $PORT -ne 7001 ]]
then
  /opt/networkoptix/mediaserver/bin/config_helper.sh /opt/networkoptix/mediaserver/etc/mediaserver.conf port "${PORT}"
fi

exec /opt/networkoptix/mediaserver/bin/mediaserver-bin -e