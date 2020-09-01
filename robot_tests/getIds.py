import requests
from requests.auth import HTTPDigestAuth
import re
import socket
import urllib3


def get_variables(cloud_url, test_email):
    if 'nxvms.com' in cloud_url:
        relay = 'relay.vmsproxy.com'
    else:
        relay = 'relay.vmsproxy.hdw.mx'
    vars = {}
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # the post request gets upset about ssl if you put the s so we remove it
    if cloud_url == "https://vm201.la.hdw.mx":
        p = re.compile("https")
        cloud_url = p.sub("http", cloud_url)

    # get the system id for the system with the autotestsanchor email and add it to the dictionary
    r = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=HTTPDigestAuth(f"{test_email}+autotestsanchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    s = r.json()
    sys_id = s["systems"][0]["id"]
    vars["AUTO TESTS SYSTEM ID"] = sys_id
    r = requests.get(f"https://{sys_id}.{relay}/api/systemSettings?statisticsAllowed=false&statisticsReportTimeCycle=null",
                     auth=HTTPDigestAuth("admin", "qweasd 123"),
                     verify=False)

    # get the system id for the system with the autotests2anchor email and add it to the dictionary
    t = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=HTTPDigestAuth(f"{test_email}+autotests2anchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    u = t.json()
    vars["AUTOTESTS OFFLINE SYSTEM ID"] = u["systems"][0]["id"]

    # get the system id for the system with the 2serveranchor email and add it to the dictionary
    a = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=HTTPDigestAuth(f"{test_email}+2serveranchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    b = a.json()
    sys_id = b["systems"][0]["id"]
    vars["AUTOTESTS 2 SERVER SYSTEM ID"] = sys_id
    r = requests.get(f'https://{sys_id}.{relay}/api/systemSettings?statisticsAllowed=false&statisticsReportTimeCycle=null',
                     auth=HTTPDigestAuth("admin", "qweasd 123"),
                     verify=False)

    # get the system id for the system running 4.0 and add it to the dictionary
    d = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=requests.auth.HTTPDigestAuth(f"{test_email}+4.0serveranchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    e = d.json()
    sys_id = e["systems"][0]["id"]
    vars["AUTO TESTS 4.0 SYSTEM ID"] = sys_id
    r = requests.get(f'https://{sys_id}.{relay}/api/systemSettings?statisticsAllowed=false&statisticsReportTimeCycle=null',
                     auth=HTTPDigestAuth("admin", "qweasd 123"),
                     verify=False)

    #get the system id for the system with the 2serverofflineanchor email and add it to the dictionary
    x = requests.post(f"{cloud_url}/cdb/system/get", 
                      auth=HTTPDigestAuth(f"{test_email}+2serverofflineanchor@gmail.com", "qweasd 123"),
                      json={"name":"Auto Tests"})
    y = x.json()
    vars["AUTOTESTS 2 SERVER OFFLINE SYSTEM ID"] = y["systems"][0]["id"]

    domain = cloud_url.split('//')[1]
    key = domain.split('.')[0]
    if key == 'cloud-test':
        key = 'test'
    if key == 'nxvms':
        key = 'prod'
    vars["IMAGE 4.0"] = f'4.0_{key}'
    vars["IMAGE 4.1"] = f'4.1_{key}'

    hostname = socket.gethostname()
    ip = socket.gethostbyname(hostname)
    vars["LOCALHOST"] = f'http://{ip}'

    # return the dictionary as variables into robot
    return vars
