FROM python:3.8.7-alpine3.12

ARG CACHE_DATE
ARG ARTIFACTORY_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-python3.8-alpine3.12/simple"
ENV PIP_EXTRA_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-remote/simple $ARTIFACTORY_URL/api/pypi/pypi-remote/simple"
ENV PIP_TRUSTED_HOST $ARTIFACTORY_HOST

COPY stage/requirements.txt /app/requirements.txt

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

