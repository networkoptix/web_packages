#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

for lang_dir in ../translations/*
do
    lang_dir=${lang_dir%*/}
    LANG=${lang_dir/..\/translations\//}

    echo "../static/lang_$LANG/views/"

    mkdir -p ../static/lang_$LANG/views/

    echo "Copy default language.json"
    cp -rf ../static/language.json ../static/lang_$LANG/

    echo "Copy default views - with default language"
    cp -rf ../static/views/* ../static/lang_$LANG/views/

    echo "Overwrite them with localized sources"
    [ -e "$lang_dir/views/*" ] && cp -rf $lang_dir/views/* ../static/lang_$LANG/views/


    mkdir -p ../static/lang_$LANG/web_common/views/
    cp ../static/web_common/commonLanguage.json ../static/lang_$LANG/web_common/
    echo "Copy web_common default views - with default language"
    cp -rf ../static/web_common/views/* ../static/lang_$LANG/web_common/views/

    echo "Overwrite them with localized sources"
    [ -e $lang_dir/web_common/views ] && cp -rf $lang_dir/web_common/views/* ../static/lang_$LANG/web_common/views/

done

# echo "Generate language.json"
# python generate_languages_json.py
