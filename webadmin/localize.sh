#!/bin/bash
BUILD_DIR="$(pwd)"
REPO_DIR="$1"
pushd $REPO_DIR
    for lang_dir in translations/*/
    do
        lang_dir=${lang_dir%*/}
        LANG=${lang_dir/translations\//}
        echo $lang_dir

        echo "$BUILD_DIR/static/lang_$LANG/views/"

        mkdir -p $BUILD_DIR/static/lang_$LANG/views

        echo "Copy default views - with default language"
        [ -e $BUILD_DIR/static/views ] && cp -rf $BUILD_DIR/static/views $BUILD_DIR/static/lang_$LANG

        echo "Overwrite them with localized sources"
        echo $BUILD_DIR/$REPO_DIR/$lang_dir/views
        echo $BUILD_DIR/static/lang_$LANG
        pwd
        cp -rf $BUILD_DIR/$REPO_DIR/$lang_dir/views $BUILD_DIR/static/lang_$LANG || true

        echo "********* Generate webadmin language file *********"
        pushd $BUILD_DIR
            python $REPO_DIR/build_scripts/generate_language_compiled_json.py $LANG
        popd
        echo
    done

    echo -e "\n********* Generate languages json *********"
    pushd $BUILD_DIR
        python $REPO_DIR/build_scripts/generate_languages_json.py
    popd
popd
