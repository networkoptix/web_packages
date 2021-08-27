#!/bin/bash

set -e

SKIN=$1

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Clean old directories" >&2
[ -e static ] && rm -r static

# Install dependencies.
echo "Install node dependencies" >&2
npm install

# Build webadmin.
echo "Build webadmin" >&2
npm run build
mv dist static

# Make translations
echo "Create translations" >&2
pushd translation
    ./localize.sh
popd

echo Copying static files from $SOURCE_DIR/static/* to $SOURCE_DIR/../../cloud/static/_source/$SKIN/static
cp -rf $SOURCE_DIR/static/* $SOURCE_DIR/../../cloud/static/_source/$SKIN/static
