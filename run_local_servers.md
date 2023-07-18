Guide on how to use [cloud_helper.sh](./cloud_helper.sh) for creating local docker systems

[[_TOC_]]

# Prerequisites

- Docker
- Python 3.8 or newer
- Python requests is installed
  ```bash
  pip install requests
  ```
- Access to https://depcon.nxvms.dev/releases
  - Ask for access to view private builds
- Cloud accounts for connecting systems to cloud

  - Popular internal cloud instances

    | Instance   | Url                          |
    |------------|------------------------------|
    | cloud-test | https://cloud-test.hdw.mx    |
    | regress    | https://regress.cloud.hdw.mx |
    | stage      | https://stage.nxvms.com      |

# Available flags for run_local_servers

| Flag                | Description                                                                                                                        |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------|
| -h {cloud host}     | Sets the cloud host for the container(s) (leave off https://)                                                                      |
| -e {cloud email}    | Sets the email for adding the system(s) to a cloud account                                                                         |
| -p {cloud password} | Sets the password for a cloud account                                                                                              |
| -l                  | Builds webadmin locally <mark>(Note: you will need a package.zip to customize webadmin. Will update how to get this later)</mark>  |
| -s                  | Skips the local build                                                                                                              |
| -m                  | Skips the setup for docker                                                                                                         |
| -d                  | Downloads the version that is passed as an argument                                                                                |


# Positional arguments for run_local_servers

```bash
./cloud_helper.sh run_local_servers {Build number} {Ports}
```

| Argument     | Description                          | Note                                                                                              | Example                  |
|--------------|--------------------------------------|---------------------------------------------------------------------------------------------------|--------------------------|
| Build Number | Number of the build                  | Build should have a format like #.#.#.#####                                                       | 5.1.0.37133              |
| Ports        | Ports for the container to bind too. | This field is optional and defaults to 7001. Ports can be a single on or an array split by spaces | 7001 or "7001 7002 7003" |

# What the run_local_servers command does

    VERSION=$2
    PORTS=${3:-"7001"}
    USE_LOCAL="false"

    # First it downloads the build
    if [ "$DOWNLOAD_BUILD" == "true" ]; then
        echo "fetching $VERSION"
        python tools/scripts/download_deb.py $VERSION

        echo "$VERSION has been saved to tools/$VERSION.deb"
        SKIP_BUILD="false"
    fi

    # Then it stops all mediaserver containers
    stop_mediaserver

    # Then if set to true it will build webadmin locally using your current branch and move it into the tools/docker
    if [ "$LOCAL_WEBADMIN" == "true" ]; then
        build_webadmin_locally
        move_local_build
        SKIP_BUILD="false"
        USE_LOCAL="copy"
    fi

    # If not true it will build a new mediaserver image for the version passed with this tag "mediaserver:$VERSION"
    if [ "$SKIP_BUILD" != "true" ]; then
        build_mediaserver_image $VERSION $USE_LOCAL
    fi

    # Starts running the mediaserver that points to $CLOUD_HOST by default this is cloud-test.hdw.mx
    run_mediaserver $VERSION "$PORTS" $CLOUD_HOST

    # If skip setup is not true the mediaserver will be setup, and if credentials were passed it will also connect to the cloud-host
    if [ "$SKIP_SETUP" != "true" ]; then
        echo "Running setup for servers"
        sleep 30
        CLOUD_STRING=""
        if [ "$CONNECT_TO_CLOUD" == "true" ]; then
            echo "And connecting them to $CLOUD_HOST for $CLOUD_EMAIL"
            CLOUD_STRING="-c --instance=https://$CLOUD_HOST --email=$CLOUD_EMAIL --password=$CLOUD_PASSWORD "
        fi
        python tools/scripts/setup_system.py $CLOUD_STRING$WEBADMIN_HOST "$PORTS" $LOCAL_PASSWORD
    fi

# Examples

## Running a local container if a deb exists in tools

The command will build an image and run a local server on 7001 using webadmin from the deb file.

```bash
./cloud_helper.sh run_local_servers 5.1.0.37133
```

## Running a local container if a deb file doesn't exist in tools

<mark>(Note: Only run once per deb. No need to download all the time)</mark>

First the command will download the build from our beta builds server and save it to tools.

Then it will build an image and run a server on 7001 using webadmin from the deb file.

```bash
./cloud_helper.sh -d run_local_servers 5.1.0.37133
```

## Running a local container with webadmin from your current branch

The command will build an image and run a local server on 7001 using webadmin built locally from the cloud_portal repository.
```bash
./cloud_helper.sh -l run_local_servers 5.1.0.37133
```

## Running a local container without building an image

The command will run a container using a local image for the build.

<mark>(Note: The image must exist locally otherwise it will fail to run)</mark>

```bash
./cloud_helper.sh -s run_local_servers 5.1.0.37133
```

## Running a local container without setting up the system

The command will build an image and run a local server on 7001, but it will not set up the system.

```bash
./cloud_helper.sh -m run_local_servers 5.1.0.37133
```

## Running a local container and connecting it to cloud

The command will build an image and run a local server on 7001.

Then, it will set up the system locally.

Finally, it will connect the system to cloud.

```bash
./cloud_helper.sh -e test@networkoptix.com -p password run_local_servers 5.1.0.37133
```

## Running a local container and changing its cloud-host

The command will build an image and run a local server on 7001.

The system will be pointing to https://regress.cloud.hdw.mx.

```bash
./cloud_helper.sh -h regress.cloud.hdw.mx run_local_servers 5.1.0.37133
```


# Composite examples
## Running multiple containers without building an image
```bash
./cloud_helper.sh -s run_local_servers 5.1.0.37133 "7001 7002"
```

## Build an image and run multiple containers for local merge
```bash
./cloud_helper.sh run_local_servers 5.1.0.37133 "7001 7002"
```

## Run multiple containers for local merge without building an image
```bash
./cloud_helper.sh -s run_local_servers 5.1.0.37133 "7001 7002"
```

## Build an image and run multiple containers for cloud merge
```bash
./cloud_helper.sh -e "email" -p "password" run_local_servers 5.1.0.37133 "7001 7002"
```

## Download a new build, build an image, and connect to cloud
```bash
./cloud_helper.sh -d -e "email" -p "password" run_local_servers 5.1.0.37133
```

## Download a new build, replace webadmin, build an image, and connect to cloud
```bash
./cloud_helper.sh -d -l -e "email" -p "password" run_local_servers 5.1.0.37133
```

## Download a new build, replace webadmin, build an image, and skip setup
```bash
./cloud_helper.sh -d -l -m run_local_servers 5.1.0.37133
```