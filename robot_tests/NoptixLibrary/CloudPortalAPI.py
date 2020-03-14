import requests
from requests.auth import HTTPDigestAuth
import base64


class CloudPortalAPI(object):

    def log_in(self, env, email, password):
        s = requests.Session()
        r = s.post(f'{env}/api/account/login', json={'email': email, 'password': password})
        assert r.status_code == 200, "Log In Failed"
        return s

    # TODO implement logging out using API where appropriate
    def log_out(self, env, session_id, csrftoken):
        with requests.Session() as s:
            s.headers.update({'X-CSRFToken': csrftoken})
            s.headers.update({'cookie': 'csrftoken=' + csrftoken + '; sessionid=' + session_id})
            r = s.post(f'{env}/api/account/logout')
            return r.status_code

    def change_password(self, env, email, old_password, new_password):
        with self.log_in(env, email, old_password) as s:
            data = {'old_password': old_password, 'new_password': new_password}
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/account/changePassword', data)
            return r.status_code

    def restore_password(self, env, email, code=None, new_password=None):
        with requests.Session() as s:
            data = {'user_email': email}
            if code and new_password:
                data.update({'code': code, 'new_password': new_password})
            r = s.post(f'{env}/api/account/restorePassword', data)
            return r.status_code

    def get_language_anonymous(self, env):
        r = requests.get(env + '/api/utils/language')
        return r.json()['ajs']['language']

    def get_account_language(self, env, email, password):
        with self.log_in(env, email, password) as s:
            r = s.get(f'{env}/api/utils/language')
            return r.json()['ajs']['language']

    def get_account_data(self, env, email, password):
        with self.log_in(env, email, password) as s:
            r = s.get(f'{env}/api/account/')
            return r.json()

    def set_account_language(self, env, email, password, new_language='en_US'):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/utils/language', json={'language': new_language})
            return r.json()

    def set_account_name(self, env, email, password, first_name, last_name):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/account/', json={'first_name': first_name, 'last_name': last_name})
            return r.json()

    def disconnect(self, env, email, password, system_id):
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/systems/disconnect', json={'system_id': system_id, 'password': password})
            return r.status_code

    def get_code_from_email(self, env, auth, email, message_type):
        with self.log_in(env, auth[0], auth[1]) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/robot/get_code', json={'email': email, 'type': message_type})
            return r.json()['code']

    def disconnect_from_account(self, env, email, password, system_id):
        """Doesn't completely remove user from system users, but sets their role to none instead.
        Should be used to emulate disconnection by clicking "Disconnect my account" button on system's page."""
        with self.log_in(env, email, password) as s:
            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            r = s.post(f'{env}/api/systems/{system_id}/users', json={'user_email': email, 'role': 'none'})
            return r.json()
        
    def subscribe_push_notification(self, env, email, password, token):
        authAscii = email+":"+password
        authAscii = authAscii.encode('ascii')
        auth = b"Basic "+base64.b64encode(authAscii)
        headers = {'Authorization': auth}
        r = requests.put(f'{env}/api/notifications/subscriptions/{token}', headers=headers, json={'type': 'notification','systems': ['all']})
        return r.json()
        
    def get_new_FCM_token(self, key, auth, body):
        headers = {'Content-Type': 'application/json','x-goog-api-key': key, 'x-goog-firebase-installations-auth': auth}
        print(headers)
        r = requests.post('https://fcmregistrations.googleapis.com/v1/projects/nx-push-test/registrations', headers=headers, data=body)
        print(r)
        token = r.json()['token'] 
        return token
    