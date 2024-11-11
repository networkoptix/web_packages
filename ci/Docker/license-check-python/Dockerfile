FROM python:3.11-slim-bullseye AS builder

ARG PIP_TRUSTED_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST
ENV POETRY_VERSION="1.5.1" \
    POETRY_HOME="/opt/poetry"
ENV PATH="$POETRY_HOME/bin:$PATH"

ENV BUILD_COMMIT={{BUILD_COMMIT}}

WORKDIR /app
RUN set -ex \
    && apt clean -y \
    && apt-get update \
    && curl -sSL https://install.python-poetry.org | python3 - \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --upgrade --no-cache-dir pip==23.2.1 pytoml==0.1.21 \
        jk_pypiorgapi==0.2022.6.13 requests==2.32.3 licensecheck==2024.3 \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*
