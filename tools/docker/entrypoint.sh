#!/bin/bash
CUSTOMIZATION=$(ls /opt)

[ "$COPY" == "copy" ] && cp external.dat /opt/$CUSTOMIZATION/mediaserver/bin
/opt/$CUSTOMIZATION/mediaserver/bin/mediaserver -e
