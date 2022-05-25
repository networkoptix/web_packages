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

pabot --pabotlib --ordering order.txt -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV --output first_pass_full.xml --log first_pass_log.html --report first_pass_report.html $SUITES
pabot --pabotlib --ordering order.txt --rerunfailed first_pass_full.xml --output retry_failed.xml --log retry_failed_log.html --report retry_failed_report.html -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV $SUITES
pabot --pabotlib --ordering order.txt --rerunfailed retry_failed.xml --output retry_failed_2nd_pass.xml --log retry_failed_2nd_log.html --report retry_failed_2nd_report.html -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV $SUITES
rebot --merge --output output.xml -r report.html -l log.html first_pass_full.xml retry_failed.xml retry_failed_2nd_pass.xml