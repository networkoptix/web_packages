#!/bin/bash
BBIP=$1
ENV=$2
TEST_FOLDER="test-cases"

pabot --pabotlib --ordering order.txt -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV --output first_pass_full.xml --log first_pass_log.html --report first_pass_report.html $TEST_FOLDER
pabot --pabotlib --ordering order.txt --rerunfailed first_pass_full.xml --output retry_failed.xml --log retry_failed_log.html --report retry_failed_report.html -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV $TEST_FOLDER
pabot --pabotlib --ordering order.txt --rerunfailed retry_failed.xml --output retry_failed_2nd_pass.xml --log retry_failed_2nd_log.html --report retry_failed_2nd_report.html -L trace -v "qa burbank ip":$BBIP -v ENV:$ENV $TEST_FOLDER
rebot --merge --output output.xml -r report.html -l log.html first_pass_full.xml retry_failed.xml retry_failed_2nd_pass.xml