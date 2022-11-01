#!/bin/bash -e

. ../environment
. ../common.sh

function stage()
{
    true
}

MODULE=system_groups_nginx
VERSION="$(cat ../../version.txt).$BUILD_NUMBER"

main $@
