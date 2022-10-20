#!/bin/bash
BBIP=$1
ENV=$2
CUST=$3
TEST_FOLDER="test-cases"

pabot --pabotlib --ordering order.txt -e integrations -L trace:info -v "qa burbank ip":$BBIP -v ENV:$ENV -V getvars.py:$CUST $TEST_FOLDER