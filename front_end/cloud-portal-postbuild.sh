#!/bin/bash
IS_WEBADMIN=$1

mkdir ./dist/styles;
# target only main style
mv ./dist/*.css ./dist/styles;
sed -i -e 's/href="static\/styles\./href="static\/styles\/styles\./g' dist/index.html;

mv ./dist/languages.*.png ./dist/styles
mv ./dist/*.js ./dist/scripts;
sed -i -e 's/src="static\//type="text\/javascript" src="static\/scripts\//g' dist/index.html;

# Webadmin specific actions
if [ $IS_WEBADMIN ]; then
    cp ./app/customization/webadmin_logo.png ./dist/images/logo.png
fi
