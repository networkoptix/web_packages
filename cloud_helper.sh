#!/usr/bin/env bash

DOCKER_COMPOSE='etc/docker-compose.yml'
#SQL='./etc/cloud-dev2.sql'
SQL='./etc/*.sql'


function build_frontend(){
    ./build_scripts/build.sh
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

function login_db(){
    mysql -h 0.0.0.0 --port=3306 -uroot cloudportal
}

function setup_env(){
    printf "Setting up cloud portal locally\n\n"
    [[ ! -d "env" ]] && printf "Creating virtualenv named 'env'\n\n" && virtualenv env -p python3.7

    printf "Activating python3.7 env\n\n"
    . ./env/bin/activate

    printf "Installing pip packages for build_scripts and cloud\n\n"
    export PYCURL_SSL_LIBRARY=openssl
    pip install -r build_scripts/requirements.txt
    pip install -r cloud/requirements.txt
}

function start_celery() {
    pushd cloud
    printf "Starting celery worker\n"
    celery worker -A notifications -l debug --concurrency=1
}

function start_docker_containers() {
    if [[ -e ${DOCKER_COMPOSE} ]]; then
        printf "Starting mysql and redis containers\n\n"
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
    docker image build robot_tests/Docker --tag "mediaserver:$VERSION" --build-arg mediaserver_deb=$DEB_NAME
}

function run_mediaserver() {
    VERSION=$1
    PORTS="$2"
    EMAIL=$3
    PASSWORD=$4
    for PORT in $PORTS
    do
        echo "Starting mediaserver $PORT"
        docker run -d -p $PORT:7001 --name "auto-nx-server-$PORT" --tmpfs /run --tmpfs /run/lock -v /sys/fs/cgroup:/sys/fs/cgroup:ro "mediaserver:$VERSION"
        python cloud/manage.py bindsystem $EMAIL $PASSWORD "auto-nx-server-$PORT" http://localhost:$PORT
        echo
    done
}

function stop_mediaserver() {
    docker ps | grep auto-nx-server- | awk '{print $1}' | xargs docker rm -f
}

for command in $@
do
    case "$command" in
        init)
            modify_bashprofile
            start_docker_containers
            setup_env
            setup_db
            build_frontend
            setup_cms
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
            printf "Installing cloud requirements\n\n"
            pip install -r cloud/requirements.txt
            build_frontend
            setup_cms
            ;;
        setup_cms)
            . ./env/bin/activate
            setup_cms
            ;;
        setup_db)
            setup_db
            ;;
        setup_env)
            setup_env
            ;;
        set_cloud_instance)
            if [[ -z ${CLOUD_INSTANCE} ]]; then
                echo -e "\nexport CLOUD_INSTANCE=$2" >> ~/.bash_profile
            else
                sed -i '' "s,CLOUD_INSTANCE=.*,CLOUD_INSTANCE=${2},g" ~/.bash_profile
            fi
            export CLOUD_INSTANCE=$2
            echo "If command was not run with source it will not work"
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
        build_mediaserver)
            DEB_NAME=$2
            VERSION=$3
            build_mediaserver_image $DEB_NAME $VERSION
            break
            ;;
        run_mediaserver)
            VERSION=$2
            PORTS="$3"
            EMAIL=$4
            PASSWORD=$5
            run_mediaserver $VERSION "$PORTS" $EMAIL $PASSWORD
            break
            ;;
         stop_mediaserver)
            stop_mediaserver
            ;;
        *)
            echo Usage: cloud_shortcuts '[init|add_env|build_frontend|login_db|rebuild_frontend|set_cloud_instance|setup_cms|setup_db|setup_env|start_celery|start_docker|stop_docker|build_mediaserver|run_mediaserver|stop_mediaserver]'
            echo 'init - Does everything. Only run this once'
            echo 'add_env - Adds LOCAL_ENV to your bash profile'
            echo 'build_frontend - Builds the frontend'
            echo 'generate_cms_docs - Creates an html file for each product in cms/cms_structure.json'
            echo 'login_db - Login to docker db'
            echo 'rebuild_frontend - Rebuilds the frontend and runs readstructure and filldata commands'
            echo 'set_cloud_instance - Sets the cloud instance env. Usage "source ./cloud_helper.sh set_cloud_instance $instance".'
            echo 'setup_cms - Fills in the cms. Runs migrate, readstructure and filldata commands'
            echo 'setup_db - Loads local db with sql file in ~/develop/nx_vms/cloud_portal/'
            echo 'start_celery - Starts celery worker (This uses sqs queue based on local settings)'
            echo 'start_docker - Starts docker containers used by cloud'
            echo 'stop_docker - Stops docker containers used by cloud'
            echo 'build_mediaserver - Creates a mediaserver image. Please add the deb file to cloud_portal/robot_tests/Docker. Usage "./cloud_helper.sh build_mediaserver {deb file} {version}"'
            echo 'run_mediaserver - Creates containers for mediaservers and connects them to cloud. Usage "./cloud_helper.sh run_mediaservers {version} {ports} {email} {password}"'
            echo 'stop_mediaserver - Stops all containers made by this script'
            ;;
    esac
done
