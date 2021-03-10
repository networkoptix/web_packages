#!/bin/bash

crowdin download -b cloud_20.1 --config crowdin-cloud-autotests.yaml --ignore-match $@
