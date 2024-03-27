FROM nginx:1.14.0-alpine

RUN apk add --no-cache apache2-utils tini curl jq netcat-openbsd

COPY nginx.conf /etc/nginx/nginx.conf

STOPSIGNAL SIGKILL

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
