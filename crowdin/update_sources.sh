#!/bin/bash

source current_branch.sh
crowdin upload sources -b "$CURRENT_BRANCH" --config config.yaml --debug "$@"
