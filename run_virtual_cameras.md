A guide on how use [cloud_helper.sh](./cloud_helper.sh) for running virtual cameras for local docker servers
<mark>Does not allow you to do recording yet. Need to support for virtual storages.</mark>
# Prerequisites
- Running local docker containers ([How to make containers with cloud_helper.sh](./run_local_servers.md))
- Video files. (Preferably *.mp4 files)

# Restrictions
This only works for the default customization.

Replace networkoptix with the other customization's name. You can get it by using exec to access the docker container and running `ls /opt`

# Instructions
1. Place videos in `./tools/video` (Make sure files dont have spaces in the name)
2. ```bash
   ./cloud_helper.sh run_virtual_cameras
3. Go to webadmin or cloud portal and check your systems cameras.