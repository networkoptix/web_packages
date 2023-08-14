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
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*

FROM builder as requirements
COPY stage/pyproject.toml /app/
COPY stage/poetry.lock /app/
WORKDIR /app
RUN set -ex \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 jsonschema==4.17.3  \
    && poetry config virtualenvs.create false --local \
    && poetry lock --check \
    && poetry export --without-hashes --without-urls -o /app/requirements.txt \
    && pip freeze | xargs pip uninstall -y \
    && rm -rf /root/.cache/pip

FROM builder AS runtime
COPY --from=requirements /app/requirements.txt /app/requirements.txt
COPY stage/src /app/app


RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y gettext-base \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt autoremove -y --purge && apt clean -y && rm -rf /root/.cache/pip && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/app
VOLUME /app/app/static
RUN python manage.py collectstatic --noinput

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
