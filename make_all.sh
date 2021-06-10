#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

pushd "$SCRIPT_DIR/deploy/cloud_portal"
./make.sh build publish
popd

pushd "$SCRIPT_DIR/deploy/cloud_portal_nginx"
./make.sh publish
popd
