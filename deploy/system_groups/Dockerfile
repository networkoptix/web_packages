FROM python:3.8-slim

ARG CACHE_DATE
COPY stage/requirements.txt /app/requirements.txt

RUN set -ex \
    apt update \
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

