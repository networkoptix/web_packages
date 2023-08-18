FROM python:3.8-slim-bullseye AS builder

ARG PIP_TRUSTED_HOST
ARG ARTIFACTORY_URL
# do not use "$ARTIFACTORY_URL/api/pypi/pypi-python3.8-alpine3.12/simple" as pip index
ENV PIP_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST
ENV POETRY_VERSION="1.5.1" \
    POETRY_HOME="/opt/poetry"
ENV PATH="$POETRY_HOME/bin:$PATH"

WORKDIR /app
RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y  \
        bash netcat jq curl libmariadb-dev libcurl4-openssl-dev tini  \
        gettext-base mariadb-client-core-10.5 pkg-config gcc \
    && curl -sSL https://install.python-poetry.org | python3 - \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --upgrade --no-cache-dir pip \
    #    jsonschema version cannot be solved in correctly
    && python -m pip install --prefer-binary --no-cache-dir jsonschema==4.17.3 \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*
