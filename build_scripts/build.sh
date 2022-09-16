#!/bin/bash
set -e

NODE_VERSION="16.13.1"
NPM_VERSION="8.1.2"

function build_frontend () {
    echo "Building front_end"
    echo "Build statics"
    pushd ../front_end
        BUILD=${VERSION//*.}
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's@{{BUILD}}@'"$BUILD"'@g' ./src/app/services/nx-config/config.ts
        else
            sed -i 's@{{BUILD}}@'"$BUILD"'@g' ./src/app/services/nx-config/config.ts
        fi

        npm run build
        mkdir -p dist/skins
        npm run buildSkins dist/skins
        rm -rf dist/front_end/src
        rm -rf dist/front_end/customization
        # Save the repository info.
        echo -e "\nCreate version.txt"
        if [ -e "$PORTAL_REPOSITORY/.git" ]; then
            git -C "$PORTAL_REPOSITORY" log -n 1 > dist/version.txt
            git -C "$PORTAL_REPOSITORY" rev-parse --abbrev-ref HEAD | xargs echo 'Branch:' >> dist/version.txt
        else
            echo "Neither git nor hg has been detected in $2" && exit 1
        fi
        cat dist/version.txt
    popd
}

function move_fonts_and_help() {
    echo -e "\nMove fonts and help - $SOURCE_DIR"
    rm -rf $SOURCE_DIR/../common || true
    mkdir -p $SOURCE_DIR/../common/static
    mv ../front_end/dist/fonts $SOURCE_DIR/../common/static/fonts
    cp -R ../help $SOURCE_DIR/../common/static/help

    rm -rf ../front_end/dist/fonts || true
}
#DIR is the location of the cloud_portal build script in the repository
#Can be called like this from with build_scripts "./build.sh"
# or from cloud_portal "./build_scripts/build.sh"
#or like this from outside the repository "../build_scripts/build.sh"

PORTAL_REPOSITORY="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."
[[ "$PORTAL_REPOSITORY" =~ (.*\/cloud_portal).* ]]; REPO=${BASH_REMATCH[1]}

#If we are not using the repository we should update necessary files
if [[ ! $PWD =~ $REPO ]]; then
    echo -e "\nUpdating Cloud Portal sources"
    rsync -pr --exclude="robot_tests" --exclude="env" --exclude="node_modules" $PORTAL_REPOSITORY .
else
    echo -e "\nIn repository skip copying sources *************"
fi

echo -e "\npip install requirements"
[ ! -d "env" ] && python3 -m venv env
. ./env/bin/activate
pip install setuptools==56.0.0
pip install wheel==0.37.0
pip install -r $PORTAL_REPOSITORY/build_scripts/requirements.txt

echo -e "\nrunning nodeenv..."
[ -e nenv ] && rm -rf nenv
nodeenv --node=$NODE_VERSION --npm=$NPM_VERSION nenv
. ./nenv/bin/activate
echo "Active Node.js: " && node -v
echo "Active npm: " && npm -v

cd $PORTAL_REPOSITORY

pushd front_end
    echo -e "\nnpm ci cloud portal"
    echo "Installing node modules w/ legacy deps ... as new npm is strict about it"
    npm ci

#     echo "Auditing npm packages"
#     AUDIT=$(npm audit | grep -E "(High)" || true)
#     if [[ "$AUDIT" != "" ]]
#     then
#         echo "Some npm packages are out of date. Please notify the webteam."
#         exit 1
#     fi
popd

pushd cloud
    echo -e "\nnpm ci cloud portal backend"
    npm ci
popd

pushd build_scripts

TARGET_DIR="../cloud/static"
SOURCE_DIR="$TARGET_DIR/_source"
FRONT_END_DIST="../front_end/dist"

echo "Clear $TARGET_DIR"
rm -rf $TARGET_DIR
echo -e "\nCreate $TARGET_DIR"
mkdir -p $SOURCE_DIR


echo "------------------------------------------------------------"
build_frontend
move_fonts_and_help
echo -e "\nBuilding front_end finished"

echo -e "\nIterate all skins"
for dir in ../skins/*/
do
    dir=${dir%*/}
    SKIN=${dir/..\/skins\//}

    echo "Move front_end to destination"
    mkdir -p $SOURCE_DIR/$SKIN
    mv $FRONT_END_DIST/skins/$SKIN.css $FRONT_END_DIST/styles/skin.css
    rsync -a $FRONT_END_DIST/* $SOURCE_DIR/$SKIN/static --exclude="$FRONT_END_DIST/skins"
    cp -R $SOURCE_DIR/$SKIN/static/scripts/. $SOURCE_DIR/$SKIN/static/

    ./build_skin.sh $SKIN $PORTAL_REPOSITORY
    if [ -n "$LOCAL_ENV" ]; then
      break
    fi
done

cp ../cloud/cloud/cloud_portal.yaml $SOURCE_DIR

BAN_LIST="^nx\ |nxvms"
echo -e "\nChecking files for mentions of nx with the following patterns: ${BAN_LIST}"
branding=$(grep -Ei "$BAN_LIST" -rl --exclude-dir=fonts --exclude={\*.{swf,png,gif},{commonPasswordsList,downloads}.json} ${SOURCE_DIR}) || true
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

echo -e "\n*******************************************"
echo -e "***   Cloud portal build is finished"   ***
echo -e "*******************************************"
