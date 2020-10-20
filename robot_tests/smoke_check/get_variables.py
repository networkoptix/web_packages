
CLOUD_HOSTS = {
    "test": ["https://cloud-test.hdw.mx", "http://cloud-test.hdw.mx"],
    "dev2": ["https://dev2.cloud.hdw.mx", "http://dev2.cloud.hdw.mx"],
    "stage": ["https://stage.nxvms.com", "http://stage.nxvms.com"]
}


def get_tag(env):
    for tag, urls in CLOUD_HOSTS.items():
        if env in urls:
            return tag


def get_variables(env, vms):
    vars = {}

    tag = get_tag(env)
    vars["ENV"] = env
    vars["IMAGE"] = f'{vms}_{tag}'

    return vars
