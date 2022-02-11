#!bin/bash

mkdir -p /opt/networkoptix/mediaserver/{etc,var/log,var/ssl}
tail --pid $$ -n0 -F /opt/networkoptix/mediaserver/var/log/log_file.log &

mkdir -p /root/.config/nx_ini
touch -p /root/.config/nx_ini/nx_vms_server.ini

PORT=${PORT:-7001}
CLOUD_HOST=${CLOUD_HOST:-"cloud-test.hdw.mx"}

# Patch the server port
if [[ $PORT -ne 7001 ]]
then
  sed -i "s/port=7001/port=${PORT}/g" /opt/networkoptix/mediaserver/etc/mediaserver.conf
fi

echo "customizedCloudHost=\"default:${CLOUD_HOST}\"" >> /root/.config/nx_ini/nx_vms_server.ini

exec /opt/networkoptix/mediaserver/bin/mediaserver -e

