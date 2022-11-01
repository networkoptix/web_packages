#!/bin/sh

BACKEND_DIR="cloud_portal/cloud"
FRONTEND_DIR="cloud_portal/front_end"

if git diff --cached --name-only | grep --quiet "$BACKEND_DIR"
then
    pushd cloud_portal
    printf "Activating python3.7 env\n\n"
    . ./env/bin/activate

    pushd cloud

    printf "Checking migrations\n\n"
    if ! python manage.py makemigrations --dry-run --check ; then echo Migration check failed && exit 1 ; fi

    printf "Running system check\n\n"
    if ! python manage.py check ; then echo System check failed && exit 1 ; fi
    popd
    popd
fi

# Check linting for the front_end
if git diff --name-only | grep --quiet "$FRONTEND_DIR"
then
    pushd $FRONTEND_DIR
    npm run node-modules
    npm run lint
    if [[ "$?" == '1' ]]
    then
        echo "Linting failed. Please fix the issue."
        return
    fi
    popd
fi

# Check for mentions of nx
BAN_LIST="[^[:alpha:]]nx\ |nxvms"
echo "Checking files for mentions of nx with the following patterns: ${BAN_LIST}"
branding=$(grep -Ei "$BAN_LIST" -rl --exclude-dir=fonts --exclude={\*.{swf,png,gif,spec.ts,mock.ts},{commonPasswordsList,downloads}.json} cloud_portal/front_end/app) || true
if [[ -z ${branding} ]]
then
    echo "No mentions were found"
else
    echo -e "\nError found mentions of Nx in the following files:"
    for mention in ${branding}
    do
        echo ${mention}
    done
    exit 1
fi
