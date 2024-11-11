FROM python:3.11-slim-bullseye AS builder

ARG CACHE_DATE
ARG ARTIFACTORY_HOST
ARG ARTIFACTORY_URL
ENV ARTIFACTORY_URL $ARTIFACTORY_URL
ENV PIP_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-remote/simple"
ENV PIP_EXTRA_INDEX_URL "$ARTIFACTORY_URL/api/pypi/pypi-local/simple"
ENV PIP_TRUSTED_HOST $ARTIFACTORY_HOST

WORKDIR /app
RUN set -ex \
    && apt clean -y \
    && apt-get update \
    && apt-get install -o 'Acquire::Retries=3' --no-install-suggests --no-install-recommends -y  \
        bash netcat jq curl libmariadb-dev libcurl4-openssl-dev tini  \
        gettext-base mariadb-client-core-10.5 pkg-config \
    && python -m pip install --upgrade --no-cache-dir pip==23.2.1 \
    && apt autoremove -y --purge && apt clean -y && rm -rf /var/lib/apt/lists/*


FROM builder AS requirements

COPY stage/cloud/pyproject.toml /app/
COPY stage/cloud/poetry.lock /app/
WORKDIR /app
RUN set -ex \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.5.1 jsonschema==4.17.3  \
    && poetry config virtualenvs.create false --local \
    && poetry lock --check \
    && poetry export --with prod,piplicenses --without-hashes --without-urls -o /app/requirements.txt \
    && pip freeze | xargs pip uninstall -y \
    && rm -rf /root/.cache/pip


FROM builder AS pypackages
COPY --from=requirements /app/requirements.txt /app/requirements.txt

RUN set -ex \
    && apt update && apt-get install -o 'Acquire::Retries=3' --no-install-suggests --no-install-recommends -y gcc \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt remove gcc -y && apt autoremove -y --purge && apt clean -y && rm -rf /root/.cache/pip && rm -rf /var/lib/apt/lists/*


FROM pypackages as runtime

ENV CLOUD_PORTAL_BASE_CONF_DIR /app/app/static
ENV C_FORCE_ROOT true
ENV VERSION=$VERSION

COPY stage/cloud /app/app
COPY stage/common_python /app/common_python
ENV PYTHONPATH="/app/common_python"
COPY docker/merge_config.py /usr/local/bin/
COPY docker/entrypoint.sh /app/
WORKDIR /app/app

RUN set -ex \
    && CUSTOMIZATION=default ./manage.py collectstatic --noinput && rm -rf node_modules \
    && if ! ./manage.py makemigrations --dry-run --check ; then echo Missing above migrations && exit 1 ; fi \
    && if ! ./manage.py check; then echo "Please notify web team" && exit 1 ; fi

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]

ARG VERSION
ARG REVISION
ARG BUILD_DATE
ARG BUILD_HOST
ARG BUILD_USER
LABEL maintainer="Ivan Vigasin <ivigasin@gmail.com>" \
      version="$VERSION" \
      revision="$REVISION" \
      build-date="$BUILD_DATE" \
      build-host="$BUILD_HOST" \
      build-user="$BUILD_USER"
