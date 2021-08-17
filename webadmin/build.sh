#!/bin/bash

set -e

WEBADMIN_PACKAGE="webadmin.zip"

function build_skin() {
    SKIN=$1
    echo "Setting Skin to $SKIN"
    npm run setSkin $SKIN

    # Build webadmin.
    echo "Build webadmin" >&2
    npm run build-webadmin
    rm -rf static
    mv dist static
    cp -R static/scripts/* static/

    # Build the inline wizard
    pushd inline-wizard
    npm install
    npm run build
    cp -r dist/* ../static
    popd

    # Make translations
    echo "Create translations" >&2
    $SOURCE_DIR/localize.sh ..

    # Save the repository info.
    echo "Create version.txt" >&2
    REP_ROOT_DIR="$SOURCE_DIR/.."
    if [ -e "$REP_ROOT_DIR/.git" ]; then
        format="changeset: %H%nrefs: %D%nparents: %P%nauthor: %aN <%aE>%ndate: %ad%nsummary: %s"
        git -C "$REP_ROOT_DIR" show -s --format="$format" > static/version.txt
    else
        echo "git has not been detected in $REP_ROOT_DIR" && exit 1
    fi

    cat static/version.txt >&2

    mkdir -p "../built_skins/$SKIN"
    mv static/* "../built_skins/$SKIN"
}


SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Check prerequisites.
if [ "$SOURCE_DIR" = "$PWD" ]
then
    echo "Error: $0 must not be executed from the sources directory." >&2
    exit 1
fi

[ -e build_scripts ] && rm -rf build_scripts
[ -e front_end ] && rm -rf front_end
[ -e skins ] && rm -rf skins
[ -e translations ] && rm -rf translations

rsync -av --progress $SOURCE_DIR/../build_scripts .
rsync -av --progress $SOURCE_DIR/../skins .
rsync -av --progress $SOURCE_DIR/../translations .
rsync -av --progress $SOURCE_DIR/../front_end . --exclude node_modules --exclude dist --exclude .idea

if [ $IS_LOCAL ]
then
    echo "pip install requirements"
    [ ! -d "env" ] && virtualenv env -p python3
    . ./env/bin/activate
    pip install -r build_scripts/requirements.txt
fi

# Update sources.
echo "Update sources" >&2

pushd front_end

echo "Clean old directories" >&2
[ -e node_modules ] && rm -rf node_modules
[ -e static ] && rm -rf static
[ -e server-external ] && rm -rf server-external
[ -e "$WEBADMIN_PACKAGE" ] && rm "$WEBADMIN_PACKAGE"

# Install dependencies.
echo "Install node dependencies" >&2
npm install

echo "Iterate all skins"
for dir in ../skins/*/
do
    dir=${dir%*/}
    SKIN=${dir/..\/skins\//}
    build_skin $SKIN
    if [ -n "$LOCAL_ENV" ]; then
      break
    fi
done

#Pack
echo "Pack $WEBADMIN_PACKAGE" >&2
popd
zip -qq -r "$WEBADMIN_PACKAGE" built_skins/*

echo "Webadmin build done" >&2
