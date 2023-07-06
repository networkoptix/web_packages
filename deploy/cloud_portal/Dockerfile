FROM python:3.8-alpine3.12 AS builder

ARG CACHE_DATE
ARG ARTIFACTORY_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-python3.8-alpine3.12/simple"
ENV PIP_EXTRA_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-remote/simple"
ENV PIP_TRUSTED_HOST $ARTIFACTORY_HOST


RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libwebp mariadb-client openjpeg tini wget \
        libcrypto1.1 libcurl libffi libgcc libjpeg-turbo libssl1.1 libstdc++ libwebp libxml2 libxslt  \
        mariadb-connector-c mariadb-connector-c-dev musl openjpeg tiff yaml zlib curl jq netcat-openbsd \
    && python -m pip install --upgrade pip


FROM builder AS requirements

COPY stage/cloud/pyproject.toml /app/
COPY stage/cloud/poetry.lock /app/
WORKDIR /app

RUN set -ex \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.4.1 jsonschema==4.17.3  \
    && poetry export --with prod,piplicenses --without-hashes --without-urls -o /app/requirements.txt


FROM builder as runtime

COPY docker/merge_config.py /usr/local/bin/
COPY docker/entrypoint.sh /app/

ENV CLOUD_PORTAL_BASE_CONF_DIR /app/app/static
ENV C_FORCE_ROOT true
ENV VERSION=$VERSION

COPY stage/cloud /app/app
COPY docker/merge_config.py /usr/local/bin/
COPY docker/entrypoint.sh /app/
COPY --from=requirements /app/requirements.txt /app/requirements.txt

WORKDIR /app/app

RUN set -ex \
    apk update \
    && pip install --prefer-binary -r /app/requirements.txt \
    && pip-licenses --format=json --with-urls --allow-only="MIT License;BSD License;GNU General Public License v3 (GPLv3);Python Software Foundation License;GNU General Public License (GPL);Apache 2.0;Apache Software License;Apache License 2.0;GNU Lesser General Public License v3 or later (LGPLv3+);MPL2;Historical Permission Notice and Disclaimer (HPND);BSD;MIT;Public Domain;GNU Library or Lesser General Public License (LGPL);Mozilla Public License 2.0 (MPL 2.0);LGPLv3+" > /app/app/requirements-license.json \
    && CUSTOMIZATION=default ./manage.py collectstatic --noinput && rm -rf node_modules \
    && if ! ./manage.py makemigrations --dry-run --check ; then echo Missing above migrations && exit 1 ; fi \
    && if ! ./manage.py check; then echo "Please notify web team" && exit 1 ; fi

ENTRYPOINT ["/sbin/tini", "--", "/app/entrypoint.sh"]

ARG VERSION
ARG REVISION
ARG BUILD_DATE
ARG BUILD_HOST
ARG BUILD_USER
LABEL maintainer="Ivan Vigasin <ivigasin@gmail.com>" \
      version="$VERSION" \
      revision="$REVISION" \
      build-date="$BUILD_DATE" \
      build-host="$BUILD_HOST" \
      build-user="$BUILD_USER"
