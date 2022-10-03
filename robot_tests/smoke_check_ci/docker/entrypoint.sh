#!/bin/bash

# Default cloud host is set to https://cloud-test.hdw.mx
# To change the cloud host pass it as argument when spinning up a container:
# docker run -d --name=<container_name> -e cloud_host=<cloud_host> -t cloud_portal_smoke_check

cloud_host=${cloud_host:-"https://cloud-test.hdw.mx"}
vms=${vms:=-"4.2"}

# Tests should be run from the /robot_tests directory
cd ..

set -e

## Run the smoke check
#. ${PWD}/smoke_check_ci/scripts/run_tests.sh ${cloud_host} ${vms}

# Run all tests in parallel
pabot --pabotlib --outputdir smoke_check_ci/test_results -v ENV:${cloud_host} -v VMS:${vms} -v "TEST EMAIL":qaburbank smoke_check_ci/tests
