MODULES=(cloud_portal cloud_portal_nginx)
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"009544449203.dkr.ecr.eu-central-1.amazonaws.com"}

case $(uname -s) in
    Linux)
        OS=linux
        SED="sed -i.bak"
        ;;
    Darwin)
        OS=mac
        SED="sed -i '.bak'"
        ;;
    *)
        OS=unknown
        SED=unknown
        ;;
esac


function is_dir_by_var()
{
    local varname=$1
    local dirpath=$(eval 'echo $'"$varname")

    [ -z "$dirpath" ] && { echo "Variable \"\$$varname\" is not defined"; return 1; }
    [ ! -d "$dirpath" ] && { echo "Directory \"$dirpath\" pointed by \"\$$varname\" variable does not exist"; return 1; }

    return 0
}

function check_vms_dirs()
{
    is_dir_by_var environment || { echo Exiting..; exit 1; }
    is_dir_by_var NX_PORTAL_DIR || { echo Exiting..; exit 1; }
}

function copy_deps()
{
    local binary=$1
    local src=$2
    local dest=$3

    local libs="$(LD_LIBRARY_PATH=$src ldd $binary | awk '{print $1}' | grep -v /)"

    for lib in $libs
    do
        [ -f "$src/$lib" -a ! -f "$dest/$lib" ] && cp -l $src/$lib $dest
    done

    true
}

function pack()
{
    echo "Packing $MODULE:$VERSION to a container"
    local COMMON_BUILD_ARGS=(--build-arg VERSION="$VERSION" --build-arg REVISION="$REVISION" --build-arg BUILD_DATE="$BUILD_DATE" --build-arg BUILD_HOST="$BUILD_HOST" --build-arg BUILD_USER="$BUILD_USER" --build-arg BUILD_NUMBER="$BUILD_NUMBER" --build-arg ARTIFACTORY_HOST="$ARTIFACTORY_HOST" --build-arg ARTIFACTORY_URL="$ARTIFACTORY_URL")

    grep 'ARG.*DOCKER_REGISTRY' Dockerfile >& /dev/null && COMMON_BUILD_ARGS=("${COMMON_BUILD_ARGS[@]}" --build-arg DOCKER_REGISTRY="$DOCKER_REGISTRY")

    local ALL_ARGS=("${COMMON_BUILD_ARGS[@]}" "${BUILD_ARGS[@]}")

    docker build -t $MODULE:$VERSION "${ALL_ARGS[@]}" .
}

function pushns()
{
    echo "Pushing $MODULE:$VERSION to the private registry"
    docker tag $MODULE:$VERSION la.hdw.mx:5000/$MODULE:$VERSION
    docker push la.hdw.mx:5000/$MODULE:$VERSION

    docker tag $MODULE:$VERSION la.hdw.mx:5000/$MODULE:latest
    docker push la.hdw.mx:5000/$MODULE:latest
}

function push()
{
    local branch="$(git branch --show-current)"

    echo "Pushing $MODULE:$VERSION to the registry"
    [ -z "$REPOSITORY_PATH" ] && REPOSITORY_PATH=/cloud

    REPOSITORY=$DOCKER_REGISTRY$REPOSITORY_PATH

    if [ -n "${DOCKER_IMAGE_CI_TAG}" ]
    then
        docker tag $MODULE:$VERSION $REPOSITORY/$MODULE:"${DOCKER_IMAGE_CI_TAG}"
        docker push $REPOSITORY/$MODULE:"${DOCKER_IMAGE_CI_TAG}"
    else
        docker tag $MODULE:$VERSION $REPOSITORY/$MODULE:$VERSION
        docker push $REPOSITORY/$MODULE:$VERSION
    fi
}

function publish()
{
    stage
    pack
    push
}

function clean()
{
    echo "Cleaning image $MODULE:$VERSION"
    docker images -q $MODULE:$VERSION | xargs docker rmi -f
}

function version()
{
    echo $VERSION
}

function main()
{
    local n=1

    # Check if we have docker here
    if ! docker info &> /dev/null; then
        echo 'No docker server found. If you are Evgeny make sure docker-machine is runnning.'
        exit 1
    fi

    numargs=$#
    for ((n=1;n <= numargs; n++))
    do
        func=$1; shift
        $func
    done
}
