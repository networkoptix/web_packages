#!/bin/bash

if [[ "$1" == *"nxvms.com"* ]]
then
    pabot --pabotlib --outputdir smoke_check/test_results -e merge_and_licenses -v ENV:$1 -v VMS:$2 smoke_check/tests
else
    pabot --pabotlib --outputdir smoke_check/test_results -v ENV:$1 -v VMS:$2 smoke_check/tests
fi
