#!/bin/bash
IS_WEBADMIN=$1

if [ "$IS_WEBADMIN" = true ]; then
    mv ./dist/webadmin/* ./dist/
    cp -R ./dist/setup-wizard/* ./dist/
else
    BUILD=${VERSION//*.}
    echo "BUILD: $BUILD"

    for main_bundle in ./dist/**/main.*.js;
    do
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' 's@{{BUILD}}@'"$BUILD"'@g' "$main_bundle"
        else
            sed -i 's@{{BUILD}}@'"$BUILD"'@g' "$main_bundle"
        fi
    done
    mv ./dist/front_end/* ./dist/
fi

rm ./dist/styles/*.scss;
[ -e ./dist/styles/native-theme ] && rm -rf ./dist/styles/native-theme
# target only main style
mv ./dist/*.css ./dist/styles;
sed -i -e 's/href="static\/styles\./href="static\/styles\/styles\./g' dist/index.html;

[ -e dist/index.html-e ] && rm dist/index.html-e;

# Webadmin specific actions
if [ $IS_WEBADMIN ]; then
  echo "Nothing to see here"
#    cp ./common/customization/webadmin_logo.png ./dist/images/logo.png
else
    cp ./dist/index.html ./dist/index.mustache.html
    sed -i -d 's/<title><\/title>/<title>{{title}}<\/title>/' ./dist/index.mustache.html
    sed -i -e 's/<meta name="description" content="">/{% for property, value in meta %}<meta name="{{property}}" content="{{value}}" property="og:{{property}}">{% endfor %}/' ./dist/index.mustache.html
fi

./node_modules/.bin/ngsw-config ./dist ./ngsw-config.json "/static"
sed -i -e "s/static\/index.html/index.html/" dist/ngsw.json
