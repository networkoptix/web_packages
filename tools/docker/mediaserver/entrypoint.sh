#!/bin/bash
CUSTOMIZATION=$(ls /opt)
CLOUD_HOST=${CLOUD_HOST:-"cloud-test.hdw.mx"}
mkdir -p /root/.config/nx_ini
# Override external.dat
[ "$COPY" == "copy" ] && cp external.dat /opt/$CUSTOMIZATION/mediaserver/bin

#Override cloud-host for systems rest systems (5.0+)
echo "customizedCloudHost=\"default:$CLOUD_HOST\"" >> /root/.config/nx_ini/nx_vms_server.ini

# Change cloud host for systems non rest systems ( version < 5.0). Keeping for legacy reasons
# /patch-cloud-host.sh $CLOUD_HOST

# Timout for owner actions. Default value is 10 minutes. Can be changed to shorten testing time.
echo "maxSessionAgeForPrivilegedApiS=600" >> /root/.config/nx_ini/nx_network_rest.ini

if [[ -e ecs.sqlite ]]
then
    mv ecs.sqlite /opt/$CUSTOMIZATION/mediaserver/var
fi

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
