import requests

# ENV = "https://cloud-test.hdw.mx"
#
# USERNAME = ""
# PASSWORD = ""

class CloudAuth(object):
    def __init__(self, ENV):
        self.ENV = ENV
        self.session = requests.Session()

    def request_wrapper(self, url, method='get', query=None, data=None):
        request = (self.session.get if method == 'get' else self.session.post)

        res = request(f"{self.ENV}{url}", params=query, json=data)
        res.raise_for_status()
        return res.json()

    def get_access_code(self, username, password):
        data = {
            "client_id": "cloud_portal",
            "grant_type": "password",
            "response_type": "code",
            "email": username,
            "password": password,
            "redirect_uri": ""
        }
        return self.request_wrapper("/oauth/authenticate", method='post', data=data)

    def verify_with_2fa(self, code, verification_code):
        query = {
            "code": code,
            "verification_code": verification_code
        }
        return self.request_wrapper("/api/2fa/verification", query=query)

    def verify_with_backup(self, code, backup_code):
        query = {
            "code": code,
            "verification_code": backup_code
        }
        return self.request_wrapper("/api/2fa/backup", query=query)

    def login_with_code(self, username, password, backup_code=None, verification_code=None):
        data = self.get_access_code(username, password)
        code = data.get('code') or data.get('access_code')
        if 'error' in data:
            if not backup_code and not verification_code:
                raise Exception('Verification code is missing')
            try:
                if verification_code:
                    self.verify_with_2fa(code, verification_code)
                else:
                    self.verify_with_backup(code, backup_code)
            except requests.exceptions.HTTPError as e:
                print(e)

        return self.request_wrapper("/api/account/loginCode", method='post', data={"code": code})

# if __name__ == "__main__":
#     auth = CloudAuth()
#     auth.login_with_code(USERNAME, PASSWORD)
#     print(auth.session.cookies.get_dict())
