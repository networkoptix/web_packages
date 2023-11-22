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
        bash netcat jq curl tini pkg-config libpq5 \
    # TODO: !! REMOVE AFTER llutil published
    && apt-get install --no-install-suggests --no-install-recommends -y gcc build-essential libssl-dev \
    && python -m pip install --upgrade --no-cache-dir pip==23.2.1 \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 jsonschema==4.17.3

COPY poetry.lock /app/poetry.lock
COPY pyproject.toml /app/pyproject.toml
COPY llutil-0.6.tar.gz /app/llutil-0.6.tar.gz

RUN set -ex \
    && poetry config virtualenvs.create false --local \
    && poetry lock --check \
    && poetry export --without-hashes --without-urls -o /app/requirements.txt \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y gettext-base \
    # TODO: !! REMOVE AFTER llutil published
    && apt-get install --no-install-suggests --no-install-recommends -y gcc build-essential libssl-dev \
    && pip install --no-cache-dir -r /app/requirements.txt


COPY build/channel_partners_local/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV PYTHONPATH="/app/common_python"
ENV LOCAL_ENV=1
ENV LOCAL_DOCKER=1

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
