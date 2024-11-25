#!/bin/bash

source current_branch.sh
crowdin upload translations -b "$CURRENT_BRANCH" --config config.yaml --debug --no-auto-approve-imported --no-import-eq-suggestions "$@"
