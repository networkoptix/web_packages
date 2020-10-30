#!/bin/bash

pabot --pabotlib --outputdir smoke_check/test_results -v ENV:$1 -v VMS:$2 smoke_check/tests
