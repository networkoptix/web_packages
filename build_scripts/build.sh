#!/bin/bash
set -e

NODE_VERSION="18.19.1"
NPM_VERSION="10.2.4"

BUILD_NUMBER=${BUILD_NUMBER:-0}
VERSION="23.3.0.$BUILD_NUMBER"


function build_frontend () {
    echo "Building front_end"
    echo "Build statics"
    pushd ../front_end
        npm run build

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's#<head>#<head><base href='\/static/nx-components-storybook\/'>#' ./dist/nx-components-storybook/index.html
        else
            sed -i 's#<head>#<head><base href='\/static/nx-components-storybook\/'>#' ./dist/nx-components-storybook/index.html
        fi

        mkdir -p dist/skins
        npm run buildSkins dist/skins
        rm -rf dist/front-end
        # Save the repository info.
        echo -e "\nCreate version.txt"
        if [ -e "$PORTAL_REPOSITORY/.git" ]; then
            echo "build ${VERSION}" >> dist/version.txt
            git -C "$PORTAL_REPOSITORY" log --format="commit %H%nDate: %cd" -n 1 >> dist/version.txt
            git -C "$PORTAL_REPOSITORY" rev-parse --abbrev-ref HEAD | xargs echo 'Branch:' >> dist/version.txt
        else
            echo "Neither git nor hg has been detected in $PORTAL_REPOSITORY" && exit 1
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
    rsync -pr --exclude="robot_tests" --exclude="env*" --exclude=".venv*" --exclude="node_modules" $PORTAL_REPOSITORY .
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

echo -e "\nBuild the base skin"
BASE_SKIN="blue"

# Step vars to make file path manipulation more readable
SOURCE_SKIN="$SOURCE_DIR/$BASE_SKIN"
SOURCE_SKIN_STATIC="$SOURCE_SKIN/static"
WELL_KNOWN="$SOURCE_SKIN_STATIC/.well-known"
APPLE_MOBILE="$SOURCE_SKIN_STATIC/apple-app-site-association"
ANDROID_MOBILE="$SOURCE_SKIN_STATIC/assetlinks.json"

echo "Move front_end to destination"
mkdir -p $SOURCE_DIR/$BASE_SKIN
cp $FRONT_END_DIST/skins/$BASE_SKIN.css $FRONT_END_DIST/styles/skin.css
rsync -a $FRONT_END_DIST/* $SOURCE_DIR/$BASE_SKIN/static --exclude="$FRONT_END_DIST/skins"
cp -R $SOURCE_DIR/$BASE_SKIN/static/scripts/. $SOURCE_DIR/$BASE_SKIN/static/

mkdir "$WELL_KNOWN"
[ -e "$APPLE_MOBILE" ] && mv "$APPLE_MOBILE" "$WELL_KNOWN"
[ -e "$ANDROID_MOBILE" ] && mv "$ANDROID_MOBILE" "$WELL_KNOWN"

./build_skin.sh
# Hard coding because we aren't adding more colors.
SKINS="orange green blue" # Skin order is reversed because the other skins copy from blue.
echo "Copy the other skins"
for SKIN in $SKINS; do
    if [ "$SKIN" != "$BASE_SKIN" ]; then
        mkdir -p $SOURCE_DIR/$SKIN
        cp -R $SOURCE_DIR/$BASE_SKIN/* $SOURCE_DIR/$SKIN
        cp $SOURCE_DIR/$SKIN/static/skins/$SKIN.css $SOURCE_DIR/$SKIN/static/styles/skin.css
        cp -R $PORTAL_REPOSITORY/skins/$SKIN/front_end/images $SOURCE_DIR/$SKIN/static/images
    fi

    BRAND_CORE=$(python extract_brand_core_value.py $PORTAL_REPOSITORY/skins/$SKIN/front_end/styles/_custom_palette.scss)
    find $SOURCE_DIR/$SKIN/templates -name "*.mustache" -exec sed -i.bak "s/cyan/$BRAND_CORE/g" {} \;

    echo "Clean sources for $SKIN"
    rm -rf $SOURCE_DIR/$SKIN/templates/*/src $SOURCE_DIR/$SKIN/templates/*/*.bak
    echo
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

    # This seems to have been broken for a while. There are mentions on release branches and on develop. For some reason only on this branch it actually catches them.
    # exit 1
fi

echo "Checking mustache templates"
if ! python check_mustache_templates.py; then
    echo "There were template translation errors. Please notify the web team and Boris"
    # exit 1 # Will add way to notify admins
else
    echo "No template errors"
fi

echo -e "\n*******************************************"
echo -e "***   Cloud portal build is finished   ***"
echo -e "*******************************************"
