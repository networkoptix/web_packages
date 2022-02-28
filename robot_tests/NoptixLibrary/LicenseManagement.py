import json
from datetime import datetime
from itertools import chain
import re
import requests
from requests.auth import HTTPDigestAuth
from robot.api.deco import keyword, library


class GenerationError(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return str(self.msg)


class ActivationError(Exception):
    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return str(self.msg)

@library
class LicenseManagement(object):
    def __init__(self, base_url, auth, login=True):
        self.base_url = base_url
        self.auth = auth
        self.session = requests.Session()
        if login:
            self._login()

    def __del__(self):
        self.session.close()

    def _login(self):
        url = self.base_url + '/checklogin.php'

        r = self.session.get(url)
        csrftoken = 'removeme'
        if 'csrftoken' in r.cookies:
            csrftoken = r.cookies['csrftoken']
        r = self.session.post(url, data=dict(
            zip(('email', 'password', 'csrfmiddlewaretoken'), chain(self.auth, (csrftoken,)))),
                              headers=dict(Referer=url))
        if 'csrftoken' in self.session.cookies:
            self.session.headers.update({'X-CSRFToken': self.session.cookies['csrftoken']})
        assert '<title>Login</title>' not in r.text, "Invalid credentials"
        assert r.status_code == 200, "Can't log in to licensing server"

    @keyword
    def manual_activate(self, key, hwid):
        data = {
            'license_key': key,
            'oldhwid[]': 'The license is activated by hand',
            'hwid[]': hwid
        }
        response = self.session.post(f'{self.base_url}/activate.php', data=data)
        assert response.status_code == 200, "Can't activate license"

        if not response.text:
            raise GenerationError({'error': 'Validation failed'})

        return response.text

    @keyword
    def add_license(self, server_auth, server_url, license, hwid):
        block = self.manual_activate(license, hwid)
        body = [{
            "key": license,
            "licenseBlock": block
        }]
        r = requests.post(f'{server_url}/ec2/addLicenses', auth=HTTPDigestAuth(server_auth[0], server_auth[1]), json=body, verify=False)
        return r.json()

    @keyword
    def deactivate_licenses(self, license_keys, autodeact_reason='1', new_hwid='',
                            integrator='AutoTest Integrator', end_user='AutoTest End User', mode='deactivate',
                            os_version=None, vms_version=None):
        """Deactivate key on portal"""
        data = {
            'mode': mode,
            'license_keys[]': license_keys,
            'autodeact_reason': autodeact_reason,
            'new_hwid': new_hwid,
            'integrator': integrator,
            'end_user': end_user
        }

        if os_version is not None:
            data['os_version'] = os_version

        if vms_version is not None:
            data['vms_version'] = vms_version

        r = self.session.post(self.base_url + '/autodeact.php?format=json', data=data)

        if r.status_code not in (200, 503):
            raise RuntimeError("Deactivation error. Code {} not in (200, 503)".format(r.status_code))

        text = r.text
        try:
            return json.loads(text)
        except json.decoder.JSONDecodeError:
            p = text.find('with ID')
            d = text[p:].find('.')

            return {'id': int(text[p + 8:p + d])}

    @keyword
    def generate_licenses(self, name='Auto Test', company='Network Optix',
                          order_type='purchase', order_id='Auto Tests', authorized_by='1',
                          brand='hdwitness', license_type='digital',
                          trial_days=0, n_packs=1, n_cameras=1, replacements=[], fixed_expiration_ts=None):
        """Generate license key(s)"""

        data = {
            'NAME': name,
            'COMPANY2': company,
            'ORDERTYPE': order_type,
            'ORDERID2': order_id,
            'AUTHORIZEDBY': authorized_by,
            'BRAND2': brand,
            'CLASS2': license_type,
            'TRIALDAYS2': trial_days,
            'NUMPACKS': n_packs,
            'QUANTITY2': n_cameras,
            'REPLACEMENT[]': replacements,
            'FIXED_EXPIRATION_TS': fixed_expiration_ts.strftime("%m/%d/%Y") if fixed_expiration_ts else None
        }

        r = self.session.post(self.base_url + '/genkey.php?format=json', data=data)

        if r.status_code not in (200, 403):
            raise RuntimeError("Generation error. Code {} not in (200, 403)".format(r.status_code))

        text = r.text
        try:
            data = json.loads(text)
            if 'status' in data and data['status'] == 'error':
                message = ''
                if 'message' in data:
                    message = data['message']
                elif 'detail' in data:
                    message = data['detail']
                raise GenerationError(message)
            keys = [x['key'] for x in data['items']]
            return keys[0] if len(keys) == 1 else keys
        except json.decoder.JSONDecodeError:
            raise GenerationError(text)

    @keyword
    def replace_license(self, license_key):
        data = {
            'license_key': license_key
        }

        r = self.session.post(self.base_url + "/api/v1/licenses/replace/", data=data)
        if r.status_code != 200:
            raise GenerationError("Replace error. Code {} != 200".format(r.status_code))

        message = r.json()['body']
        m = re.search(r'New key is ([^.]*).', message)
        if m:
            return m.groups()[0]
        else:
            raise GenerationError("Replace error. Can't match new key: {}".format(message))

        return message

    @keyword
    def disable_license(self, license_key):
        data = {
            'license_key': license_key
        }

        r = self.session.post(self.base_url + "/api/v1/licenses/disable/", data=data)
        if r.status_code != 200:
            raise RuntimeError("Disable error. Code {} != 200".format(r.status_code))

        text = r.text
        return text

    @keyword
    def get_license_info(self, license_key):
        params = {
            'license_key': license_key
        }

        url = self.base_url + "/api/v1/licenses/info/"
        text = self.session.get(url, params=params, headers=dict(Referer=url)).text
        key_data = json.loads(text)
        return key_data['body']

    @keyword
    def is_enabled(self, license_key):
        key_info = self.get_license_info(license_key)
        return key_info['is_enabled']

    @keyword
    def get_activation_report(self, date_from, date_to):
        data = {
            'from': date_from,
            'to': date_to
        }

        r = self.session.post(self.base_url + "/do_activation_report.php", data=data)

        if r.status_code != 200:
            raise RuntimeError("Report error. Code {} != 200".format(r.status_code))

        text = r.text
        return text

    @keyword
    def get_hwid(self, server_auth, server_url, key):
        """ Get HWID the key is activated to """
        r = requests.get(f'{server_url}/ec2/getLicenses', auth=HTTPDigestAuth(server_auth[0], server_auth[1]),
                         verify=False)
        assert 200 == r.status_code
        licenses = r.json()

        for lic in licenses:
            if lic['key'] == key:
                lic_lines = lic['licenseBlock'].splitlines()
                return lic_lines[2].split('=')[1]
        else:
            return 'Error: the key is not activated on the server'

    @keyword
    def get_key_info_from_server(self, server_auth, server_url, key):
        if '0000-0000-0000' not in key:
            from_license_portal = self.get_license_info(key)
        else:
            from_license_portal = {'count': 4, 'license_type': 'Professional'}

        r = requests.get(f'{server_url}/ec2/getLicenses', auth=HTTPDigestAuth(server_auth[0], server_auth[1]),
                         verify=False)
        assert 200 == r.status_code
        licenses = r.json()

        type_map = {
            'digital': 'Professional',
            'analogencoder': 'Analog Encoder',
            'iomodule': 'IO Module',
            'vmax': 'VMAX',
            'videowall': 'Video Wall',
            'starter': 'Starter',
            'bridge': 'Bridge',
            'nvr': 'NVR'
        }

        key_info = {}
        for lic in licenses:
            if lic['key'] == key:
                lic_lines = lic['licenseBlock'].splitlines()
                for line in lic_lines:
                    if line != '' and 'SIGNATURE2' not in line:
                        key, value = line.split('=')
                    else:
                        continue
                    if key == 'HWID':
                        key_info.update({'Hardware ID': value})
                    elif key == 'COUNT':
                        key_info.update({'Channels': value})
                        if int(key_info['Channels']) != int(from_license_portal['count']):
                            raise ActivationError(f"{key_info['Channels']} != {from_license_portal['count']}")
                    elif key == 'CLASS':
                        key_info.update({'Type': type_map[value]})
                        if key_info['Type'] != from_license_portal['license_type']:
                            raise ActivationError(f"{key_info['Type']} != {from_license_portal['license_type']}")
                    elif key == 'EXPIRATION' and value:
                        if ('ORDERTYPE' not in lic['licenseBlock']) and ('0000-0000-0000' not in lic['key']) and (
                                key_info['Type'] != 'Video Wall'):
                            key_info['Type'] = 'Time'
                        elif '0000-0000-0000' in lic['key']:
                            key_info['Type'] = 'Trial'
                        value = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                        value = datetime.strftime(value, '%d %b %Y, %I:%M %p')
                        key_info.update({'Expires': value})
                    elif key == 'EXPIRATION' and not value:
                        key_info.update({'Expires': ''})
                    elif key == 'DEACTIVATIONS' and value is not None:
                        key_info.update({'Deactivation left': 3 - int(value)})
                return key_info
        else:
            return None
