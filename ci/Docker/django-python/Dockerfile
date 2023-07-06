FROM python:3.8-slim-bullseye AS builder

ARG PIP_TRUSTED_HOST
ARG ARTIFACTORY_URL
# do not use "$ARTIFACTORY_URL/api/pypi/pypi-python3.8-alpine3.12/simple" as pip index
ENV PIP_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "https://artifactory.us.nxteam.dev/artifactory/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST

WORKDIR /app
RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y  \
        libmariadb-dev libcurl4-openssl-dev tini gettext-base mariadb-client-core-10.5 pkg-config \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*


FROM builder as requirements

COPY cloud/pyproject.toml /app/
COPY cloud/poetry.lock /app/
WORKDIR /app
RUN set -ex \
    && pip install poetry==1.5.1 --no-cache-dir --prefer-binary \
    && poetry config virtualenvs.create false --local \
    && poetry lock --check \
    && poetry export --with prod,test,front-build --without-hashes --without-urls -o /app/requirements.txt \
    && pip freeze | xargs pip uninstall -y \
    && rm -rf /root/.cache/pip


FROM builder AS runtime
COPY --from=requirements /app/requirements.txt /app/requirements.txt
RUN set -ex \
    && apt-get update && apt-get install --no-install-suggests --no-install-recommends -y gcc \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt remove gcc -y && apt autoremove -y --purge && apt clean -y && rm -rf /root/.cache/pip && rm -rf /var/lib/apt/lists/*
