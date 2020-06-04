

def get_variables(env):
    vars = {}
    url = "http://10.1.5.182"
    if env == 'https://cloud-test.hdw.mx':
        vars["system_vms"] = "4.0_smoke_test_1"
        vars["system_users"] = "4.0_smoke_test_2"
        vars["server_vms"] = url
        vars["server_vms_port"] = 7021
        vars["server_users"] = url
        vars["server_users_port"] = 7022
    elif env == 'https://nxvms.com':
        vars["system_vms"] = "4.0_smoke_prod_1"
        vars["system_users"] = "4.0_smoke_prod_2"
        vars["server_vms"] = url
        vars["server_vms_port"] = 7031
        vars["server_users"] = url
        vars["server_users_port"] = 7032

    return vars
