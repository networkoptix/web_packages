#!/usr/bin/env bash

DOCKER_COMPOSE='etc/docker-compose.yml'
SQL='./etc/*.sql'

function build_frontend(){
    ./build_scripts/build.sh
}

function brew_install() {
    echo 'Checking for openssl'
    brew install node n pyenv openssl docker docker-compose mysql mysql-client

    echo 'Installing node v12.18.4'
    n 12.18.4
    echo 'Installing python 3.8'
    pyenv install 3.8
    pip install virtualenv
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
    echo "Installing node modules w/ legacy deps ... as new npm is strict about it"
    npm ci
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
    printf "Moving into cloud directory\n\n"
    pushd cloud

    printf "Running db migrations\n\n"
    python manage.py migrate

    printf "Setting up cms structure\n\n"
    python manage.py readstructure

    printf "Filling in content\n\n"
    python manage.py filldata

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
    export LDFLAGS="-L/usr/local/opt/openssl@1.1/lib"
    export CPPFLAGS="-I/usr/local/opt/openssl@1.1/include"
    printf "Setting up cloud portal locally\n\n"
    setup_or_activate_virtualenv

    printf "Installing pip packages for build_scripts and cloud\n\n"
    export PYCURL_SSL_LIBRARY=openssl
    pip install -r build_scripts/requirements.txt
    pip install -r cloud/requirements.txt
    npm run node-modules --prefix cloud
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
    [[ ! -d "env" ]] && printf "Creating virtualenv named 'env'\n\n" && virtualenv env -p python3.8

    # Copy necessary config for virutalenv
    cp etc/virtual_env_template/* env

    printf "Activating python3.8 env\n\n"
    . ./env/bin/activate
}

function start_celery() {
    pushd cloud
    printf "Starting celery worker\n"
    celery worker -A notifications -l debug --concurrency=1
}

function start_docker_containers() {
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Starting mysql, redis, and meilisearch containers\n\n"
        docker-compose -f ${DOCKER_COMPOSE} up -d
        printf "\n\n"
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
    DEB_NAME=$1
    VERSION=$2
    COPY=$3
    docker image build tools --tag "mediaserver:$VERSION" --build-arg mediaserver_deb=$DEB_NAME --build-arg copy=$COPY
}

function list_mediaserver() {
    docker images | grep mediaserver
}

function remove_mediaserver() {
    docker images | grep mediaserver | awk '{print $3}' | xargs docker image rm -f
}

function run_mediaserver() {
    VERSION=$1
    PORTS="$2"
    CLOUD_HOST="$3"
    EMAIL=$4
    PASSWORD=$5
    for PORT in $PORTS
    do
        echo "Starting mediaserver $PORT"
        # See here for multi port support, but you can only spin up one at a time.
        docker run -d -p $PORT:$PORT --env PORT=$PORT --env CLOUD_HOST=$CLOUD_HOST --name "auto-nx-server-$PORT" --tmpfs /run --tmpfs /run/lock -v /sys/fs/cgroup:/sys/fs/cgroup:ro "mediaserver:$VERSION"
        if [[ -e $EMAIL ]]; then
            pushd cloud
                python manage.py bindsystem $EMAIL $PASSWORD "auto-nx-server-$PORT" http://localhost:$PORT
            popd
        fi
        echo
    done
}

function stop_mediaserver() {
    docker ps -a | grep auto-nx-server- | awk '{print $1}' | xargs docker rm -f
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
    cp webadmin/apply_customization.py $BUILD_DIR
    pushd $BUILD_DIR
        . "$REPO/webadmin/build.sh"
        ./apply_customization.py
    popd
}

# Temporary for build testing
function build_webadmin_locally_improved() {
    BUILD_DIR=~/Desktop/build
    REPO=$PWD

    export IS_LOCAL=true
    [[ -z $LC_CTYPE ]] && export LC_CTYPE=en_US.UTF-8

    [[ ! -d $BUILD_DIR ]] && mkdir $BUILD_DIR
    cp webadmin/apply_customization_new.py $BUILD_DIR
    pushd $BUILD_DIR
        . "$REPO/webadmin/build_new.sh"
        ./apply_customization_new.py
    popd
}

function local_build() {
    VERSION=$1
    PORTS="$2"
    COPY=$3
    CLOUD_HOST=$4
    BUILD_DIR=~/Desktop/build
    REPO=$PWD

    pushd $BUILD_DIR
        cp external.dat $REPO/tools/docker
    popd

    echo "Stop mediaserver"
    stop_mediaserver
    echo "Build mediaserver"
    build_mediaserver_image $VERSION.deb $VERSION $COPY
    echo "Run mediaserver"

    for PORT in $PORTS
    do
        echo "Starting mediaserver $PORT"
        run_mediaserver $VERSION $PORT $CLOUD_HOST
        sleep 10
        open https://localhost:$PORT
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

function check_licenses() {
    # pip-licenses --format=json --allow-only="MIT License;BSD License;GNU General Public License v3 (GPLv3);Python Software Foundation License;GNU General Public License (GPL);Apache Software License;Apache License 2.0;GNU Lesser General Public License v3 or later (LGPLv3+);MPL2;Historical Permission Notice and Disclaimer (HPND);BSD;MIT;Public Domain;GNU Library or Lesser General Public License (LGPL);"
    pip-licenses --format=json --with-urls --allow-only="MIT License;BSD License;GNU General Public License v3 (GPLv3);Python Software Foundation License;GNU General Public License (GPL);Apache Software License;Apache License 2.0;GNU Lesser General Public License v3 or later (LGPLv3+);MPL2;Historical Permission Notice and Disclaimer (HPND);BSD;MIT;Public Domain;GNU Library or Lesser General Public License (LGPL);Mozilla Public License 2.0 (MPL 2.0);LGPLv3+"
}

function update_requirements_licenses() {
    CI_OUTPUT=cloud/ci-license.json
    UPDATE_OUTPUT=cloud/requirements-license.json

    if [[ $CI_PIPELINE_SOURCE = *[!\ ]* ]]
    then
        LICENSE_OUTPUT_FILE=$CI_OUTPUT
    else
        LICENSE_OUTPUT_FILE=$UPDATE_OUTPUT
    fi

    echo "results will be output to $LICENSE_OUTPUT_FILE"

    check_licenses > "$LICENSE_OUTPUT_FILE"

    if [ -s $LICENSE_OUTPUT_FILE ]
    then
        if [[ $CI_PIPELINE_SOURCE = *[!\ ]* ]]
        then
            echo "checking $UPDATE_OUTPUT against $CI_OUTPUT"

            DIFF=$(diff $UPDATE_OUTPUT $CI_OUTPUT)

            if [ "$DIFF" != "" ]
            then
                echo "Please update $UPDATE_OUTPUT before trying to merge"
                exit 1
            else
                echo "python licenses up to date"
            fi
        else
            echo "updated $UPDATE_OUTPUT"
        fi
    else
        exit 1
    fi

}

for command in $@
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
        build_local_webadmin_improved)
            build_webadmin_locally_improved
            ;;
        build_local_vms)
            VERSION=$2
            PORT=$3
            COPY=$4
            CLOUD_HOST=$5
            build_webadmin_locally
            local_build $VERSION $PORT $COPY $CLOUD_HOST
            break
            ;;
        update_remote_vms)
            TARGET=$2
            build_webadmin_locally
            update_webadmin $TARGET
            break
            ;;
        build_mediaserver)
            DEB_NAME=$2
            VERSION=$3
            build_mediaserver_image $DEB_NAME $VERSION
            break
            ;;
        list_mediaserver)
            list_mediaserver
            ;;
        remove_mediaserver)
            remove_mediaserver
            ;;
        run_mediaserver)
            VERSION=$2
            PORTS="$3"
            CLOUD_HOST="$4"
            EMAIL=$5
            PASSWORD=$6
            run_mediaserver $VERSION "$PORTS" "$CLOUD_HOST" $EMAIL $PASSWORD
            break
            ;;
        stop_mediaserver)
            stop_mediaserver
            ;;
        start_https_tunnel)
            start_https_tunnel
            ;;
        dump_db)
            dump_db
            ;;
        run_local_servers)
            VERSION=$2
            PORTS="$3"
            LOCAL=$4
            SKIP_BUILD=$5
            CLOUD_HOST="cloud-test.hdw.mx"

            if [ "$LOCAL" == "true" ]; then
                build_webadmin_locally
                local_build $VERSION "$PORTS" copy $CLOUD_HOST
            else
                stop_mediaserver
                if [ "$SKIP_BUILD" != "true" ]; then
                    build_mediaserver_image $VERSION.deb $VERSION
                fi
                run_mediaserver $VERSION "$PORTS" $CLOUD_HOST
            fi

#            python tools/scripts/setup_system.py https://localhost "$PORTS" qweasd1234
            break
            ;;
        download_and_run)
            VERSION=$2
            PORTS=${3:-"7001"}
            CLOUD_HOST="cloud-test.hdw.mx"
            WEBADMIN_HOST="https://localhost"
            LOCAL_PASSWORD="qweasd1234"

            echo "fetching $VERSION"
            python tools/scripts/download_deb.py $VERSION

            echo "$VERSION has been saved to tools/$VERSION.deb"
            stop_mediaserver
            build_mediaserver_image $VERSION.deb $VERSION

            echo "Running the mediaserver on $WEBADMIN_HOST:$PORTS connected to https://$CLOUD_HOST"
            run_mediaserver $VERSION "$PORTS" $CLOUD_HOST
            for PORT in $PORTS
            do
                open "$WEBADMIN_HOST:$PORT"
            done

            sleep 30s
            python tools/scripts/setup_system.py $WEBADMIN_HOST "$PORTS" $LOCAL_PASSWORD
            break
            ;;
        update_requirements_licenses)
            update_requirements_licenses
            ;;
        update_package_licenses)
            npx recursive-check-licenses -a licenses_whitelist.json -e licenses_excluded_packages.json
            ;;
        install_cli)
            install_cli
            ;;
        *)
            echo Usage: cloud_shortcuts '[init_backend|init_frontend|add_env|build_frontend|login_db|rebuild_frontend|set_cloud_instance|setup_cms|setup_db|setup_env|start_celery|start_docker|stop_docker|build_mediaserver|run_mediaserver|stop_mediaserver|start_https_tunnel]'
            echo 'init_backend - Initializes the backend. Only run this once'
            echo 'init_frontend - Initializes the frontend.'
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
            echo 'build_mediaserver - Creates a mediaserver image. Please add the deb file to cloud_portal/tools. Usage "./cloud_helper.sh build_mediaserver {deb file} {version}"'
            echo 'list_mediaserver - List docker images build by this script'
            echo 'remove_mediaserver - Removes docker mediaserver images created by this script'
            echo 'run_mediaserver - Creates containers for mediaservers and connects them to cloud. Usage "./cloud_helper.sh run_mediaservers {version} {ports} {email} {password}"'
            echo 'run_local_servers -Stops all running mediaservers, builds a new docker image, and runs the images. Usage "./cloud_helper.sh {version} {ports}"'
            echo 'stop_mediaserver - Stops all containers made by this script'
            echo 'build_local_webadmin - Builds webadmin locally to test the build'
            echo 'build_local_vms - Builds webadmin locally, stops any running mediaservers, builds a new medisserver, runs a mediaserver, and places external.dat the new docker image. Usage "./cloud_helper.sh build_local_vms {version} {port} {copy}"'
            echo 'update_remote_vms - Copy locally built webadmin (external.dat) to a target machine. Usage "./cloud_helper.sh update_remote_vms {target-ip}"'
            echo 'start_https_tunnel - Start a secure tunnel on port 8001 to the local django server on port 8000'
            echo 'update_requirements_licenses - Updates requirements-license.json when run locally else checks if updated when CI'
            echo 'update_package_licenses - Update package-license.json with latest licensing information for cloud_portal project'
            echo 'install_cli - Installs cloud-helper CLI command globally'
            echo ''
            if ! command -v cloud-helper &> /dev/null
            then
                echo "cloud-helper CLI not installed. Installing now."
                install_cli
            else
                cloud-helper
            fi

            ;;
    esac
done
