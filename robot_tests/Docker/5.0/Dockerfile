FROM ubuntu:18.04

# This will override our EULA check.
ENV DEBIAN_FRONTEND noninteractive

# This is the deb file used to install mediaserver
ARG mediaserver_deb

USER root

# Make a location to copy in the deb filee
RUN mkdir /debs

# Copy the deb file into the container
COPY "${mediaserver_deb}" /debs/

# Install the mediaserver
RUN apt-get update \
    && dpkg --configure -a \
    && apt-get install -y \
        curl \
        apt-utils \
        iptables \
        wget \
        /debs/${mediaserver_deb} \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && wget https://letsencrypt.org/certs/staging/letsencrypt-stg-root-x1.pem -P /etc/ssl/certs/ \
    && wget https://letsencrypt.org/certs/staging/letsencrypt-stg-root-x2.pem -P /etc/ssl/certs/ \
    && update-ca-certificates

RUN chmod -R 777 /usr/local/bin/
RUN chmod -R 777 /opt/networkoptix/mediaserver

# Copy files for container's and server's configs
COPY entrypoint.sh /opt/networkoptix/mediaserver/bin/
RUN chmod -R 777  /opt/networkoptix/mediaserver/bin/entrypoint.sh
# Runs the media server on container start
ENTRYPOINT ["/bin/sh", "-c", "/opt/networkoptix/mediaserver/bin/entrypoint.sh"]