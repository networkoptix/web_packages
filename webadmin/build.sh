#!/bin/bash

set -e

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
# Check prerequisites.
if [ "$SOURCE_DIR" = "$PWD" ]
then
    echo "Error: $0 must not be executed from the sources directory." >&2
    exit 1
fi

pushd $SOURCE_DIR
echo "pip install requirements"
[ ! -d "env" ] && virtualenv env -p python3.7
. ./env/bin/activate
pip install -r build_scripts/requirements.txt
popd

# Update sources.
echo "Update sources" >&2
for entry in $(ls -A "$SOURCE_DIR/front_end")
do
    [ -e "$entry" ] && rm -r "$entry"
    cp -pr "$SOURCE_DIR/front_end/$entry" "$entry"
done

echo "Clean old directories" >&2
[ -e static ] && rm -r static
[ -e server-external ] && rm -r server-external
[ -e external.dat ] && rm external.dat

# Install dependencies.
echo "Install node dependencies" >&2
npm install

# Build webadmin.
echo "Build webadmin" >&2
npm run build-webadmin
mv dist static

# Make translations
echo "Create translations" >&2
$SOURCE_DIR/webadmin/localize.sh $SOURCE_DIR

# Save the repository info.
echo "Create version.txt" >&2
REP_ROOT_DIR="$SOURCE_DIR/.."
if [ -d "$REP_ROOT_DIR/.git" ]; then
    format="changeset: %H%nrefs: %D%nparents: %P%nauthor: %aN <%aE>%ndate: %ad%nsummary: %s"
    git -C "$REP_ROOT_DIR" show -s --format="$format" > static/version.txt
else
    echo "git has not been detected in $REP_ROOT_DIR" && exit 1
fi

cat static/version.txt >&2

#Pack
echo "Pack external.dat" >&2
zip -r external.dat ./static
mkdir -p ./server-external/bin
mv external.dat server-external/bin/external.dat

echo "Webadmin build done" >&2
