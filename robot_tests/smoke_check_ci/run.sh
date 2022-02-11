#!/bin/bash

cloud_host=${1:-"cloud-test.hdw.mx"}
mediaserver_address=${2:-"https://beta.networkoptix.com/beta-builds/default/4.2.0.34365/linux/nxwitness-server-4.2.0.34365-linux64-private-prod.deb"}

# Download mediaserver deb package and build mediaserver image
if [[ "$mediaserver_address" =~ .*"server-5.0".* ]]
then
    vms="5.0"
else
    vms="4.2"
fi

cd robot_tests/Docker/${vms}
wget -qO mediaserver.deb ${mediaserver_address}

if [[ "${vms}" == "5.0" ]]
then
    docker build -t mediaserver --build-arg mediaserver_deb=mediaserver.deb .
else
    docker build -t mediaserver --build-arg mediaserver_deb=mediaserver.deb --build-arg  cloud_host=${cloud_host} .
fi

rm mediaserver.deb

# Build smoke_check image
cd ../../../
docker build -t smoke_check -f robot_tests/smoke_check_ci/docker/Dockerfile .

# Run test server
if [[ "${vms}" == "5.0" ]]
then
    docker run -d --name=run_server -e cloud_host="https://${cloud_host}" -t mediaserver
else
    docker run -d --name=run_server -t mediaserver
fi

# Run tests
docker run --name=run_smoke_check --volume=test_results:/robot_tests/smoke_check_ci/test_results -e cloud_host="https://${cloud_host}" -t smoke_check

# Save test results
cp -r /var/lib/docker/volumes/test_results robot_tests/smoke_check_ci/test_results

# Delete containers
docker rm -f run_server run_smoke_check
