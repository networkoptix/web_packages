#!/bin/bash
VERSION=$1
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"009544449203.dkr.ecr.us-east-1.amazonaws.com"}

docker build -t cloud_notifications:$VERSION -t ${DOCKER_REGISTRY}/cloud/cloud_notifications:$VERSION .
docker build -t cloud_notifications_nginx:$VERSION -t ${DOCKER_REGISTRY}/cloud/cloud_notifications_nginx:$VERSION ./nginx

docker push ${DOCKER_REGISTRY}/cloud/cloud_notifications:$VERSION
docker push ${DOCKER_REGISTRY}/cloud/cloud_notifications_nginx:$VERSION
