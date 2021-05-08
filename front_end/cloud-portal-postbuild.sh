#!/bin/bash
IS_WEBADMIN=$1

mkdir ./dist/styles;
# target only main style
mv ./dist/*.css ./dist/styles;
sed -i -e 's/href="static\/styles\./href="static\/styles\/styles\./g' dist/index.html;

mv ./dist/*.js ./dist/scripts;
sed -i -e 's/src="static\//type="text\/javascript" src="static\/scripts\//g' dist/index.html;
rm dist/index.html-e;

# Webadmin specific actions
if [ $IS_WEBADMIN ]; then
    cp ./app/customization/webadmin_logo.png ./dist/images/logo.png
fi

./node_modules/.bin/ngsw-config ./dist ./ngsw-config.json "/static"
sed -i -e "s/static\/index.html/index.html/" dist/ngsw.json
