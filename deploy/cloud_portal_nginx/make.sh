#!/bin/bash -e

. ../environment
. ../common.sh

function stage()
{
    true
}

MODULE=cloud_portal_nginx
VERSION="$(cat ../../version.txt).$BUILD_NUMBER"

main $@
