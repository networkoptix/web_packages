FROM --platform=linux/amd64 nginx:1.14.0-alpine

ARG BUILD_NUMBER=''
#ENV PORTAL_HOST=127.0.0.1

RUN apk add --no-cache apache2-utils tini curl jq netcat-openbsd

COPY nginx.conf /etc/nginx/nginx.conf
#COPY proxy.conf /etc/nginx/proxy.conf
#COPY run_nginx.sh /run_nginx.sh

ENV BUILD="${BUILD_NUMBER}"

#ENTRYPOINT ["/sbin/tini", "--"]

STOPSIGNAL SIGKILL

#CMD ["/run_nginx.sh"]

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
