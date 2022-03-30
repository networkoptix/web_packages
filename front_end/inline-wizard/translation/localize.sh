#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

for lang_dir in ../translations/*
do
    lang_dir=${lang_dir%*/}
    LANG=${lang_dir/..\/translations\//}

    echo -e "\nGenerate $LANG in ../static/lang_$LANG/views/"
    echo $PWD
    mkdir -p ../static/lang_$LANG/views/

    echo "Copy default views - with default language"
    [ -e ../static/views ] && cp -rf ../static/views/* ../static/lang_$LANG/views/

    echo "Overwrite them with localized sources"
    [ -e $lang_dir/views ] && cp -rf $lang_dir/views/* ../static/lang_$LANG/views/

done

echo "********* Generate inline wizard language.json *********"
echo $PWD
python generate_languages_json.py
