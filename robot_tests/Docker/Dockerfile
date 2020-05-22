
FROM ubuntu:18.04

# This will override our EULA check.
ENV DEBIAN_FRONTEND noninteractive

# This is the deb file used to install mediaserver
ARG mediaserver_deb

# Make a location to copy in the deb filee
RUN mkdir /debs

# Copy the deb file into the container
COPY "${mediaserver_deb}" /debs/

# Installing the mediaserver
RUN apt-get update -qq; exit 0
RUN apt-get install gdebi

RUN dpkg -i /debs/${mediaserver_deb}; exit 0

#RUN apt install -y -f; exit 0

# Remove root tool as we aren't running server as a service
RUN rm /opt/networkoptix/mediaserver/bin/root-tool-bin

# Runs the media server on container start
ENTRYPOINT ["/opt/networkoptix/mediaserver/bin/mediaserver-bin", "-e"]