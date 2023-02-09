#!/usr/bin/env sh

set -eux

FRONTEND_REVISION="${1:?First parameter must be a frontend revision}"

: "${API_TOKEN:?Provide manually or from Jenkins credentials}"

if [ -n "${MERGE_REQUEST_ACTION+x}" ]; then
  case "$MERGE_REQUEST_ACTION" in
    open|reopen|update) ;;
    close|approved|unapproved|approval|unapproval|merge)
      echo "Merge request action is '$MERGE_REQUEST_ACTION'. No need to run tests"
      exit 0
      ;;
    *)
      echo >&2 "Unknown merge request action: '$MERGE_REQUEST_ACTION'"
      exit 1
      ;;
  esac
fi

if [ -n "${$MERGE_REQUEST_SOURCE_WEB_URL+x}" ]; then
  echo "Testing changes to merge from the repository $MERGE_REQUEST_SOURCE_WEB_URL"
fi

python3.8 -m venv venv
VENV_BIN_DIR=venv/bin

PYTHON="$VENV_BIN_DIR/python"
"$PYTHON" -m pip install -r requirements.txt

GOOGLE_CHROME_DIR="$(./prepare_google_chrome.sh)"

set +e

BACKEND_REVISION='master'
DEPLOYMENT_JOB_URL=$("$PYTHON" -m 'request_cloud_deployment' "$BACKEND_REVISION" "$FRONTEND_REVISION")
CLOUD_HOST=$("$PYTHON" -m 'wait_for_cloud' "$DEPLOYMENT_JOB_URL")
if [ ! "$CLOUD_HOST" ]; then
  echo >&2 "Failed to deploy cloud with backend revision '$BACKEND_REVISION'" \
    "and frontend revision '$FRONTEND_REVISION'"

  echo >&2 "Checking if something is left and whether it needs to be removed"
  ATTEMPTS_LEFT=5
  while true; do
    CLOUD_HOST=$("$PYTHON" -m 'get_cloud_host' "$DEPLOYMENT_JOB_URL")
    if [ "$CLOUD_HOST" ]; then
      break
    fi

    ATTEMPTS_LEFT=$((ATTEMPTS_LEFT - 1))
    if [ "$ATTEMPTS_LEFT" -eq 0 ]; then
      break
    fi

    echo >&2 "Failed to get cloud host. Wait a second before trying again"
    sleep 1
  done

  if [ ! "$CLOUD_HOST" ]; then
    echo >&2 "Cloud is not deployed. There is nothing to remove"
    exit 1
  fi

  set -e

  echo >&2 "Remove failed deployment '$CLOUD_HOST'"
  "$PYTHON" -m 'remove_cloud' "$CLOUD_HOST"
  exit 1
fi

LETSENCRYPT_STAGE_CERT_REQUIRED=1 \
  PATH="$GOOGLE_CHROME_DIR:$VENV_BIN_DIR:$PATH" \
  pabot --pabotlib --ordering order.txt --processes 4 -L trace:info \
  -v ENV:"https://$CLOUD_HOST" \
  -v "FROM EMAIL DEFAULT":True \
  --listener NoptixLibrary/FeatureFlagListener.py \
  -i 'ci' \
  -v cust:ci \
  'test-cases' \
TESTS_RESULT_CODE=$?

# BUILD_URL is an environment variable provided by Jenkins.
"$PYTHON" -m 'post_run_status' "$FRONTEND_REVISION" "$TESTS_RESULT_CODE" "$BUILD_URL"

set -e

"$PYTHON" -m 'remove_cloud' "$CLOUD_HOST"
