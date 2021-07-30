import requests

import json


url = "https://test4.cloud.hdw.mx/cdb/system/get"

payload = {}
headers = {
  'Authorization': 'Digest username="noptixautoqa+owner@gmail.com", realm="VMS", nonce="14551660501834856447", uri="/cdb/system/get", algorithm="MD5", response="22c2f11425b71f6b4349789743bb526f"'
}

response = requests.request("GET", url, headers=headers, data = payload)

print(response.text.encode('utf8'))



url = "https://test4.cloud.hdw.mx/cdb/system/unbind"
for system in response.json()["systems"]:
    print(system["id"])
    payload  = json.dumps({"systemId":system["id"]})
    print(payload)
    headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Digest username="noptixautoqa+owner@gmail.com", realm="VMS", nonce="15472127817180438469", uri="/cdb/system/unbind?=", algorithm="MD5", response="d2fa392c61b5f65210efff60532b0743"'
}
    
    response = requests.request("POST", url, headers=headers, data = payload)
    print(response.text.encode('utf8'))
