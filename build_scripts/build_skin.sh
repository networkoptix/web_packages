#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

TARGET_DIR="../cloud/static/_source"
SKIN=$1
if [ -z "$SKIN" ]
then
    SKIN="blue"
fi

dir=../skins/$SKIN

pushd ../front_end
    npm run setSkin $SKIN
popd


echo "------------------------------------------------------------"
echo
echo "Building templates - for each language"
echo

mkdir -p $TARGET_DIR/$SKIN/templates/

for lang_dir in ../translations/*/
do
    lang_dir=${lang_dir%*/}
    LANG=${lang_dir/..\/translations\//}

    if [ -n "$LOCAL_ENV_ENG_ONLY" ] && [ "$LANG" != "en_US" ]; then
      continue
    fi

    echo "$TARGET_DIR/$SKIN/templates/lang_$LANG"

    mkdir -p $TARGET_DIR/$SKIN/templates/lang_$LANG/src

    echo "Copy template sources - with default language"
    cp -rf ../cloud/notifications/static/templates/* $TARGET_DIR/$SKIN/templates/lang_$LANG/src/

    echo "Overwrite them with localized sources"
    cp -rf $lang_dir/templates/* $TARGET_DIR/$SKIN/templates/lang_$LANG/src/ || true

    echo "Copy custom styles"
    cp $dir/front_end/styles/_custom_palette.scss $TARGET_DIR/$SKIN/templates/lang_$LANG/src/

    pushd $TARGET_DIR/$SKIN/templates/lang_$LANG/src
    python preprocess.py
    popd

    echo "Clean sources"
    rm -rf $TARGET_DIR/$SKIN/templates/lang_$LANG/src
    echo
done
echo "Templates success"

echo "------------------------------------------------------------"
echo "Localization - portal"
echo

for lang_dir in ../translations/*/
do
    lang_dir=${lang_dir%*/}
    LANG=${lang_dir/..\/translations\//}

    if [ -n "$LOCAL_ENV_ENG_ONLY" ] && [ "$LANG" != "en_US" ]; then
      continue
    fi

    echo "$TARGET_DIR/$SKIN/static/lang_$LANG/views/"

    mkdir -p $TARGET_DIR/$SKIN/static/lang_$LANG/views

    echo "Copy default views - with default language"
    cp -rf $TARGET_DIR/$SKIN/static/views $TARGET_DIR/$SKIN/static/lang_$LANG

    echo "Overwrite them with localized sources"
    cp -rf $lang_dir/views $TARGET_DIR/$SKIN/static/lang_$LANG || true

    if [ "$SKIN" = "blue" ] ; then
        echo "********* Generate (skin) language file *********"
        pushd $TARGET_DIR/$SKIN
        python ../../../../build_scripts/generate_language_compiled_json.py $LANG
        popd

        pushd ../front_end
            npm run test-lang $TARGET_DIR/$SKIN
        popd
    else
        echo "Copy language.json from blue skin"
        cp $TARGET_DIR/blue/static/lang_$LANG/language_compiled.json $TARGET_DIR/$SKIN/static/lang_$LANG/language_compiled.json
    fi

    echo

done

# TODO: scheduled for removing (if no issues) as language.json is not used anymore (except inline-wizard)
#    pushd $TARGET_DIR/$SKIN
#    python ../../../../build_scripts/generate_languages_json.py
#    popd

rm -rf $TARGET_DIR/$SKIN/static/views
echo "Localization success"

echo "$SKIN Done"

# say "Cloud portal build is finished"
