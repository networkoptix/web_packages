#!/bin/bash
IS_WEBADMIN=$1

rm ./dist/styles/*.scss;
[ -e ./dist/styles/native-theme ] && rm -rf ./dist/styles/native-theme
# target only main style
mv ./dist/*.css ./dist/styles;
sed -i -e 's/href="static\//href="static\/styles\//g' dist/index.html;

mv ./dist/*.js ./dist/scripts;
sed -i -e 's/src="static\//type="text\/javascript" src="static\/scripts\//g' dist/index.html;
[ -e dist/index.html-e ] && rm dist/index.html-e;

# Webadmin specific actions
if [ $IS_WEBADMIN ]; then
    cp ./app/customization/webadmin_logo.png ./dist/images/logo.png
else
    cp ./dist/index.html ./dist/index.mustache.html
    sed -i -d 's/<title><\/title>/<title>{{title}}<\/title>/g'
    sed -i -e 's/<meta name="description" content="">/{% for property, value in meta %}<meta name="{{property}}" content="{{value}}" property="og:{{property}}">{% endfor %}/' ./dist/index.mustache.html
fi

./node_modules/.bin/ngsw-config ./dist ./ngsw-config.json "/static"
sed -i -e "s/static\/index.html/index.html/" dist/ngsw.json
