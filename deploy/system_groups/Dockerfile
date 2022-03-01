FROM python:3.8-slim

ARG CACHE_DATE
COPY stage/requirements.txt /app/requirements.txt

RUN set -ex \
    apt update \
    && pip install --prefer-binary -r /app/requirements.txt

ENV C_FORCE_ROOT true
ENV VERSION=$VERSION

COPY stage /app

WORKDIR /app

CMD ["hypercorn", "--bind", "0.0.0.0:8001", "server:app"]
