### What is it?
This directory is created to easily run multiple servers,<br>
which point to different cloud hosts and run on different ports.<br>
a. Dockerfile - for building images for servers pointing to specific cloud host<br>
b. entrypoint.sh - for running servers in containers on specific port<br>
c. patch-cloud-host.sh and utils.sh are the tools to make a. possible<br>
d. lazy_builder.py - a tool to build all images at once<br>
e. The files are not supposed to go public. Internal use only.

### Installation
All you need is:
1. Mediaserver's .deb file(s) downloaded in current folder.
2. Docker installed:
https://docs.docker.com/engine/install/ Make sure docker is runnable without sudo.
3. <s>Love</s>

### Building the image for specific cloud host
Mediaserver .deb file and cloud host which the server will point to can be passed
as parameters <b>mediaserver_deb</b> and <b>cloud_host</b> correspondingly:
```bash
docker build -t <image_name> --build-arg mediaserver_deb=<path_to_deb_file> --build-arg cloud_host=<cloud_host> . 
```

By default cloud_host is set to cloud-test.hdw.mx. To keep it just omit the cloud_host argument.
Server will point to cloud-test no matter what vms build is used: 
``` bash
docker build -t 4.0_test --build-arg mediaserver_deb=4.0.0.29987-linux64.deb .
```

### Building all images at once using lazy_builder.py
1. Download desired 4.0 and 4.1 server deb files in current folder
2. Remove other deb files if any
3. Run from the current folder
```bash
python lazy_builder.py
```

### Running the container in host network
Port should be passed as PORT argument when running a container:
```bash
docker run -d --name <container_name> --restart=always -e PORT=<port_num> --network=host -t <image_name>
```
If PORT argument is omitted, container and server will run on default port - 7001:
```bash
docker run -d --name 4.1_dev2_7001 --network=host -t 4.1_dev2
```

### Running the container in bridge network
Port should be passed using -p option when running a container:
```bash
docker run -d --name <container_name> --restart=always -p <port_num>:7001 --network=bridge -t <image_name>
```

### Limitations
<li>4.0+ vms versions only 
<li>Images built using .deb files in this folder work correctly, that is not guaranteed for other versions.