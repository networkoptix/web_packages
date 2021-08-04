import requests
from requests.auth import HTTPBasicAuth, HTTPDigestAuth
from time import time, sleep

owner = "noptixautoqa+owner@gmail.com" 
env = "https://test4.cloud.hdw.mx"

def bind(name):
    r = requests.post(f"{env}/cdb/system/bind", 
                      auth=HTTPBasicAuth(owner, "qweasd 123"), 
                      json={"name": name, "customization": "default"})
    print(f"binding system {name}")
    assert r.status_code == 200, "System could not be bound."
    return r.json()

def get(bind_json):
    r = requests.get(f"{env}/cdb/system/get", 
                     auth=HTTPBasicAuth(bind_json["id"], bind_json["authKey"]))
    print(f"getting system {bind_json['id']}")
    assert r.status_code == 200, f"{r.status_code} System could not be gotten."
    s = r.json()

def share(systemId, role, email):
    r = requests.post(f"{env}/cdb/system/share",
                      auth=HTTPBasicAuth(owner, "qweasd 123"), 
                      json={"systemId": systemId, "accessRole": role, "accountEmail": email})
    print(f"Sharing system {systemId} with {email}")
    assert r.status_code == 200, f"{r.status_code} User ({email}) could not be added"

def add_server(name, idx):
    bind_json = bind(name)
    get(bind_json)
    for x in range(idx*10, idx*10+10):
        name = int(time())
        share(bind_json["id"], "viewer", f"noptixautoqa+notifications{x}@gmail.com")

def create_systems_add_users():
    r = requests.get(f"{env}/api/utils/cloudCapabilities",
                     auth=HTTPBasicAuth(owner, "qweasd 123"))
    #IMPORTANT: This check is required so as not to slam the smtp server and ruin our alloted emails for the month
    try:    
        if r.json()["smtpDisabled"]:
            for idx in range(1000):
                add_server(f"notifications{idx}", idx)
    except KeyError:
        print("Key Error, this means that SMTP is enabled.  Disable it to continue.")

if __name__ == "__main__":
    create_systems_add_users()