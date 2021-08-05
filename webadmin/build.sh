#!/bin/bash

set -e

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

# Add v flag to see what's being copied.
rsync -a --progress $SOURCE_DIR/../build_scripts .
rsync -a --progress $SOURCE_DIR/../skins .
rsync -a --progress $SOURCE_DIR/../translations .
rsync -a --progress $SOURCE_DIR/../front_end . --exclude node_modules --exclude dist --exclude .idea

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
[ -e external.dat ] && rm external.dat

# Install dependencies.
echo "Install node dependencies" >&2
npm install

# Build webadmin.
echo "Build webadmin" >&2
npm run build-webadmin
mv dist static
cp -R static/scripts/. static/

# Build skins
npm run buildSkins

# Build the inline wizard for each skin
pushd inline-wizard
    npm install
popd
echo "Iterate all skins"
echo $PWD
for dir in ../skins/*/
do
    dir=${dir%*/}
    SKIN=${dir/..\/skins\//}
    npm run setSkin $SKIN
    pushd inline-wizard
        npm run build
        mkdir -p ../static/setup_$SKIN
        cp -r dist/* ../static/setup_$SKIN

        if [ "$SKIN" == "blue"]; then
            cp -r dist/* ../static
        fi
    popd
    if [ -n "$LOCAL_ENV" ]; then
      break
    fi
done

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

#Pack
echo "Pack external.dat" >&2
zip -qq -r "../external.dat" ./static
popd

# Temporary until we have cmake support from the vms side. Bundle is only default.
./customize_package.sh
echo "Webadmin build done" >&2
