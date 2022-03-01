#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pushd "$SCRIPT_DIR/deploy/cloud_portal"
    ./make.sh build publish || { echo 'Building cloud_portal failed' ; exit 1; }
popd

pushd "$SCRIPT_DIR/deploy/cloud_portal_nginx"
    ./make.sh publish || { echo 'Building cloud_portal_nginx failed' ; exit 1; }
popd

pushd "$SCRIPT_DIR/deploy/system_groups"
  ./make.sh publish || { echo 'Building system_groups failed' ; exit 1; }
popd
