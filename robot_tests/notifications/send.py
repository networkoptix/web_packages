import requests
from requests.auth import HTTPDigestAuth, HTTPBasicAuth
import uuid
import json
import string

CLOUD_HOST = 'test4.cloud.hdw.mx'

SYSTEM_ID = '2d431e69-39ee-4899-b372-e76f5b32dad8'
SYSTEM_AUTH_KEY = 'lBFCHJBWPKCvnfVeIbXc'
TARGET_USERS = ['noptixautoqa+notifications0@gmail.com', 'noptixautoqa+notifications1@gmail.com']


def create_systems_list(email, password):
    r = requests.get("https://" + CLOUD_HOST + "cdb/system/get", auth=HTTPBasicAuth(email, password))
    systemsDict = r.json()
    systemsList = []
    for system in systemsDict['systems']:
        systemsList.append(system)
    sortedList = sorted(systemsList, key=lambda i: i['registrationTime'])
    sysID = 1
    systemsList = []
    for system in sortedList:
        authKey = system["authKey"]
        id = system["id"]
        name = system["name"]
        # title = str(sysID) + " " + str(uuid.uuid1())
        emailIntStart = (int(name.strip(string.ascii_letters))) * 5
        emailIntEnd = emailIntStart + 5
        targetList = []
        for x in range(emailIntStart, emailIntEnd):
            targetList.append(f"noptixautoqa+notifications{x}@gmail.com")
        systemsList.append({"authKey": authKey, "id": id, "targets": targetList})
        sysID += 1
    return systemsList
    # f = open('systems.json', 'w')
    # f.write(json.dumps(systemsJson))
    # f.close()

def send_notification(notification_dict, targets, system_id, system_auth_key):
    requests.post(
        f'https://{CLOUD_HOST}/cloud_notifications/receiver/api/v1/send_notification',
        auth=HTTPBasicAuth(system_id, system_auth_key),
        json={
            'targets': targets,
            'systemId': system_id,
            'notification': notification_dict
        }
    )

if __name__ == '__main__':
    systems = create_systems_list("noptixautoqa+owner@gmail.com", "qweasd 123")
    for system in systems:
        for x in range(5):
            send_notification({'targets': system['targets'], 'count': x}, system['targets'], system['id'], system['authKey'])