#!/bin/bash
BBIP=$1
ENV=$2
TEST_FOLDER="test-cases"

pabot --pabotlib --ordering order.txt -e integrations -L trace:info -v "qa burbank ip":$BBIP -v ENV:$ENV $TEST_FOLDER