#!/usr/bin/env sh

set -eux

FRONTEND_REVISION="${1:?First parameter must be a frontend revision}"

: "${API_TOKEN:?Provide manually or from Jenkins credentials}"

set +e

BACKEND_REVISION='master'
DEPLOYMENT_JOB_URL=$(python3 -m 'request_cloud_deployment' "$BACKEND_REVISION" "$FRONTEND_REVISION")
CLOUD_HOST=$(python3 -m 'wait_for_cloud' "$DEPLOYMENT_JOB_URL")
if [ ! "$CLOUD_HOST" ]; then
  echo >&2 "Failed to deploy cloud with backend revision '$BACKEND_REVISION'" \
    "and frontend revision '$FRONTEND_REVISION'"
  CLOUD_HOST=$(python3 -m 'get_cloud_host' "$DEPLOYMENT_JOB_URL")
  if [ ! "$CLOUD_HOST" ]; then
    echo >&2 "Cloud is not deployed. There is nothing to remove"
    exit 1
  fi

  set -e

  echo >&2 "Remove failed deployment '$CLOUD_HOST'"
  python3 -m 'remove_cloud' "$CLOUD_HOST"
  exit 1
fi

pabot --pabotlib --processes 4 -e integrations -L trace:info \
  -v ENV:"https://$CLOUD_HOST" -i 'smoke' 'test-cases'
TESTS_RESULT_CODE=$?

# BUILD_URL is an environment variable provided by Jenkins.
python3 -m 'post_run_status' "$FRONTEND_REVISION" "$TESTS_RESULT_CODE" "$BUILD_URL"

set -e

python3 -m 'remove_cloud' "$CLOUD_HOST"
