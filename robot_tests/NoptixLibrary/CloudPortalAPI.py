import re
import requests


class CloudPortalAPI(object):

    def log_in(self, env, email, password):
        with requests.Session() as login_session:
            login_data = {
                'email': email,
                'password': password
            }
            resp = login_session.post(env + '/api/account/login', login_data)
            assert resp.status_code == 200, "Log In Failed"
            return login_session

    # TODO implement logging out using API where appropriate
    def log_out(self, env, session_id, csrftoken):
        with requests.Session() as logout_session:
            logout_session.headers.update({'X-CSRFToken': csrftoken})
            logout_session.headers.update({'cookie': 'csrftoken=' + csrftoken + '; sessionid=' + session_id})
            resp = logout_session.post(env + '/api/account/logout')
            logout_session.close()
            return resp.status_code

    def change_password(self, env, email, old_password, new_password):
        change_pass_session = self.log_in(env, email, old_password)
        with change_pass_session:
            pass_data = {
                'old_password': old_password,
                'new_password': new_password
            }
            change_pass_session.headers.update({'X-CSRFToken': change_pass_session.cookies['csrftoken']})
            change_pass = change_pass_session.post(env + '/api/account/changePassword', pass_data)
            change_pass_session.close()
            return change_pass.status_code

    def restore_password(self, env, email, code=None, new_password=None):
        with requests.Session() as restore_pass_session:
            data = {
                'user_email': email
            }
            if code and new_password:
                data.update({'code': code, 'new_password': new_password})
            resp = restore_pass_session.post(env + '/api/account/restorePassword', data)
            restore_pass_session.close()
            return resp.status_code

    def get_language_anonymous(self, env):
        resp = requests.get(env + '/api/utils/language')
        return resp.json()['ajs']['language']

    def get_account_language(self, env, email, password):
        get_acc_lang_session = self.log_in(env, email, password)
        with get_acc_lang_session:
            resp = get_acc_lang_session.get(env + '/api/utils/language')
            get_acc_lang_session.close()
            return resp.json()['ajs']['language']

    def set_account_language(self, env, email, password, new_language='en_US'):
        set_acc_lang_session = self.log_in(env, email, password)
        with set_acc_lang_session:
            lang_data = {
                'language': new_language,
            }
            set_acc_lang_session.headers.update({'X-CSRFToken': set_acc_lang_session.cookies['csrftoken']})
            change_lang = set_acc_lang_session.post(env + '/api/utils/language', lang_data)
            set_acc_lang_session.close()
            return change_lang.status_code

    def disconnect(self, env, email, password, system_id):
        disconnect_session = self.log_in(env, email, password)
        with disconnect_session:
            disconnect_data = {
                'system_id': system_id,
                'password': password
            }
            disconnect_session.headers.update({'X-CSRFToken': disconnect_session.cookies['csrftoken']})
            resp = disconnect_session.post(env + '/api/systems/disconnect', disconnect_data)
            disconnect_session.close()
            return resp.status_code

    def get_code_from_email(self, env, auth, email, message_type):
        with requests.Session() as s:
            resp = s.post(f'{env}/api/account/login', json={'email': auth[0], 'password': auth[1]})
            assert resp.status_code == 200, 'Log In Failed'

            s.headers.update({'X-CSRFToken': s.cookies['csrftoken']})
            resp = s.post(f'{env}/api/robot/get_code', json={'email': email, 'type': message_type})
            s.close()
            return resp.json()['code'].replace('%3D', '=')
