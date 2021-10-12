import os
import requests

from django.core.management.base import BaseCommand

from api.controllers.cloud_api import System


class Command(BaseCommand):
    help = 'Unbinds a System from cloud. (This is for local dev only)'

    def add_arguments(self, parser):
        arguments = [
            'email', 'password', 'system_name', 'system_url']
        for arg in arguments:
            parser.add_argument(arg, type=str)

    def handle(self, *args, **options):
        if not os.environ.get('LOCAL_ENV'):
            raise RuntimeError('This command can only be ran locally!')
        if not (email := options.get('email', '')):
            raise ValueError('email is required')
        if not (password := options.get('password', '')):
            raise ValueError('password is required')
        if not (name := options.get('system_name', '')):
            raise ValueError('system_name is required')
        if not (system_url := options.get('system_url', '')):
            raise ValueError('system_url is required')

        data = System.bind(email, password, name)
        cloud_info = {
            'cloudAccountName': data['ownerAccountEmail'],
            'cloudAuthKey': data['authKey'],
            'cloudSystemID': data['id'],
            'systemName': data['name']
        }
        res = requests.post(f'{system_url}/api/setupCloudSystem',
                            json=cloud_info, auth=requests.auth.HTTPDigestAuth('admin', 'admin'))
        res.raise_for_status()
