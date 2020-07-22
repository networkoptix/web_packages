import requests
import re
import socket

def get_variables(cloud_url, test_email):
    vars = {}
    # the post request gets upset about ssl if you put the s so we remove it
    if cloud_url == "https://vm201.la.hdw.mx":
        p = re.compile("https")
        cloud_url = p.sub("http", cloud_url)
    # get the system id for the system with the autotestsanchor email and add it to the dictionary
    r = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=requests.auth.HTTPDigestAuth(f"{test_email}+autotestsanchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    s = r.json()
    vars["AUTO TESTS SYSTEM ID"] = s["systems"][0]["id"]

    # get the system id for the system with the autotests2anchor email and add it to the dictionary
    t = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=requests.auth.HTTPDigestAuth(f"{test_email}+autotests2anchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    u = t.json()
    vars["AUTOTESTS OFFLINE SYSTEM ID"] = u["systems"][0]["id"]

    # get the system id for the system with the 2serveranchor email and add it to the dictionary
    a = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=requests.auth.HTTPDigestAuth(f"{test_email}+2serveranchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    b = a.json()
    vars["AUTOTESTS 2 SERVER SYSTEM ID"] = b["systems"][0]["id"]

    # get the system id for the system running 4.0 and add it to the dictionary
    d = requests.post(f"{cloud_url}/cdb/system/get",
                      auth=requests.auth.HTTPDigestAuth(f"{test_email}+4.0serveranchor@gmail.com", "qweasd 123"),
                      json={"name": "Auto Tests"})
    e = d.json()
    vars["AUTO TESTS 4.0 SYSTEM ID"] = e["systems"][0]["id"]

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