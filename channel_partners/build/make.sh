#!/bin/bash -e

. ../../deploy/environment
. ../../deploy/common.sh

REPOSITORY_PATH="${REPOSITORY_PATH:-"/products/channel_partners"}"
BUILD_NUMBER=${BUILD_NUMBER:-0}
BUILD_ARGS=(--build-arg CACHE_DATE=$(date +%s))

VERSION="23.3.0.$BUILD_NUMBER"

function stage() {
    rm -rf channel_partners_prod/stage
    rsync -a $NX_PORTAL_DIR/channel_partners/* channel_partners_prod/stage
    rsync -a $NX_PORTAL_DIR/common/python/* channel_partners_prod/stage/common_python
    echo "BUILD=$VERSION" > channel_partners_prod/stage/version.txt
    git log --format="commit %H%nDate: %cd" -n 1 >> channel_partners_prod/stage/version.txt
    git rev-parse --abbrev-ref HEAD | xargs echo 'branch:' >> channel_partners_prod/stage/version.txt
}

function publish() {
  stage
  pushd channel_partners_prod
  echo "In $(pwd)"
  MODULE="channel_partners/app"
  PUSH_MODULE="app"
  pack
  push
  popd

  pushd nginx
  MODULE="channel_partners/nginx"
  PUSH_MODULE="nginx"
  pack
  push
  popd
  rm -rf channel_partners_prod/stage
}

function clean() {
  MODULE="channel_partners/app"
  clean
  MODULE="channel_partners/nginx"
  clean
}

main $@
