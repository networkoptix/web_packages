#!/bin/bash
set -e

NODE_VERSION="18.15.0"
NPM_VERSION="9.5.0"

WEBADMIN_PACKAGE="webadmin.zip"
EXTERNAL_PACKAGE="external.dat"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Check prerequisites.
if [ "$SOURCE_DIR" = "$PWD" ]
then
    echo "Error: $0 must not be executed from the sources directory." >&2
    exit 1
fi

echo -e "\nRemoving folders..."
[ -e build_scripts ] && rm -rf build_scripts
[ -e front_end ] && rm -rf front_end
[ -e skins ] && rm -rf skins
[ -e translations ] && rm -rf translations
[ -e "$WEBADMIN_PACKAGE" ] && rm "$WEBADMIN_PACKAGE"
[ -e "$EXTERNAL_PACKAGE" ] && rm "$EXTERNAL_PACKAGE"

# Add v flag to see what's being copied.
echo -e "Copying folders..."
rsync -a $SOURCE_DIR/../build_scripts .
rsync -a $SOURCE_DIR/../skins .
rsync -a $SOURCE_DIR/../translations .
rsync -a $SOURCE_DIR/../front_end . --exclude static --exclude node_modules --exclude dist --exclude .idea
rsync -a $SOURCE_DIR/../open . --exclude static --exclude node_modules --exclude dist --exclude .idea
rsync -a $SOURCE_DIR/../open_candidate . --exclude static --exclude node_modules --exclude dist --exclude .idea

# Setup environment for dependencies
echo -e "\npip install requirements"
[ ! -d "env" ] && python3 -m venv env
. ./env/bin/activate
pip install -r build_scripts/requirements.txt

echo -e "\nRunning nodeenv..."
[ -e nenv ] && rm -rf nenv
nodeenv --node=$NODE_VERSION --npm=$NPM_VERSION nenv
. ./nenv/bin/activate
echo "Active Node.js: " && node -v
echo "Active npm: " && npm -v


pushd front_end
# Install dependencies.
echo -e "\nInstalling node modules w/ legacy deps ... as new npm is strict about it" >&2
npm ci

# Build webadmin.
echo -e "\nBuild webadmin" >&2
npm run build-webadmin
mv dist static

# Build skins - Specific the build dir. After the project changed it needs to be specified
npm run buildSkins ./static/styles

cp -R static/webadmin/. static/
cp -R static/setup-wizard/. static/
rm -rf static/{setup-wizard,webadmin}

# Make translations
echo -e "\nCreate front end translations **************" >&2
$SOURCE_DIR/localize.sh ..


# Save the repository info.
echo -e "\nCreate version.txt" >&2
REP_ROOT_DIR="$SOURCE_DIR/.."
if [ -e "$REP_ROOT_DIR/.git" ]; then
    format="changeset: %H%nrefs: %D%nparents: %P%nauthor: %aN <%aE>%ndate: %ad%nsummary: %s"
    git -C "$REP_ROOT_DIR" show -s --format="$format" > static/version.txt
else
    echo "git has not been detected in $REP_ROOT_DIR" && exit 1
fi

cat static/version.txt >&2

# Pack
echo -e "\nPack $WEBADMIN_PACKAGE" >&2
zip -qq -r "../$WEBADMIN_PACKAGE" ./static/
popd

echo -e "\nWebadmin build done" >&2
