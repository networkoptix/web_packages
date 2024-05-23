FROM --platform=linux/amd64 python:3.11-slim-bullseye AS builder

ARG PIP_TRUSTED_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST

WORKDIR /app
RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y  \
        bash netcat jq curl  libcurl4-openssl-dev tini pkg-config libpq5 libssl-dev \
    # TODO: !! REMOVE AFTER llutil published
    && apt-get install --no-install-suggests --no-install-recommends -y gcc build-essential libssl-dev \
    && python -m pip install --upgrade --no-cache-dir pip==23.2.1 \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 jsonschema==4.17.3  \
    && poetry config virtualenvs.create false --local \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*

FROM builder as requirements
COPY stage/pyproject.toml /app/
COPY stage/poetry.lock /app/
WORKDIR /app

# TODO: REMOVE AFTER llutil is published to pypi
COPY stage/llutil-0.6.tar.gz /app/llutil-0.6.tar.gz

RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y gettext-base \
    && poetry lock --check \
    && poetry install --no-root --without test \
    && apt autoremove -y --purge && apt clean -y && rm -rf /root/.cache/pip && rm -rf /var/lib/apt/lists/*

FROM requirements AS runtime

COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/app
VOLUME /app/app/static

COPY stage/src /app/app
COPY stage/common_python /app/common_python
ENV PYTHONPATH="/app/common_python"
RUN cp -rf config/.env.dist config/.env.local \
    && python manage.py collectstatic --noinput  \
    && rm -f config/.env.local
COPY stage/version.txt /app/app/static/version.txt


ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]

ARG VERSION
ARG REVISION
ARG BUILD_DATE
ARG BUILD_HOST
ARG BUILD_USER
ENV VERSION $VERSION
LABEL maintainer="Roman Barsegian <rbarsegian@networkoptix.com>" \
      version="$VERSION" \
      revision="$REVISION" \
      build-date="$BUILD_DATE" \
      build-host="$BUILD_HOST" \
      build-user="$BUILD_USER"
