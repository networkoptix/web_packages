#!/bin/bash -e

. ../../deploy/environment
. ../../deploy/common.sh

REPOSITORY_PATH="/products/channel_partners"
BUILD_NUMBER=${BUILD_NUMBER:-0}
BUILD_ARGS=(--build-arg CACHE_DATE=$(date +%s))

VERSION="23.3.0.$BUILD_NUMBER"

function stage() {
    rm -rf channel_partners_prod/stage
    rsync -a $NX_PORTAL_DIR/channel_partners/* channel_partners_prod/stage
    rsync -a $NX_PORTAL_DIR/common/python/* channel_partners_prod/stage/common_python
    echo "BUILD=$VERSION" > channel_partners_prod/stage/version.txt
}

function publish() {
  stage
  pushd channel_partners_prod
  echo "In $(pwd)"
  MODULE="app"
  pack
  push
  popd

  pushd nginx
  MODULE="nginx"
  pack
  push
}

main $@
