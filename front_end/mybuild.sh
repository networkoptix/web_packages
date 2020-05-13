
cd ~/develop/nx/cloud_portal/build_scripts
./build.sh
cd ~/develop/nx/cloud/deploy/cloud_portal
./make.sh stage pack
cd ~/gen/dev
docker-compose up -d
