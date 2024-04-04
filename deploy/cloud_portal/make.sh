#!/bin/bash -e

. ../environment
. ../common.sh

MODULE=cloud_portal
BUILD_NUMBER=${BUILD_NUMBER:-0}
BUILD_ARGS=(--build-arg CACHE_DATE=$(date +%s))

VERSION="$(cat ../../version.txt).$BUILD_NUMBER"

function build()
{
    [ -z "$NX_PORTAL_DIR" ] && { echo "NX_PORTAL_DIR variable is unset"; exit 1; }

    pushd $NX_PORTAL_DIR/build_scripts
        ./build.sh
    popd
}

function stage()
{
    rm -rf stage

    mkdir -p stage/cloud/static/common/static
    cp $NX_PORTAL_DIR/package-license.json $NX_PORTAL_DIR/cloud/
    rsync -a $NX_PORTAL_DIR/cloud stage
    rsync -a $NX_PORTAL_DIR/common/python/* stage/common_python
    rm -rf stage/cloud/.idea
}

function publish_deps()
{
    local dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    local img=009544449203.dkr.ecr.us-west-1.amazonaws.com/devtools/wheel_uploader:3.8-alpine3.12

    [ -f ~/.pypirc ] || { echo "Error: you need section [local] in the ~/.pypirc file with artifactory credentials"; exit 1; }

    docker pull $img
    docker run --rm -i -v ~/.pypirc:/root/.pypirc:ro $img < $dir/../../../cloud_portal/cloud/requirements.txt
}

main $@
