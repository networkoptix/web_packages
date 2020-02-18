#!/bin/bash
# . ./run_load_test.sh <python file=$1>locustfile.py <# slaves=$2>20 <# users=$3>200 <# ramp per sec=$4>20 <run for=$5>10m  
locust -f $1 --master --host=http://localhost:5000  --no-web -c $3 -r $4 --run-time $5 --stop-timeout 99 --csv=$1 --expect-slaves $2 &> $1.log &
for (( i=1; i<$2; i++ )); 
do
    locust -f $1 --slave & 
done
locust -f $1 --slave