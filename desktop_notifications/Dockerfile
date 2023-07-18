FROM --platform=linux/amd64 python:3.8-slim-bullseye AS builder

#COPY docker/merge_config.py /usr/local/bin/
#COPY docker/pip.conf /root/.config/pip/pip.conf

ARG CACHE_DATE
ARG ARTIFACTORY_HOST
ARG ARTIFACTORY_URL
ENV PIP_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-remote/simple"
ENV PIP_TRUSTED_HOST $ARTIFACTORY_HOST

RUN set -ex \
    && apt-get update \
    && apt-get install --no-install-suggests --no-install-recommends -y  bash netcat jq curl tini \
    && python -m pip install --upgrade pip \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/* && rm -rf /root/.cache/pip

ENV VERSION=$VERSION \
    POETRY_VERSION="1.4.2" \
    POETRY_HOME="/opt/poetry"

ENV PATH="$POETRY_HOME/bin:$PATH"
ENV PYTHONPATH="$PYTHON_PATH:/app/app"
RUN curl -sSL https://install.python-poetry.org | python3 -


FROM builder as pypackages
COPY ["poetry.lock", "pyproject.toml", "/app/app/"]

WORKDIR /app/app

RUN poetry config virtualenvs.create false && poetry install --no-dev --no-root \
    && apt clean -y && rm -rf /root/.cache/pip

FROM pypackages as runtime

COPY cloud.py /app/app
COPY notification_provider /app/app/notification_provider
COPY notification_receiver /app/app/notification_receiver
COPY docker/entrypoint.sh /app/

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]

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
