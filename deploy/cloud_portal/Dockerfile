FROM python:3.8-alpine3.12

COPY docker/merge_config.py /usr/local/bin/
COPY docker/pip.conf /root/.config/pip/pip.conf
COPY docker/entrypoint.sh /app/

ARG CACHE_DATE
COPY stage/cloud/requirements.txt /app/requirements.txt

RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libcurl libffi libgcc libjpeg-turbo libressl2.6-libcrypto libressl2.6-libssl libstdc++ \
        libwebp libxml2 libxslt mariadb-client mariadb-client-libs musl openjpeg tiff tini wget yaml zlib \
    && pip install --prefer-binary -r /app/requirements.txt

ENV CLOUD_PORTAL_BASE_CONF_DIR /app/app/static
ENV C_FORCE_ROOT true

COPY stage/cloud /app/app

WORKDIR /app/app

RUN python ./safety-check.py
RUN CUSTOMIZATION=default ./manage.py collectstatic --noinput && rm -rf node_modules
RUN if ! ./manage.py makemigrations --dry-run --check ; then echo Missing above migrations && exit 1 ; fi
RUN if ! ./manage.py check; then echo "Please notify web team" && exit 1 ; fi

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
