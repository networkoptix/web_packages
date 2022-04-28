#!/bin/bash

mkdir -p /root/.config/nx_ini

PORT=${PORT:-7001}
VMS=${VMS:-"new"}


# If port is passed as argument
if [[ $PORT -ne 7001 ]]
then
    #/opt/networkoptix/mediaserver/bin/config_helper.sh /opt/networkoptix/mediaserver/etc/mediaserver.conf port "${PORT}"
    sed -i "s/port=7001/port=${PORT}/g" /opt/networkoptix/mediaserver/etc/mediaserver.conf
fi

if [ "$VMS" = "new" ]
then
  exec /opt/networkoptix/mediaserver/bin/mediaserver -e
else
  exec /opt/networkoptix/mediaserver/bin/mediaserver-bin -e
fi
