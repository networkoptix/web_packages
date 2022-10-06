#!/usr/bin/env sh

set -eux

FRONTEND_REVISION="${1:?First parameter must be a frontend revision}"

: "${API_TOKEN:?Provide manually or from Jenkins credentials}"

python3.8 -m venv venv
VENV_BIN_DIR=venv/bin

PYTHON="$VENV_BIN_DIR/python"
"$PYTHON" -m pip install -r requirements.txt --no-deps

set +e

BACKEND_REVISION='master'
DEPLOYMENT_JOB_URL=$("$PYTHON" -m 'request_cloud_deployment' "$BACKEND_REVISION" "$FRONTEND_REVISION")
CLOUD_HOST=$("$PYTHON" -m 'wait_for_cloud' "$DEPLOYMENT_JOB_URL")
if [ ! "$CLOUD_HOST" ]; then
  echo >&2 "Failed to deploy cloud with backend revision '$BACKEND_REVISION'" \
    "and frontend revision '$FRONTEND_REVISION'"
  CLOUD_HOST=$("$PYTHON" -m 'get_cloud_host' "$DEPLOYMENT_JOB_URL")
  if [ ! "$CLOUD_HOST" ]; then
    echo >&2 "Cloud is not deployed. There is nothing to remove"
    exit 1
  fi

  set -e

  echo >&2 "Remove failed deployment '$CLOUD_HOST'"
  "$PYTHON" -m 'remove_cloud' "$CLOUD_HOST"
  exit 1
fi

PABOT="$VENV_BIN_DIR/pabot"
"$PABOT" --pabotlib --processes 4 -e integrations -L trace:info \
  -v ENV:"https://$CLOUD_HOST" -i 'smoke' 'test-cases'
TESTS_RESULT_CODE=$?

# BUILD_URL is an environment variable provided by Jenkins.
"$PYTHON" -m 'post_run_status' "$FRONTEND_REVISION" "$TESTS_RESULT_CODE" "$BUILD_URL"

set -e

"$PYTHON" -m 'remove_cloud' "$CLOUD_HOST"
