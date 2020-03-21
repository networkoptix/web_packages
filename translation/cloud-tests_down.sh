#!/bin/bash

crowdin download -b cloud_19.3 --config crowdin-cloud-autotests.yaml --ignore-match $@
