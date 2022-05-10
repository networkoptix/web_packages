FROM python:3.8.7-alpine3.12

ARG CACHE_DATE
COPY stage/requirements.txt /app/requirements.txt
COPY pip.conf /root/.config/pip/pip.conf

RUN set -ex \
    apk update \
    && apk update \
    && apk add --no-cache \
        libcrypto1.1 \
        libffi \
        libgcc \
        libssl1.1 \
        libstdc++ \
        musl \
        yaml \
    && pip install --prefer-binary -r /app/requirements.txt

ENV C_FORCE_ROOT true
ENV VERSION=$VERSION

COPY stage /app

WORKDIR /app

CMD ["hypercorn", "--bind", "0.0.0.0:8001", "server:app"]


ARG VERSION
ARG REVISION
ARG BUILD_DATE
ARG BUILD_HOST
ARG BUILD_USER
LABEL maintainer="Nick Hartleb <nhartleb@networkoptix.com>" \
      version="$VERSION" \
      revision="$REVISION" \
      build-date="$BUILD_DATE" \
      build-host="$BUILD_HOST" \
      build-user="$BUILD_USER"

