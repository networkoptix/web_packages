#!/bin/bash

source current_branch.sh
crowdin download -b "$CURRENT_BRANCH" --config config.yaml --debug "$@"
