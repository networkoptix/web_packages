

def get_variables(env, vms):
    vars = {}
    url = "http://10.1.5.182"
    vars["server_vms"] = url
    vars["server_users"] = url
    if 'cloud-test' in env:
        if vms == '4.0':
            vars["system_vms"] = "4.0_smoke_test_1"
            vars["system_users"] = "4.0_smoke_test_2"
            vars["server_vms_port"] = 7021
            vars["server_users_port"] = 7022
        elif vms == '4.1':
            vars["system_vms"] = "4.1_smoke_test_1"
            vars["system_users"] = "4.1_smoke_test_2"
            vars["server_vms_port"] = 7011
            vars["server_users_port"] = 7012
    elif 'nxvms' in env:
        if vms == '4.0':
            vars["system_vms"] = "4.0_smoke_prod_1"
            vars["system_users"] = "4.0_smoke_prod_2"
            vars["server_vms_port"] = 7031
            vars["server_users_port"] = 7032
        elif vms == '4.1':
            vars["system_vms"] = "4.1_smoke_prod_1"
            vars["system_users"] = "4.1_smoke_prod_2"
            vars["server_vms_port"] = 7041
            vars["server_users_port"] = 7042

    return vars