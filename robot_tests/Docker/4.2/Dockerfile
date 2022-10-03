FROM ubuntu:18.04

# This will override our EULA check.
ENV DEBIAN_FRONTEND noninteractive

ARG mediaserver_deb
ARG cloud_host

USER root

# Make a location to copy in the deb filee
RUN mkdir /debs

# Copy the deb file into the container
COPY "${mediaserver_deb}" /debs/

# Install the mediaserver
RUN apt-get update \
    &&  apt-get install -y \
        iptables \
        apt-utils \
        /debs/${mediaserver_deb} \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Remove root tool as we aren't running server as a service
RUN rm /opt/networkoptix/mediaserver/bin/root-tool-bin

# Copy files for container's and server's configs
COPY entrypoint.sh config_helper.sh /opt/networkoptix/mediaserver/bin/
COPY patch-cloud-host.sh utils.sh /usr/local/bin/
RUN chmod -R 777 /usr/local/bin/
RUN chmod -R 777 /opt/networkoptix/mediaserver

# Patch the cloud host
RUN /usr/local/bin/patch-cloud-host.sh ${cloud_host}

# Runs the media server on container start
ENTRYPOINT ["/bin/sh", "-c", "/opt/networkoptix/mediaserver/bin/entrypoint.sh"]
