#!/bin/bash
BBIP=$1
ENV=$2
TEST_FOLDER="test-cases"
SUITES=""
PARAMS=$@
for item in "$@"; do
    if [ $item = $BBIP ]
    then
        continue
    elif [ $item = $ENV ]
    then
        continue
    else
        SUITES+="$TEST_FOLDER/$item "
    fi
done

pabot --pabotlib --ordering order.txt -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV $SUITES