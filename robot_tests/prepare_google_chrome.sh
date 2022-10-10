#!/usr/bin/env sh

set -eux

mkdir -p google_chrome
cd google_chrome

# Google Chrome.
if [ ! -f google-chrome-stable_current_amd64.deb ]; then
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  dpkg-deb -x google-chrome-stable_current_amd64.deb .
fi

# ChromeDriver.
cd opt/google/chrome
if [ ! -f chromedriver_linux64.zip ]; then
  CHROMEDRIVER_STABLE_CURRENT="$(wget -q -O - https://chromedriver.storage.googleapis.com/LATEST_RELEASE)"
  wget -q "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_STABLE_CURRENT/chromedriver_linux64.zip"
  unzip -q chromedriver_linux64.zip
fi

pwd
