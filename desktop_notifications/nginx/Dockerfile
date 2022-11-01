FROM nginx:1.14.0-alpine

COPY nginx.conf /etc/nginx/nginx.conf

ARG VERSION
ARG REVISION
ARG BUILD_DATE
ARG BUILD_HOST
ARG BUILD_USER
LABEL maintainer="Roman Barsegian <rbarsegian@networkoptix.com>" \
      version="$VERSION" \
      revision="$REVISION" \
      build-date="$BUILD_DATE" \
      build-host="$BUILD_HOST" \
      build-user="$BUILD_USER"
