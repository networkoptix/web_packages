#!/bin/bash -e

. ../deploy/environment
. ../deploy/common.sh

MODULE=cloud_notifications
BUILD_NUMBER=${BUILD_NUMBER:-0}
BUILD_ARGS=(--build-arg CACHE_DATE=$(date +%s))

VERSION="22.1.0.$BUILD_NUMBER"

function publish() {
  MODULE=cloud_notifications
  pack
  push

  pushd nginx
  MODULE=cloud_notifications_nginx
  pack
  push
}

function clean() {
  MODULE=cloud_notifications
  clean
  MODULE=cloud_notifications_nginx
  clean
}

main $@
