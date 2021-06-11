#!/bin/bash
CUSTOMIZATION=$(ls /opt)
CLOUD_HOST=${CLOUD_HOST:-"cloud-test.hdw.mx"}
mkdir -p /root/.config/nx_ini
# Override external.dat
[ "$COPY" == "copy" ] && cp external.dat /opt/$CUSTOMIZATION/mediaserver/bin

#Override cloud host for systems >= 4.3
echo "customizedCloudHost=\"default:$CLOUD_HOST\"" >> /root/.config/nx_ini/nx_vms_server.ini

# Change cloud host for systems < 4.3. Defaults to cloud-test
/patch-cloud-host.sh $CLOUD_HOST

# Changes the port
PORT=${PORT:-7001}
# If port is passed as argument
if [[ $PORT -ne 7001 ]]
then
   /config_helper.sh /opt/$CUSTOMIZATION/mediaserver/etc/mediaserver.conf port "${PORT}"
fi

if [ -f /opt/$CUSTOMIZATION/mediaserver/bin/mediaserver-bin ]; then
    /opt/$CUSTOMIZATION/mediaserver/bin/mediaserver-bin -e
else
    /opt/$CUSTOMIZATION/mediaserver/bin/mediaserver -e
fi
