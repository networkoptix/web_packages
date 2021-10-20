FROM ubuntu:18.04

# This will override our EULA check.
ENV DEBIAN_FRONTEND noninteractive

# This is the deb file used to install mediaserver
ARG mediaserver_deb
ARG copy

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

# Copy key files into the container
COPY docker/* /

# Let the entrypoint know if it needs to copy external.dat
ENV COPY=${copy}

# Runs the media server on container start
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
