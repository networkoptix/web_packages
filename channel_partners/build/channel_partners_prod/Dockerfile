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
        bash netcat jq curl tini pkg-config libpq5 \
    # TODO: !! REMOVE AFTER llutil published
    && apt-get install --no-install-suggests --no-install-recommends -y gcc build-essential libssl-dev \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*

FROM builder as requirements
COPY stage/pyproject.toml /app/
COPY stage/poetry.lock /app/
WORKDIR /app

# TODO: REMOVE AFTER llutil is published to pypi
COPY stage/llutil-0.6.tar.gz /app/llutil-0.6.tar.gz

RUN set -ex \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 jsonschema==4.17.3  \
    && poetry config virtualenvs.create false --local \
    && poetry lock --check \
    && poetry export --without-hashes --without-urls -o /app/requirements.txt \
    && pip freeze | xargs pip uninstall -y \
    && rm -rf /root/.cache/pip

FROM builder AS runtime
COPY --from=requirements /app/requirements.txt /app/requirements.txt

# TODO: REMOVE AFTER llutil is published to pypi
COPY stage/llutil-0.6.tar.gz /app/llutil-0.6.tar.gz


RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y gettext-base \
    # TODO: !! REMOVE AFTER llutil published
    && apt-get install --no-install-suggests --no-install-recommends -y gcc build-essential libssl-dev \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt autoremove -y --purge && apt clean -y && rm -rf /root/.cache/pip && rm -rf /var/lib/apt/lists/*


COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/app
VOLUME /app/app/static

COPY stage/src /app/app
RUN python manage.py collectstatic --noinput
COPY stage/version.txt /app/app/static/version.txt

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
