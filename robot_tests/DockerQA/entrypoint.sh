#!/bin/bash

mkdir -p /root/.config/nx_ini

PORT=${PORT:-7001}
VMS=${VMS:-"new"}
CLOUD_HOST=${CLOUD_HOST:-"cloud-test.hdw.mx"}

# Patch the server port
if [[ $PORT -ne 7001 ]]
then
  sed -i "s/port=7001/port=${PORT}/g" /opt/networkoptix/mediaserver/etc/mediaserver.conf
fi

echo "customizedCloudHost=\"default:${CLOUD_HOST}\"" >> /root/.config/nx_ini/nx_vms_server.ini

if [ "$VMS" == "new" ]
then
  exec /opt/networkoptix/mediaserver/bin/mediaserver -e
else
  exec /opt/networkoptix/mediaserver/bin/mediaserver-bin -e
fi
