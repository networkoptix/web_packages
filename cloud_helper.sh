#!/usr/bin/env bash

DOCKER_COMPOSE='etc/docker-compose.yml'
SQL='./etc/*.sql'

WEBADMIN_HOST="https://localhost"
LOCAL_PASSWORD="qweasd1234"

# PATHS
DOCKER_DEBS_PATH="tools/docker_resources/mediaserver_debs"
DOCKER_VIDEOS_PATH="tools/docker_resources/videos"

function pyenv_checker() {
    if ! which pyenv &> /dev/null ; then
        echo "There is no pyenv accessible."
        echo "If you are using pyenv ensure that it is set up properly."
        exit 1
    fi
}

function env_checker() {
    if ! which python &> /dev/null ; then
        echo "There is no python version accessible by alias 'python'."
        echo "If you are using pyenv ensure that it is set up properly."
        exit 1
    fi

    if [[ $(python -V | grep -c "3.11") -eq 0 ]]; then
        echo "Python version must be 3.11 Got: $(python -V) instead"
        exit 1
    fi

    if ! which poetry &> /dev/null ; then
        echo "Poetry is not installed or not set up properly."
        exit 1
    fi
}

function build_frontend(){
    env_checker
    echo "Running build script within venv environment"
    bash build_scripts/build.sh
}

function brew_install() {
    echo 'installing n pyenv openssl docker docker-compose mysql-client jq'
    brew install n pyenv openssl docker docker-compose mysql-client jq
    echo "installing virtualenv"
    pip install virtualenv
    echo "installing poetry"
    pip install poetry==1.5.1
    NODE_VERSION="$(jq -r '.engines.node' "$(git rev-parse --show-toplevel)/front_end/package.json" | cut -c2-)"
    echo "Installing node v$NODE_VERSION"
    n "$NODE_VERSION"
    echo "Installing python: $(cat .python-version)"
    pyenv install $(cat .python-version)
    virtualenv -p "$(pyenv which python)" env
    echo 'Brew install complete.'
}

function init_backend(){
    modify_bashprofile
    start_docker_containers
    setup_env
    setup_db
    build_frontend
    setup_cms
}

function init_frontend(){
    pushd front_end
        npm install
        npm run setSkin blue
    popd
}

function modify_bashprofile(){
    if [[ -z ${LOCAL_ENV} ]]; then
        echo 'export LOCAL_ENV=True' >> ~/.bash_profile
        echo 'Restart your terminal or run `source ~/.bash_profile` and rerun this script.'
        exit 0
    else
        echo 'LOCAL_ENV exists'
    fi
}

function setup_cms(){
    printf "Installing all dependencies...\n\n"
    setup_env
    printf "Moving into cloud directory\n\n"
    pushd cloud

        printf "Running db migrations\n\n"
        python manage.py migrate

        printf "Setting up cms structure\n\n"
        python manage.py readstructure

        printf "Filling in local hostname\n\n"
        python manage.py local_hosts --customization default
        python manage.py local_hosts --customization hanwha

    popd
}

function dump_db(){
    printf "Dumping db\n"
    FILENAME=dump-"$(date +%Y-%m-%d-%H-%M)"
    echo $FILENAME
    mkdir -p ./etc/dumps
    mysqldump -h 0.0.0.0 --port=3306 -uroot --all-databases --column-statistics=0 > ./etc/dumps/"$FILENAME".sql
    printf "DB was saved to %s/etc/dumps/%s.sql\n\n" "$PWD" "$FILENAME"
}

function setup_db(){
    SQL_COUNT=`ls -1q etc/*.sql | wc -l`
    if [[ ${SQL_COUNT} -eq 1 ]]; then
        printf "Using db from sql file ${SQL}\n"
        mysql -h 0.0.0.0 --port=3306 -uroot < ${SQL}
        printf "${SQL} was copied to mysql db\n\n"
    else
        printf "No sql files found at ${SQL}\n"
        exit 1
    fi
}

function login_db() {
    mysql -h 0.0.0.0 --port=3306 -uroot cloudportal
}

function setup_env() {
    if ! brew list openssl > /dev/null ; then
        echo 'Installing openssl'
        brew install openssl
    fi
    echo "Exporting homebrew paths"
    echo "export LDFLAGS=-L$(brew --prefix openssl)/lib"
    export LDFLAGS="-L$(brew --prefix openssl)/lib"
    echo "export CPPFLAGS=-I$(brew --prefix openssl)/include"
    export CPPFLAGS="-I$(brew --prefix openssl)/include"
    printf "Setting up cloud portal locally\n\n"
    setup_or_activate_virtualenv

    printf "Installing pip packages for build_scripts and cloud\n\n"
    export PYCURL_SSL_LIBRARY=openssl
    export_poetry_requirements

    pip install --upgrade -r cloud/requirements.txt
    source ./env/bin/activate
}

function reinstall_virtualenv() {
    echo "Command will remove current python virtual environment and"
    echo "install a new one with accurate python version. You must have"
    echo "installed 'pyenv' and 'poetry 1.5.1'."
    read -p "Do you want to proceed? (yes/y/no/n) [no] " yn
    case $yn in
        yes ) echo "Installing";;
        y ) echo "Installing";;
        no ) echo exiting...;
            exit;;
        * ) echo invalid response;
            exit 1;;
    esac
    echo "Removing current python in '$(pwd)/env'..."
    rm -rf ./env
    echo "Using python version $(cat .python-version)."
    echo "Installing python virtual environment in '$(pwd)/env'..."
    if ! which pyenv &> /dev/null ; then
          echo "'pyenv' is not installed or not set up properly."
          exit 1
    fi
    if ! which virtualenv &> /dev/null ; then
          echo "'virtualenv' is not installed or not set up properly."
          exit 1
    fi
    virtualenv -p "$(pyenv which python)" env
    echo "Copying repositories config..."
    cp etc/virtual_env_template/pip.conf env
    setup_env
}

function setup_robot_env() {
    setup_or_activate_virtualenv

    pushd robot_tests
        ROBOT_DIR=$PWD
        if [[ ! -f chromedriver ]] ; then
            echo "Chromedriver is missing from $ROBOT_DIR"
            echo "Please download from https://chromedriver.chromium.org/downloads. Then try again."
            exit 1;
        fi

        if grep -qF "$ROBOT_DIR" ~/.bash_profile ; then
            echo "Robot env has already been setup"
        else
            pip install -r requirements.txt
            echo -e "\n\nexport PYTHONPATH='$PYTHONPATH:$ROBOT_DIR'" >> ~/.bash_profile
            echo -e "export PATH='$PATH:$ROBOT_DIR'" >> ~/.bash_profile
            echo 'Restart your terminal or run `source ~/.bash_profile` and rerun this script.'
        fi
    popd
    source ~/.bash_profile
}

function setup_or_activate_virtualenv() {
    env_checker
    VENV_DIR="$(pwd)/env"
    if [[ ! -d $(pwd)/cloud/cloud ]]; then
        echo "You are not in project root!"
        exit 1
    fi
    if ! pip -V | grep "$VENV_DIR" ; then
        echo "Virtualenv is not active trying to activate it in $VENV_DIR"
        if ! source "$VENV_DIR/bin/activate" ; then
            echo "Failed to activate virtualenv in $VENV_DIR. Exiting..."
            exit 1
        fi
    fi

    # Copy necessary config for virutalenv
    cp etc/virtual_env_template/* $VENV_DIR
    COMMON_PYTHON_PATH="$(pwd)/common/python"
    if [[ "$PYTHONPATH" != *"$COMMON_PYTHON_PATH"* ]]; then
        echo "export PYTHONPATH=\"$PYTHONPATH:$COMMON_PYTHON_PATH\"" >> ~/.bash_profile
    fi

}

function start_celery() {
    pushd cloud
        printf "Starting celery worker\n"
        celery worker -A notifications -l debug --concurrency=1
    popd
}

function start_docker_containers() {
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Starting mysql, redis, and meilisearch containers\n\n"
        docker-compose -f ${DOCKER_COMPOSE}  --profile default up -d
        printf "\n\n"
    else
        printf "No docker-compose file found in ./etc\n\n"
        exit 1
    fi
}

function start_nginx_container() {
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Starting mysql, redis, and meilisearch containers\n\n"
        docker-compose -f ${DOCKER_COMPOSE}  --profile nginx up -d
        printf "\n\n"
    else
        printf "No docker-compose file found in ./etc\n\n"
        exit 1
    fi
}

function test_nginx_docker() {
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    NC='\033[0m' # No Color
    python etc/scripts/copy_nginx_configs.py --project_dir $(pwd)
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Starting mysql, redis, and meilisearch containers\n\n"
        docker-compose -f ${DOCKER_COMPOSE}  --profile nginx_test run --rm nginx_test
        if [[ $? -ne 0 ]]; then
            printf "\n\n"
            echo -e "${RED}ERROR!!! NGINX configuration test failed!${NC}"
            printf "\n\n"
            exit 1
        else
            printf "\n\n"
            echo -e "${GREEN}SUCCESS!!! Test of configuration passed.${NC}"
            printf "\n\n"
        fi
    else
        printf "No docker-compose file found in ./etc\n\n"
        exit 1
    fi
}



function stop_docker_containers() {
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Stopping mysql and redis containers\n\n"
        docker-compose -f ${DOCKER_COMPOSE} down
    else
        printf "No docker-compose file found in ./etc\n\n"
        exit 1
    fi
}

function build_mediaserver_image() {
    VERSION=$1
    COPY=$2
    BUILD_DEB="$DOCKER_DEBS_PATH/$VERSION.deb"
    DOCKER_BUILD_DIR="tools/docker/mediaserver"
    echo "Building the mediaserver image for $VERSION (Local $COPY)"
    if [[ ! -f $BUILD_DEB ]]; then
        echo "Can't find $BUILD_DEB. Please verify the download command"
        exit 1
    fi
    # If the deb is missing clean out the other debs and copy the correct one.
    if [[ ! -f "$DOCKER_BUILD_DIR/$VERSION.deb" ]]; then
        rm -f $DOCKER_BUILD_DIR/*.deb
        cp "$BUILD_DEB" "$DOCKER_BUILD_DIR"
    fi

    pushd "$DOCKER_BUILD_DIR" || exit 1
        docker image build . --tag "mediaserver:$VERSION" --build-arg mediaserver_deb=$VERSION.deb --build-arg copy=$COPY
    popd
}

function list_mediaserver() {
    docker images | grep mediaserver
}

function remove_mediaserver() {
     docker images --format '{{.ID}}' | grep mediaserver | xargs docker image rm -f
}

function run_mediaserver() {
    VERSION=$1
    PORTS="$2"
    CLOUD_HOST=$3
    for PORT in $PORTS
    do
        echo "Starting mediaserver on $PORT"
        # See here for multi port support, but you can only spin up one at a time.
        docker run --restart=always -d -p $PORT:$PORT --env PORT=$PORT --env CLOUD_HOST="$CLOUD_HOST" --name "auto-nx-server-$PORT" --tmpfs /run --tmpfs /run/lock -v /sys/fs/cgroup:/sys/fs/cgroup:ro "mediaserver:$VERSION"
        sleep 5
        open $WEBADMIN_HOST:$PORT
        echo
    done
}

function ask_before_modifying_existing() {
    local PORTS=$1
    RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}' | grep auto-nx-server-)"

    declare -a SELECTED_PORTS
    DELETE_ALL=false
    for PORT in $PORTS; do
        KEEP=true
        if [[ "$DELETE_ALL" = false ]]; then
            for CONTAINER in $RUNNING_CONTAINERS; do
                if [[ $CONTAINER == *"$PORT" ]]; then
                    read -p "Do you want to remove ${CONTAINER}? (y for yes. all for all running containers. anything else for no): " yan
                    case $yan in
                        y) ;;
                        all) DELETE_ALL=true;;
                        *) KEEP=false;;
                    esac
                fi
            done
        fi
        if [ "$KEEP" = true ]; then
            SELECTED_PORTS+=("$PORT")
        fi
    done
    echo "${SELECTED_PORTS[@]}"
}

function smart_stop_mediaserver() {
    local PORTS=$1
    RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}' | grep auto-nx-server-)"

    for CONTAINER in $RUNNING_CONTAINERS
    do
        for PORT in $PORTS
        do
            if [[ $CONTAINER == *"$PORT" ]] ; then
                docker rm -f $CONTAINER
                break
            fi
        done
    done
}

function stop_mediaserver {
    local PORTS=${1:-""}
    if [[ -z $PORTS ]] ; then
        echo "Stopping all auto-nx-servers"
        docker ps --format '{{.Names}}' | grep auto-nx-server- | xargs docker rm -f
    else
        smart_stop_mediaserver "$PORTS"
    fi
}

function update_webadmin() {
    TARGET=$1
    TARGET_DIR=/opt/networkoptix/mediaserver/bin
    BUILD_FILE=~/Desktop/build/external.dat

    echo "Copying..."
    echo $(scp $BUILD_FILE $TARGET:$TARGET_DIR)
}

function build_webadmin_locally() {
    BUILD_DIR=~/Desktop/build
    REPO=$PWD

    export IS_LOCAL=true
    [[ -z $LC_CTYPE ]] && export LC_CTYPE=en_US.UTF-8

    [[ ! -d $BUILD_DIR ]] && mkdir $BUILD_DIR
    echo "Copying apply_customization.py to $BUILD_DIR"
    cp webadmin/apply_customization.py $BUILD_DIR
    pushd $BUILD_DIR
        echo "Building webadmin bundle"
        . "$REPO/webadmin/build.sh"
        echo "Customizing webadmin bundle"
        ./apply_customization.py
    popd
}

function move_local_build() {
    BUILD_DIR=~/Desktop/build
    REPO=$PWD

    pushd $BUILD_DIR
        echo "Copying external.dat to tools"
        cp external.dat $REPO/tools/docker/mediaserver
    popd
}

function extract_logs_from_container() {
    local PORTS=$1
    RUNNING_CONTAINERS="$(docker ps --format '{{.Names}}' | grep auto-nx-server-)"

    for CONTAINER in $RUNNING_CONTAINERS
    do
        for PORT in $PORTS
        do
            if [[ $CONTAINER == *"$PORT" ]] ; then
                CONTAINER_NAME=auto-nx-server-$PORT
                LOG_DIR="tools/docker_server_logs/$CONTAINER_NAME"
                mkdir -p "$LOG_DIR"
                docker cp "$CONTAINER_NAME:/opt/networkoptix/mediaserver/var/log/" "./$LOG_DIR"
                break
            fi
        done
    done
}

function run_virtual_cameras() {
    local PORTS=$1
    #Replace networkoptix with other customization. You can get it by using ssh to access the docker container and running ls
    RUN_TIME="/opt/networkoptix/mediaserver/bin"
    if [[ -z "$DOCKER_VIDEOS_PATH" ]]; then
        mkdir -p $DOCKER_VIDEOS_PATH
        echo "Created $DOCKER_VIDEOS_PATH"
        echo "Please add video files to $DOCKER_VIDEOS_PATH"
        exit 1
    fi

    echo "Getting a list of running containers"
    containers=`docker ps --format '{{.Names}}' | grep auto-nx-server-`

    echo "Building cameras list"
    files=$(ls $DOCKER_VIDEOS_PATH | xargs -I {} echo "videos/{}")
    cameras=$(echo $files | sed s/\ /,/)

    echo "Using video as $cameras"
    for container in $containers
    do
        for PORT in $PORTS
        do
            if [[ $container == *"$PORT" ]] ; then
                echo "Copying video file(s) to $container container"
                docker cp $DOCKER_VIDEOS_PATH $container:$RUN_TIME

                echo "Running test cameras for for $container"
                docker exec -itd -w $RUN_TIME $container /bin/bash -c "./testcamera -S -I=127.0.0.1 \"files=${cameras}\""
            fi
        done
    done

}

function start_https_tunnel() {
    if ! brew list stunnel > /dev/null ; then
        echo 'Installing stunnel'
        brew install stunnel
    fi

    echo 'Starting tunnel'
    stunnel 'etc/stunnel_dev.conf'
}

function install_cli() {
    export CLOUD_PORTAL_DIR=$(pwd)
    pushd cloud_helper
        npm run node-modules
        npm run build
        npm link
        echo 'cloud-helper CLI installed'
        cloud-helper
    popd
}

function export_poetry_requirements() {
    poetry --directory=cloud/ export --with test,front-build,prod,piplicenses --without-hashes --without-urls -o cloud/requirements.txt
    sed -i '' '1s/^/# NOTE!!! This requirements file is used in development only.\n/' cloud/requirements.txt
    sed -i '' '2s/^/# Production requirements file is generated during build.\n/' cloud/requirements.txt
    sed -i '' '3s/^/\n/' cloud/requirements.txt
}

function check_licenses() {
    check_poetry_lock
    ALLOWED="$(cat cloud/allowed_licenses.txt | tr -d '\n')"
    pip-licenses --format=json --with-urls --allow-only="$ALLOWED"
}

function poetry_lock() {
    poetry -C cloud/ lock --no-update
}

function check_poetry_lock() {
    if ! poetry -C cloud/ lock --check; then
        echo "Poetry lock file is not up to date."
        exit 1
    fi
}

function update_requirements_licenses_poetry() {
    echo "Command deprecated. Licenses list is checked and generated in CI and build."
    exit 1
}

function update_package() {
    echo "Command 'poetry update -C cloud/ --lock --only=prod $1' will be executed."
    echo "This will update pyproject.toml and poetry.lock files only."
    read -p "Do you want to proceed? (yes/no) " yn
    case $yn in
        yes ) echo "Updating $1";;
        no ) echo exiting...;
            exit;;
        * ) echo invalid response;
            exit 1;;
    esac

    poetry update -C cloud/ --lock --only=prod $1
    exit

}

function setup_git_aliases() {
    HL='\033[0;32m'
    NC='\033[0m'
    for alias in git-aliases/*
    do
        alias_name=$(basename "$alias")
        echo -e "\n"
        echo -e "Setting up git alias $HL$alias_name$NC"
        echo -e "To use command run$HL git $alias_name $NC"
        tail --lines=+2 "$alias"
        echo -e "\n"
        git config alias."$alias_name" "$(head -1 "$alias")"
    done
}

function setup_webadmin_conan_update_scripts() {
    echo "Installing dependencies for updating webadmin"
    setup_or_activate_virtualenv
    pip install gitpython httpx
    echo "pip packages have been installed"

    echo "Please run 'python build_webadmin_commit_message.py old_sha new_sha'"
    echo "This will generate your env file and provide instructions for env configuration"
}

function migrate() {
    mkdir -p tools/docker_resources/{dbs,mediaserver_debs}
    pushd tools
        mv *.deb docker_resources/mediaserver_debs/
        mv videos docker_resources/videos
    popd
}

# Default values
CONNECT_TO_CLOUD="false"
CLOUD_HOST="cloud-test.hdw.mx"
CLOUD_EMAIL=""
CLOUD_PASSWORD=""
CUSTOMIZATION="default"
DOWNLOAD_BUILD="false"
LOCAL_WEBADMIN="false"
SKIP_BUILD="false"
SKIP_SETUP="false"

# Parse command-line options
while getopts "h:c:e:p:lsmd" opt; do
    case $opt in
        h)
            CLOUD_HOST=$OPTARG
            ;;
        c)
            CUSTOMIZATION=$OPTARG
            ;;
        e)
            CLOUD_EMAIL=$OPTARG
            ;;
        p)
            CLOUD_PASSWORD=$OPTARG
            ;;
        l)
            LOCAL_WEBADMIN="true"
            ;;
        s)
            SKIP_BUILD="true"
            ;;
        m)
            SKIP_SETUP="true"
            ;;
        d)
            DOWNLOAD_BUILD="true"
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            echo "-h {cloud host} (leave off https://)"
            echo "-c {customization name}"
            echo "-e {cloud email}"
            echo "-p {cloud password}"
            echo "-l : builds webadmin locally"
            echo "-s : skips the local build"
            echo "-m : skips the setup for docker"
            echo "-d : downloads the version passed in"
            exit 1
            ;;
    esac
done

shift $((OPTIND - 1))

if [ -n "$CLOUD_EMAIL" ] && [ -n "$CLOUD_PASSWORD" ]; then
    CONNECT_TO_CLOUD="true"
    SKIP_SETUP="false"
fi

for command in "$@"
do
    case "$command" in
        init_all)
            init_backend
            init_frontend
            ;;
        init_backend)
            init_backend
            ;;
        init_backend_special)
            # Comment out exit for use. Be careful with this one.
            exit 0
            brew_install
            init_backend
            ;;
        brew_install)
            brew_install
            ;;
        init_frontend)
            init_frontend
            ;;
        init_frontend_special)
            # Comment out exit for use. Be careful with this one.
            exit 0
            brew_install
            init_frontend
            ;;
        add_env)
            modify_bashprofile
            ;;
        build_frontend)
            build_frontend
            ;;
        generate_cms_docs)
            setup_env
            pushd cloud
                python manage.py json_to_table
            popd
            echo 'Generated files are created in ./cloud/cms'
            ;;
        login_db)
            login_db
            ;;
        rebuild_frontend)
            build_frontend
            setup_cms
            ;;
        setup_cms)
            setup_or_activate_virtualenv
            setup_cms
            ;;
        setup_db)
            setup_db
            ;;
        setup_env)
            setup_env
            ;;
        setup_robot_env)
            setup_robot_env
            ;;
        set_cloud_instance)
            if [[ -z ${CLOUD_INSTANCE} ]]; then
                echo -e "\nexport CLOUD_INSTANCE=$2" >> ~/.bash_profile
            else
                sed -i '' "s,CLOUD_INSTANCE=.*,CLOUD_INSTANCE=${2},g" ~/.bash_profile
            fi
            export CLOUD_INSTANCE=$2
            echo "If command was not run with source it will not work"
            # Removed for now
            # if [ $(python -c 'import sys; print(sys.version_info.major)') == 2 ]; then
            #   echo "Py3 not found. Likely virtualenv is not activated. Proxy configuration is not updated!"
            # else
            #   pushd front_end
            #       python update_proxy.py
            #   popd
            # fi
            break
            ;;
        start_celery)
            . ./env/bin/activate
            start_celery
            ;;
        start_docker)
            start_docker_containers
            ;;
        stop_docker)
            stop_docker_containers
            ;;
        build_local_webadmin)
            build_webadmin_locally
            ;;
        update_remote_vms)
            TARGET=$2
            build_webadmin_locally
            update_webadmin $TARGET
            break
            ;;
        list_mediaserver)
            list_mediaserver
            ;;
        remove_mediaserver)
            remove_mediaserver
            ;;
        stop_mediaserver)
            PORTS=${2:-""}
            stop_mediaserver "$PORTS"
            break
            ;;
        start_https_tunnel)
            start_https_tunnel
            ;;
        dump_db)
            dump_db
            ;;
        run_local_servers)
            VERSION=$2
            PORTS=${3:-"7001"}
            USE_LOCAL="false"

            if [ "$DOWNLOAD_BUILD" == "true" ]; then
                echo "fetching $VERSION"
                python tools/scripts/download_deb.py --customization="$CUSTOMIZATION" "$VERSION"

                echo "$VERSION has been saved to $DOCKER_DEBS_PATH/$VERSION.deb"
                SKIP_BUILD="false"
            fi

            # Updates ports by asking the user what to do with existing containers
            PORTS=$(ask_before_modifying_existing "$PORTS")

            smart_stop_mediaserver "$PORTS"

            if [ "$LOCAL_WEBADMIN" == "true" ]; then
                build_webadmin_locally
                move_local_build
                SKIP_BUILD="false"
                USE_LOCAL="copy"
            fi

            if [ "$SKIP_BUILD" != "true" ]; then
                build_mediaserver_image $VERSION $USE_LOCAL
                if [[ $? -ne 0 ]]; then
                    echo "Failed to build the mediaserver image for $VERSION.deb"
                    break
                fi
            fi

            run_mediaserver $VERSION "$PORTS" $CLOUD_HOST

            if [ "$SKIP_SETUP" == "false" ]; then
                echo "Running setup for servers"
                sleep 30
                CLOUD_STRING=""
                if [ "$CONNECT_TO_CLOUD" == "true" ]; then
                    echo "And connecting them to $CLOUD_HOST for $CLOUD_EMAIL"
                    CLOUD_STRING="-c --instance=https://$CLOUD_HOST --email=$CLOUD_EMAIL --password=$CLOUD_PASSWORD "
                fi
                python tools/scripts/setup_system.py $CLOUD_STRING$WEBADMIN_HOST "$PORTS" $LOCAL_PASSWORD
            fi
            break
            ;;
        run_virtual_cameras)
            PORTS=${2:-"7001"}
            echo "Adding cameras to running servers"
            run_virtual_cameras "$PORTS"
            break
            ;;
        get_mediaserver_logs)
            PORTS=${2:-"7001"}
            echo "Extracting logs from docker containers and placing them in ./tools/docker_server_logs"
            extract_logs_from_container "$PORTS"
            break
            ;;
        check_licenses)
            check_licenses
            ;;
        poetry_lock)
            poetry_lock
            ;;
        update_package_licenses)
            npx recursive-check-licenses -a licenses_whitelist.json -e licenses_excluded_packages.json
            ;;
        export_poetry_requirements)
            export_poetry_requirements
            ;;
        install_cli)
            install_cli
            ;;
        setup_git_aliases)
            setup_git_aliases
            ;;
        update_py_package)
            update_package $2
            ;;
        setup_webadmin_conan)
            setup_webadmin_conan_update_scripts
            ;;
        reinstall_virtualenv)
            reinstall_virtualenv
            ;;
        migrate)
            migrate
            ;;
        test_nginx_docker)
            test_nginx_docker
            ;;
        start_nginx_container)
            start_nginx_container
            ;;
        *)
            echo Usage: cloud_shortcuts '[init_backend|init_frontend|add_env|build_frontend|login_db|rebuild_frontend|set_cloud_instance|setup_cms|setup_db|setup_env|start_celery|start_docker|stop_docker|remove_mediaserver|run_local_servers|stop_mediaserver|start_https_tunnel]'
            echo 'init_backend - Initializes the backend. Only run this once'
            echo 'init_frontend - Initializes the frontend.'
            echo 'brew_install - Installs Brew and dependencies for frontend and backend'
            echo 'add_env - Adds LOCAL_ENV to your bash profile'
            echo 'build_frontend - Builds the frontend'
            echo 'generate_cms_docs - Creates an html file for each product in cms/cms_structure.json'
            echo 'login_db - Login to docker db'
            echo 'dump_db - Dump database to sql file in etc/dumps'
            echo 'rebuild_frontend - Rebuilds the frontend and runs readstructure and filldata commands'
            echo 'set_cloud_instance - Sets the cloud instance env. Usage "source ./cloud_helper.sh set_cloud_instance $instance".'
            echo 'setup_cms - Fills in the cms. Runs migrate, readstructure and filldata commands'
            echo 'setup_db - Loads local db with sql file in ~/develop/nx_vms/cloud_portal/'
            echo 'setup_robot_env - Setups robot env. Run after placing the chromedriver in robot_tests'
            echo 'start_celery - Starts celery worker (This uses sqs queue based on local settings)'
            echo 'start_docker - Starts docker containers used by cloud'
            echo 'stop_docker - Stops docker containers used by cloud'
            echo 'list_mediaserver - List docker images build by this script'
            echo 'remove_mediaserver - Removes docker mediaserver images created by this script'
            echo 'run_local_servers -Stops all running mediaservers, builds a new docker image, and runs the images. Usage "./cloud_helper.sh {version} {ports}"'
            echo 'stop_mediaserver - Stops all containers made by this script'
            echo 'build_local_webadmin - Builds webadmin locally to test the build'
            echo 'update_remote_vms - Copy locally built webadmin (external.dat) to a target machine. Usage "./cloud_helper.sh update_remote_vms {target-ip}"'
            echo 'start_https_tunnel - Start a secure tunnel on port 8001 to the local django server on port 8000'
            echo 'poetry_lock - Updates poetry lock file which is used for checking consistency of dependencies version'
            echo 'check_licenses - just checks licenses and exits with error code if check failed'
            echo 'export_poetry_requirements - export poetry requirements to cloud/requirements.tx which is used in deployment'
            echo 'update_package_licenses - Update package-license.json with latest licensing information for cloud_portal project'
            echo 'install_cli - Installs cloud-helper CLI command globally'
            echo 'setup_git_aliases - Sets up git aliases for cloud_portal project'
            echo 'update_py_package - Updates poetry requirements. Accepts package name. "./cloud_helper.sh update_py_package {package name}"'
            echo 'setup_webadmin_conan - Sets up the env for the conan helper script'
            echo 'reinstall_virtualenv - Installing python virtual environment with a correct version and updating all packages"'
            echo 'test_nginx_docker - Test nginx configuration file using `nginx -t` in docker container."'
            echo 'start_nginx_container - Start nginx docker container."'
            echo ''
            if ! command -v cloud-helper &> /dev/null
            then
                read -p "cloud-helper CLI not installed. Do you want to install (y/n): " yn
                case $yn in
                    y)
                      install_cli
                    ;;
                esac
            else
                cloud-helper
            fi
            break
            ;;
    esac
done
