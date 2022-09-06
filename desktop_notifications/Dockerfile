FROM python:3.8-alpine3.12

#COPY docker/merge_config.py /usr/local/bin/
#COPY docker/pip.conf /root/.config/pip/pip.conf
COPY docker/entrypoint.sh /app/

ARG CACHE_DATE
ARG ARTIFACTORY_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-python3.8-alpine3.12/simple"
ENV PIP_EXTRA_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-remote/simple"
ENV PIP_TRUSTED_HOST $ARTIFACTORY_HOST

RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libwebp openjpeg tini wget gcc musl-dev \
        libcrypto1.1 libcurl libffi libgcc libjpeg-turbo libssl1.1 libstdc++ libwebp libxml2 libxslt musl openjpeg tiff yaml zlib \
        curl jq netcat-openbsd


ENV VERSION=$VERSION \
    POETRY_VERSION="1.1.13" \
    POETRY_HOME="/opt/poetry"

ENV PATH="$POETRY_HOME/bin:$PATH"
ENV PYTHONPATH="$PYTHON_PATH:/app/app"

COPY ["cloud.py", "poetry.lock", "pyproject.toml", "/app/app/"]
COPY notification_provider /app/app/notification_provider
COPY notification_receiver /app/app/notification_receiver

RUN curl -sSL https://install.python-poetry.org | python3 -

WORKDIR /app/app

RUN poetry config virtualenvs.create false && poetry install --no-dev --no-root

ENTRYPOINT ["/sbin/tini", "--", "/app/entrypoint.sh"]

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
