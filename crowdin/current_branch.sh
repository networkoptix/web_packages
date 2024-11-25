#!/bin/bash

REPO="[cloud_portal]"
CURRENT_BRANCH="${REPO}$(git symbolic-ref --short HEAD)"
echo "Current branch is $CURRENT_BRANCH"
