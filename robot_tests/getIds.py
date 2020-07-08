import requests
import re
def get_variables(cloud_url, test_email):
    systemIds = {}
    #the post request gets upset about ssl if you put the s so we remove it
    if cloud_url == "https://vm201.la.hdw.mx":
        p = re.compile("https")
        cloud_url = p.sub("http", cloud_url)
    #get the system id for the system with the autotestsanchor email and add it to the dictionary
    r = requests.post(f"{cloud_url}/cdb/system/get", auth=requests.auth.HTTPDigestAuth(f"{test_email}+autotestsanchor@gmail.com", "qweasd 123"), json={"name":"Auto Tests"})
    s = r.json()
    systemIds["AUTO TESTS SYSTEM ID"] = s["systems"][0]["id"]

    #get the system id for the system with the autotests2anchor email and add it to the dictionary
    t = requests.post(f"{cloud_url}/cdb/system/get", auth=requests.auth.HTTPDigestAuth(f"{test_email}+autotests2anchor@gmail.com", "qweasd 123"), json={"name":"Auto Tests"})
    u = t.json()
    systemIds["AUTOTESTS OFFLINE SYSTEM ID"] = u["systems"][0]["id"]

    #get the system id for the system with the 2serveranchor email and add it to the dictionary
    a = requests.post(f"{cloud_url}/cdb/system/get", auth=requests.auth.HTTPDigestAuth(f"{test_email}+2serveranchor@gmail.com", "qweasd 123"), json={"name":"Auto Tests"})
    b = a.json()
    systemIds["AUTOTESTS 2 SERVER SYSTEM ID"] = b["systems"][0]["id"]
    
     #get the system id for the system running 4.0 and add it to the dictionary
    d = requests.post(f"{cloud_url}/cdb/system/get", auth=requests.auth.HTTPDigestAuth(f"{test_email}+4.0serveranchor@gmail.com", "qweasd 123"), json={"name":"Auto Tests"})
    e = d.json()
    systemIds["AUTO TESTS 4.0 SYSTEM ID"] = e["systems"][0]["id"]

    #return the dictionary as variables into robot
    return systemIds

if __name__ == '__main__':
    get_variables("https://dev2.cloud.hdw.mx", "noptixautoqa")
