#!/bin/bash

[ -e external.dat ] || { echo >&2 "Missing the webadmin package external.dat, if building locally move external.dat into build folder"; exit 1; }
[ -e package.zip ] || { echo >&2 "Missing customization package.zip, if building locally move package.zip into build folder"; exit 1; }

unzip -o external.dat

# echo "Copy customization resources"
customization_files=(
    'main_icon.ico'
    'webadmin_config.json'
    'webadmin_config.js'
    'webadmin_logo.png'
    'description.json'
    'welcome_page_logo.png'
    'welcome_page_logo@2x.png'
)

# Prepend and append each filename with *
customization_files=("${customization_files[@]/#/*}")
customization_files=("${customization_files[@]/%/*}")
unzip -oj package.zip "${customization_files[@]}" -d static/customization
mv static/customization/webadmin_logo.png static/images/logo.png
mv static/customization/main_icon.ico static/images/favicon.ico
mv static/customization/welcome_page_logo* static/images

SKIN="blue"
SKIN_PATTERN='\"skin\": \"([A-Za-z_]+)\"'
DESCRIPTION=$(cat static/customization/description.json)
# Detect skin if its in description.json
if [[ "$DESCRIPTION" =~ $SKIN_PATTERN ]]; then
    case ${BASH_REMATCH[1]} in
        dark_orange | gray_orange | orange)
            SKIN="orange"
            ;;
        dark_green | green)
            SKIN="green"
            ;;
        *)
            SKIN="blue"
            ;;
    esac
fi
echo skin is $SKIN


# Customizing colors for webadmin and the setup_wizard
cp "static/styles/$SKIN.css" static/styles/skin.css
cp -r static/setup_$SKIN/* static

# Repackage zip archive
zip -qq -r "external.dat" ./static
