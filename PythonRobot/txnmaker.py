from NoptixLibrary.cloud_portal_api import CloudPortalAPI

cloud_instance = input("Cloud url (with https://): ").strip() or 'https://metavms.demo.cloud.hdw.mx'
email = input("Email address: ")
password = input("Password: ")
sys_id = input("System ID: ")
service_type = input("Which service: ")
txn_count = input("Number of services: ") or 0
api = CloudPortalAPI(env=cloud_instance)
services_response = api.get_services(email, password, sys_id)
print("\nCurrent services:")
print(services_response.json())
service_id = None
while True:
    for service in services_response.json():
        if service['displayName'].lower() == service_type.lower():
            service_id = service['id']
            break
    if service_id:
        break
    else:
        print("\nService not found.")
        service_type = input("Which service: ")

service_change_response = api.change_sub(email, password, sys_id, service_id, txn_count)
print("\nNew services: ")
print(service_change_response.json())
