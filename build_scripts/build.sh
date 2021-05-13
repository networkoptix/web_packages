#!/bin/bash
set -e

#DIR is the location of the cloud_portal build script in the repository
#Can be called like this from with cloud_portal/build_scripts "./build.sh"
# or from cloud_portal "./build_scripts/build.sh"
#or like this from outside the repository "../nx_vms/cloud_portal/build_scripts/build.sh"

VMS_REPOSITORY="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../.."
[[ "$VMS_REPOSITORY" =~ (.*)\/cloud_portal.* ]]; REPO=${BASH_REMATCH[1]}

#If we are not using the repository we should update necessary files
if [[ ! $PWD =~ $REPO ]]; then
    echo "Updating Cloud Portal sources"
    if [ -e "cloud_portal" ]; then
        pushd cloud_portal
            for entry in $(ls -A $VMS_REPOSITORY/cloud_portal/)
            do
                if [ "$entry" == "robot_tests" ]; then
                    continue
                fi

                if [ "$entry" == "front_end" ] ; then
                    pushd $entry
                    for element in $(ls -A $VMS_REPOSITORY/cloud_portal/$entry/)
                    do
                        echo "copy $entry/$element"
                        [ -e "$element" ] && rm -rf "$element"
                        cp -pr "$VMS_REPOSITORY/cloud_portal/$entry/$element" "$element"
                    done
                    popd
                else
                    echo "copy $entry"
                    [ -e "$entry" ] && rm -rf "$entry"
                    cp -pr "$VMS_REPOSITORY/cloud_portal/$entry" "$entry"
                fi
            done
        popd
    else
        echo "Blindly Copying cloud_portal"
        rsync -pr --exclude="robot_tests" $VMS_REPOSITORY/cloud_portal .
    fi
    pushd cloud_portal
else
    echo "In repository skip copying sources"
    pushd $VMS_REPOSITORY/cloud_portal
fi

echo "pip install requirements"
[ ! -d "env" ] && virtualenv env -p python3
. ./env/bin/activate
pip install -r build_scripts/requirements.txt


pushd front_end
    echo "npm install cloud portal"
    npm install

    echo "Auditing npm packages"
    AUDIT=$(npm audit | grep -E "(High)" || true)
    if [[ "$AUDIT" != "" ]]
    then
        echo "Some npm packages are out of date. Please notify the webteam."
        exit 1
    fi
popd

pushd cloud
    echo "npm install cloud portal backend"
    npm install
popd

pushd build_scripts

TARGET_DIR="../cloud/static"

echo "Clear $TARGET_DIR"
rm -rf $TARGET_DIR
echo "Create $TARGET_DIR"
mkdir -p $TARGET_DIR


echo "Iterate all skins"
for dir in ../skins/*/
do
    dir=${dir%*/}
    SKIN=${dir/..\/skins\//}
    ./build_skin.sh $SKIN $VMS_REPOSITORY
    if [ -n "$LOCAL_ENV" ]; then
      break
    fi
done

cp ../cloud/cloud/cloud_portal.yaml $TARGET_DIR/_source

BAN_LIST="^nx\ |nxvms"
echo "Checking files for mentions of nx with the following patterns: ${BAN_LIST}"
branding=$(grep -Ei "$BAN_LIST" -rl --exclude-dir=fonts --exclude={\*.{swf,png,gif},{commonPasswordsList,downloads}.json} ${TARGET_DIR}/_source) || true
if [[ -z ${branding} ]]
then
    echo "No mentions were found"
else
    echo -e "\nError found mentions of Nx in the following files:"
    for mention in ${branding}
    do
        echo ${mention}
    done
    echo -e "\nPlease notify Boris and Web Team!"
    exit 1
fi

echo "Checking mustache templates"
if ! python check_mustache_templates.py; then
    echo "There were template translation errors. Please notify the web team and Boris"
    # exit 1 # Will add way to notify admins
else
    echo "No template errors"
fi

echo "Cloud portal build is finished"
