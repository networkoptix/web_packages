FROM python:3.8-alpine3.12

COPY pip.conf /root/.config/pip/pip.conf
COPY requirements.txt /app/requirements.txt

RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libwebp mariadb-client openjpeg tini wget \
        libcrypto1.1 libcurl libffi libgcc libjpeg-turbo libssl1.1 libstdc++ libwebp libxml2 libxslt mariadb-connector-c musl openjpeg tiff yaml zlib \
        curl jq netcat-openbsd \
    && pip install --prefer-binary -r /app/requirements.txt
