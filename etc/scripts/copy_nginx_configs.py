import argparse
import os
import shutil
import subprocess
import re

DATA_HOSTS_STR = ("https://relay.relay.cloud.hdw.mx "
                  "https://relay.cloud.hdw.mx "
                  "https://*.relay.relay.cloud.hdw.mx "
                  "https://*.relay.cloud.hdw.mx "
                  "https://nxcloud-test-integrations-static.s3.amazonaws.com "
                  "https://*.hdw.mx https://*.vmsproxy.com")
CUSTOMIZATION = 'default'
PORTAL_HOST = 'localhost'
PORTAL_BUCKET = 'cloud-portal'


def get_nginx_conf_path():
    # 'nginx -V' print output to stderr
    output = subprocess.run(['nginx',  '-V'], check=True, stderr=subprocess.PIPE).stderr.decode('utf-8')
    conf_path = output.split('--conf-path=')[1].split(' ')[0]
    if not conf_path:
        raise Exception('Cannot resolve nginx conf-path.')
    return os.path.dirname(conf_path)


def vars_substitute():
    os.environ['DOLLAR'] = '$'
    os.environ['CUSTOMIZATION'] = args.customization
    os.environ['DATA_HOSTS_STR'] = DATA_HOSTS_STR
    os.environ['PORTAL_HOST'] = args.portal_host
    os.environ['PORTAL_BUCKET'] = args.portal_bucket

    with open(os.path.join(NGINX_DEPLOYMENT_DIR, 'nginx.conf.template'), 'r') as template_file:
        template = template_file.read()
    comment = False

    # Commenting lines which are not needed in local nginx
    lines = template.splitlines()

    for i in range(0, len(lines)):
        line = lines[i]
        if '# Remove for local #' in line:
            comment = True

        if comment:
            lines[i] = '#' + line

        if '# Remove for local END #' in line:
            comment = False

    template = '\n'.join(lines)

    # formatting file with envsubst as it's made while deploying
    p = subprocess.Popen(['envsubst'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    output = p.communicate(input=template)
    if not output[0] or output[1]:
        raise Exception(f'Cannot get envsubst result. Errors: {output[1]}')
    with open(os.path.join(NGINX_LOCAL_DIR, 'nginx.test.conf'), 'w') as outfile:
        outfile.write(output[0])
    with open(os.path.join(NGINX_LOCAL_DIR, 'nginx.conf.template'), 'w') as outfile:
        outfile.write(template)


def copy_files():
    nginx_conf_path = get_nginx_conf_path()
    shutil.copy(
        os.path.join(NGINX_DEPLOYMENT_DIR, 'proxy.conf'),
        os.path.join(NGINX_LOCAL_DIR, 'proxy.conf')
    )
    shutil.copy(
        os.path.join(NGINX_DEPLOYMENT_DIR, 'static_caching.conf'),
        os.path.join(NGINX_LOCAL_DIR, 'static_caching.conf')
    )
    shutil.copy(
        os.path.join(NGINX_DEPLOYMENT_DIR, 'one_day_caching.conf'),
        os.path.join(NGINX_LOCAL_DIR, 'one_day_caching.conf')
    )
    shutil.copy(
        os.path.join(CLOUD_PORTAL_CONF_DIR, 'scripts/run_nginx.sh'),
        os.path.join(NGINX_LOCAL_DIR, 'run_nginx.sh')
    )
    shutil.copy(
        os.path.join(CLOUD_PORTAL_CONF_DIR, 'scripts/test_nginx.sh'),
        os.path.join(NGINX_LOCAL_DIR, 'test_nginx.sh')
    )
    shutil.copy(
        os.path.join(nginx_conf_path, 'mime.types'),
        os.path.join(NGINX_LOCAL_DIR, 'mime.types')
    )


def run():
    nginx_conf_path = get_nginx_conf_path()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--project_dir", help="Cloud Portal project root directory.",
                        required=False,
                        type=str)
    parser.add_argument("--portal_bucket", help="Cloud Portal project root directory.",
                        required=False,
                        type=str,
                        default=PORTAL_BUCKET)
    parser.add_argument("--portal_host", help="Cloud Portal project root directory.",
                        required=False,
                        type=str,
                        default=PORTAL_HOST)
    parser.add_argument("--customization", help="Cloud Portal project root directory.",
                        required=False,
                        type=str,
                        default=CUSTOMIZATION)

    args = parser.parse_args()

    if not args.project_dir:
        CLOUD_PORTAL_CONF_DIR = os.environ.get('CLOUD_PORTAL_CONF_DIR', '')
        if not CLOUD_PORTAL_CONF_DIR:
            raise ValueError('project_dir argument must be set.')
        args.project_dir = os.path.dirname(CLOUD_PORTAL_CONF_DIR)
    else:
        CLOUD_PORTAL_CONF_DIR = os.path.join(args.project_dir, 'etc')
    NGINX_DEPLOYMENT_DIR = os.path.join(args.project_dir, 'deploy/cloud_portal_nginx')
    NGINX_LOCAL_DIR = os.path.join(CLOUD_PORTAL_CONF_DIR, 'nginx')
    os.makedirs(NGINX_LOCAL_DIR, exist_ok=True)
    vars_substitute()
    copy_files()