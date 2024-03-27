#!/bin/bash -e

. ../environment
. ../common.sh

MODULE=system_groups
BUILD_NUMBER=${BUILD_NUMBER:-0}
BUILD_ARGS=(--build-arg CACHE_DATE=$(date +%s))

VERSION="$(cat ../../version.txt).$BUILD_NUMBER"

function stage()
{
    rm -rf stage

    rsync -a $NX_PORTAL_DIR/systems/* stage
    rm -rf stage/.idea
    rm -rf stage/static # only used for local development
}

main $@
