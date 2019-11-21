import requests


class CloudPortalAPI(object):

    def log_in(self, env, email, password):
        with requests.Session() as s:
            login_data = {
                'email': email,
                'password': password
            }
            s.post(env + '/api/account/login', login_data)
            return s


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