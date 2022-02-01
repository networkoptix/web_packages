#!/bin/bash

# Run all tests in parallel
pabot --pabotlib --outputdir smoke_check_ci/test_results -v ENV:$1 -v VMS:$2 smoke_check_ci/tests
