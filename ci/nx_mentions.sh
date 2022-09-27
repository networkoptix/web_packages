#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")" || exit

BAN_LIST="[^[:alpha:]]nx\ |nxvms"
echo "Checking files for mentions of nx with the following patterns: ${BAN_LIST}"
branding=$(grep -Ei "$BAN_LIST" -rl --exclude-dir=fonts --exclude={\*.{mock.ts,spec.ts,swf,png,gif},{commonPasswordsList,downloads}.json,test.ts,angular.json,environment.*} ../front_end/{apps,libs,common}) || true
if [[ -z ${branding} ]]
then
    echo "No mentions were found"
else
    echo -e "\nError found mentions of Nx in the following files:"
    for mention in ${branding}
    do
        echo ${mention}
    done
    exit 1
fi
