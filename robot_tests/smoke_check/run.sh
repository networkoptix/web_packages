#!/bin/bash

pabot --processes 5 --outputdir smoke_check/test_results -v ENV:$1 smoke_check/tests
