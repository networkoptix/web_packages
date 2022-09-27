export const brandColor = '#2FA2DB';

const initializationCommands: MenuNode = {
    label: 'Initialization Commands',
    help: 'Utilities to help get you setup',
    value: [
        {
            label: 'Init Backend',
            command: 'init_backend',
            help: 'Initializes the backend. Only run this once',
            value: [],
        },
        {
            label: 'Init Frontend',
            command: 'init_frontend',
            help: 'Initializes the frontend.',
            value: [],
        },
        {
            label: 'Build Frontend',
            command: 'build_frontend',
            help: 'Builds the frontend',
            value: []
        },
        {
            label: 'Rebuild Frontend',
            command: 'rebuild_frontend',
            help: 'Rebuilds the frontend and runs readstructure and filldata commands',
            value: []
        },
        {
            label: 'Setup DB',
            command: 'setup_db',
            help: 'Loads local db with sql file in ~/develop/nx_vms/cloud_portal/',
            value: []
        },
        {
            label: 'Setup CMS',
            command: 'setup_cms',
            help: 'Fills in the cms. Runs migrate, readstructure and filldata commands',
            value: []
        }
    ],
};

const vmsUtilityCommands: MenuNode = {
    label: 'VMS Build Commands',
    help: 'To build or run VMS locally',
    value: [
        {
            label: 'Build Local VMS',
            command: 'build_local_vms',
            help: 'Builds webadmin locally, stops any running mediaservers, builds a new medisserver, runs a mediaserver, and places external.dat the new docker image. Usage "./cloud_helper.sh build_local_vms {version} {port} {copy}"',
            optionalArgs: true,
            value: []
        },
        {
            label: 'Build MediaServer',
            command: 'build_mediaserver',
            help: 'Creates a mediaserver image. Please add the deb file to cloud_portal/tools. Usage "./cloud_helper.sh build_mediaserver {deb file} {version}',
            optionalArgs: true,
            value: [],
        },
        {
            label: 'List Mediaservers',
            command: 'list_mediaserver',
            help: 'List docker images build by this script',
            value: []
        },
        {
            label: 'Remove Mediaserver',
            command: 'remove_mediaserver',
            help: 'Removes docker mediaserver images created by this script',
            value: []
        },
        {
            label: 'Run Mediaserver',
            command: 'run_mediaserver',
            help: 'Creates containers for mediaservers and connects them to cloud. Usage "./cloud_helper.sh run_mediaservers {version} {ports} {email} {password}"',
            optionalArgs: true,
            value: []
        },
        {
            label: 'Run Local Servers',
            command: 'run_local_servers',
            help: 'Stops all running mediaservers, builds a new docker image, and runs the images. Usage "./cloud_helper.sh {version} {ports}"',
            optionalArgs: true,
            value: []
        },
        {
            label: 'Stop Mediaserver',
            command: 'stop_mediaserver',
            help: 'Stops all containers made by this script',
            value: []
        },
        {
            label: 'Update Remove VMS',
            command: 'update_remote_vms',
            optionalArgs: true,
            help: 'Copy locally built webadmin (external.dat) to a target machine. Usage "./cloud_helper.sh update_remote_vms {target-ip}"',
            value: []
        },
    ],
};

const cloudUtilityCommands: MenuNode = {
    label: 'Cloud Utility Commands',
    help: 'Various utilities to maintain local cloud environment',
    value: [
        {
            label: 'Add ENV',
            command: 'add_env',
            help: 'Adds LOCAL_ENV to your bash profile',
            value: []
        },
        {
            label: 'Generate CMS Docs',
            command: 'generate_cms_docs',
            help: 'Creates an html file for each product in cms/cms_structure.json',
            value: []
        },
        {
            label: 'Login DB',
            command: 'login_db',
            help: 'Login to docker db',
            value: []
        },
        {
            label: 'Set Cloud Instance',
            command: 'set_cloud_instance',
            help: "Sets the cloud instance env. Usage 'source ./cloud_helper.sh set_cloud_instance $instance'.",
            optionalArgs: true,
            value: []
        },
        {
            label: 'Start Celery',
            command: 'start_celery',
            help: 'Starts celery worker (This uses sqs queue based on local settings)',
            value: []
        },
        {
            label: 'Start Docker',
            command: 'start_docker',
            help: 'Starts docker containers used by cloud',
            value: []
        },
        {
            label: 'Stop Docker',
            command: 'stop_docker',
            help: 'Stop docker containers used by cloud',
            value: []
        },
        {
            label: 'Start HTTPS Tunner',
            command: 'start_https_tunnel',
            help: 'Start a secure tunnel on port 8001 to the local django server on port 8000',
            value: []
        }
    ]
};

export interface MenuNode {
	label: string;
	key?: string;
	command?: string;
	help?: string
	optionalArgs?: boolean;
	value: MenuNode[];
}

export const baseMenu: MenuNode = {
    label: 'Cloud Helper Menu',
    value: [
        initializationCommands,
        vmsUtilityCommands,
        cloudUtilityCommands,
        {
            label: 'Setup Robot Environment',
            command: 'setup_robot_env',
            help: 'Setups robot env. Run after placing the chromedriver in robot_tests',
            value: []
        }
    ],
};
