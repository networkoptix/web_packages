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
[ -e package.zip ] || { echo >&2 "Missing customization package.zip, if building locally move package.zip into build folder"; exit 1; }

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

echo "Copy customization resources"
customization_files=(
    'webadmin_config.json'
    'webadmin_config.js'
    'webadmin_logo.png'
    'description.json'
    'welcome_page_logo.png'
    'welcome_page_logo@2x.png'
)

# Prepend and append each filename with *
customization_files=("${customization_files[@]/#/*}")
customization_files=("${customization_files[@]/%/*}")
unzip -oj package.zip "${customization_files[@]}" -d front_end/app/customization

mv front_end/app/customization/webadmin_logo.png front_end/app/images/logo.png
mv front_end/app/customization/welcome_page_logo* front_end/app/images

echo "Copy customization to setup wizard"
[ ! -d front_end/inline-wizard/customization ] && mkdir -p front_end/inline-wizard/customization
cp -r front_end/app/customization/* front_end/inline-wizard/customization

# Update sources.
echo "Update sources" >&2

pushd front_end

echo "Copying language from description -> webadmin_config"
python $SOURCE_DIR/add_lang_to_webadmin.py

echo "Clean old directories" >&2
[ -e node_modules ] && rm -rf node_modules
[ -e static ] && rm -rf static
[ -e server-external ] && rm -rf server-external
[ -e external.dat ] && rm external.dat

# Install dependencies.
echo "Install node dependencies" >&2
npm install

SKIN=$(python $SOURCE_DIR/get_skin.py)
echo "Setting Skin to $SKIN"
npm run setSkin $SKIN

# Build webadmin.
echo "Build webadmin" >&2
npm run build-webadmin
mv dist static
cp -R static/scripts/. static/

# Build the inline wizard
pushd inline-wizard
npm install
npm run build
cp -r dist/* ../static
popd

# Make translations
echo "Create translations" >&2
$SOURCE_DIR/localize.sh ..

echo "Replacing static names in language_compiled.json"
find . -name "language_compiled.json" | xargs python $SOURCE_DIR/replace_static.py

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

echo "Webadmin build done" >&2
