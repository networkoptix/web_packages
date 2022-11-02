FROM python:3.8-alpine3.12

ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST
ARG PIP_EXTRA_INDEX_URL
ENV PIP_INDEX_URL $PIP_INDEX_URL
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST
ENV PIP_EXTRA_INDEX_URL $PIP_EXTRA_INDEX_URL

COPY requirements.txt /app/requirements.txt

RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libwebp mariadb-client openjpeg tini wget \
        libcrypto1.1 libcurl libffi libgcc libjpeg-turbo libssl1.1 libstdc++ libwebp libxml2 libxslt mariadb-connector-c musl openjpeg tiff yaml zlib \
        curl jq netcat-openbsd \
    && python -m pip install --upgrade pip \
    && pip install --prefer-binary -r /app/requirements.txt
