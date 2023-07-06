FROM python:3.8-alpine3.12 AS builder

ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST
ARG PIP_EXTRA_INDEX_URL
ENV PIP_INDEX_URL $PIP_INDEX_URL
ENV PIP_TRUSTED_HOST $PIP_TRUSTED_HOST
ENV PIP_EXTRA_INDEX_URL $PIP_EXTRA_INDEX_URL
WORKDIR /app


RUN set -ex \
    apk update \
    && apk add --no-cache bash ca-certificates gettext libwebp mariadb-client openjpeg tini wget \
        libcrypto1.1 libcurl libffi libgcc libjpeg-turbo libssl1.1 libstdc++ libwebp libxml2 libxslt  \
        mariadb-connector-c mariadb-connector-c-dev musl openjpeg tiff yaml zlib curl jq netcat-openbsd \
    && python -m pip install --upgrade pip

FROM builder as requirements

COPY cloud/pyproject.toml /app/
COPY cloud/poetry.lock /app/
WORKDIR /app
# will fail if poetry.lock is inconcistent
RUN set -ex \
    && python -m pip install --prefer-binary --no-cache-dir poetry==1.4.1 jsonschema==4.17.3 \
    && poetry lock --check \
    && poetry export --with prod,test,front-build --without-hashes --without-urls -o /app/requirements.txt


FROM builder AS runtime

COPY --from=requirements /app/requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt