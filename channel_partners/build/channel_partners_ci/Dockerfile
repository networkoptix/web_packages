FROM python:3.11-slim-bullseye AS builder

ARG PIP_TRUSTED_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST

WORKDIR /app
RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y  \
        bash netcat jq curl libcurl4-openssl-dev tini pkg-config libpq5 g++ libssl-dev \
    && python -m pip install --prefer-binary --no-cache-dir --upgrade pip==23.2.1 \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 \
    && poetry config virtualenvs.create false --local \
    && poetry config installer.no-binary false --local \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*