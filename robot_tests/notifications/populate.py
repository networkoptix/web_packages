import requests
from requests.auth import HTTPBasicAuth, HTTPDigestAuth
from time import time, sleep
import json
import string
import re
from CloudSession import CloudSession

owner = "noptixautoqa+owner@gmail.com"
env = "https://test4.cloud.hdw.mx"

def bind(name):
    r = requests.post(f"{env}/cdb/system/bind", 
                      auth=HTTPBasicAuth(owner, "qweasd 123"), 
                      json={"name": name, "customization": "default"})
    print(f"binding system {name}")
    # assert r.status_code == 200, "System could not be bound."
    if r.status_code != 200:
        print("error system bind " + name)
    return r.json()

def get(bind_json):
    r = requests.get(f"{env}/cdb/system/get", 
                     auth=HTTPBasicAuth(bind_json["id"], bind_json["authKey"]))
    print(f"getting system {bind_json['id']} and {bind_json['authKey']}")
    # assert r.status_code == 200, f"{r.status_code} System could not be gotten."
    if r.status_code != 200:
        print("error getting system " + bind_json['name'])
    s = r.json()

def share(systemId, role, email):
    r = requests.post(f"{env}/cdb/system/share",
                      auth=HTTPBasicAuth(owner, "qweasd 123"), 
                      json={"systemId": systemId, "accessRole": role, "accountEmail": email})
    print(f"Sharing system {systemId} with {email}")
    # assert r.status_code == 200, f"{r.status_code} User ({email}) could not be added"
    if r.status_code != 200:
        print("error sharing " + systemId + " with " + email)
    # print(r.status_code)

def add_server(name):
    bind_json = bind(name)
    bind_json.pop('customization')
    bind_json.pop('authKeyHash')
    bind_json.pop('ownerAccountEmail')
    bind_json.pop('status')
    bind_json.pop('cloudConnectionSubscriptionStatus')
    bind_json.pop('systemSequence')
    bind_json.pop('opaque')
    bind_json.pop('registrationTime')
    bind_json.pop('system2faEnabled')
    get(bind_json)
    targetList = []
    for x in range(5):
        name = bind_json['name'].strip(string.ascii_letters) + str(x)
        share(bind_json["id"], "viewer", f"noptixautoqa+notifications{name}@gmail.com")
        targetList.append(f"noptixautoqa+notifications{name}@gmail.com")
        register_account('Mark', 'Hamill', user, 'qweasd 123')
        activate_account_via_api(user, 'qweasd 123')
    bind_json.update({"targets": targetList})
    return bind_json

def create_systems_add_users():
    systems = []
    for idx in range(2000):
        bind_json = add_server(f"notifications{idx}")
        systems.append(bind_json)
        f = open('systems.json', 'w')
        f.write(json.dumps(systems))
        f.close()

def delete_systems():
    r = requests.get(env + "/cdb/system/get", auth=HTTPBasicAuth(owner, "qweasd 123"))
    systemsDict = r.json()
    for system in systemsDict['systems']:
        d = requests.post(f'{env}/cdb/system/unbind', auth=HTTPBasicAuth(owner, "qweasd 123"),
                      json={"systemId": system['id']}, verify=False)
        if d.status_code != 200:
            print("error unbinding system " + system['name'])

def register_account(firstName, lastName, email, password):
    body = {
        "email": email,
        "password": password,
        "first_name": firstName,
        "last_name": lastName
    }
    r = requests.post(f'{env}/api/account/register', auth=HTTPBasicAuth('noptixautoqa@gmail.com', 'qweasd 123'),
                      json=body, verify=False)
    print(email + " registered")
    # return r.json()

def activate_account_via_api(email, password):
    code = get_code_from_api(email, "activate_account")
    code = re.sub(r'%3D', '=', code)
    code = re.sub(r'%2B', '+', code)
    r = requests.post(f'{env}/api/account/activate', auth=HTTPBasicAuth(email, password), json={"code":code}, verify=False)
    print(email + " activated")
    return f"{env}/authorize/activate/{r.json()}"

def get_code_from_api(email, message_type):
    with CloudSession(env, 'noptixautoqa@gmail.com', 'qweasd 123') as s:
        s.headers.update({"referer": f"{env}/authorize"})
        r = s.post(f'{env}/api/robot/get_code', json={'email': email, 'type': message_type})
        return r.json()['code']

if __name__ == "__main__":
    # delete_systems()
    # create_systems_add_users()
    f = open('systems.json', 'r')
    systemsList = json.load(f)
    for system in systemsList[1231:1232]:
        # targetList = []
        print(system['targets'])
        for target in system['targets']:
    #         name = system['name'].strip(string.ascii_letters) + str(x)
    #         targetList.append(f"noptixautoqa+notifications{name}@gmail.com")
            register_account('Mark', 'Hamill', target, 'qweasd 123')
            activate_account_via_api(target, 'qweasd 123')
    #     system.update({"targets": targetList})
    # f = open('systems.json', 'w')
    # f.write(json.dumps(systemsList))
    # f.close()