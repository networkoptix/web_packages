FROM ubuntu:18.04

# This will override our EULA check.
ENV DEBIAN_FRONTEND noninteractive

# This is the deb file used to install mediaserver
ARG mediaserver_deb

# Make a location to copy in the deb filee
RUN mkdir /debs

# Copy the deb file into the container
COPY "${mediaserver_deb}" /debs/

# Install the mediaserver
RUN apt-get update \
    && apt-get install -y \
        /debs/${mediaserver_deb} \
    && apt-get install -y curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy files for container's and server's configs
COPY entrypoint.sh /opt/networkoptix/mediaserver/bin/

# Runs the media server on container start
ENTRYPOINT ["/bin/sh", "-c", "/opt/networkoptix/mediaserver/bin/entrypoint.sh"]
