import re
import os

from django.core.management.base import BaseCommand

from cloud.controllers.cloud_api import System


class Command(BaseCommand):
    help = 'Unbinds a System from cloud. (This is for local dev only)'

    def add_arguments(self, parser):
        default_email = os.environ.get('UNBIND_EMAIL', '')
        default_password = os.environ.get('UNBIND_PASS', '')
        parser.add_argument('systemId', type=str)
        parser.add_argument('--email', default=default_email, type=str)
        parser.add_argument('--password', default=default_password, type=str)

    def handle(self, *args, **options):
        if not os.environ.get('LOCAL_ENV'):
            raise RuntimeError('This command can only be ran locally!')

        if not (system_id := options.get('systemId', '')):
            raise ValueError('systemId is required')

        if not (email := options.get('email', '')):
            raise ValueError('email is required')

        if not (password := options.get('password', '')):
            raise ValueError('password is required')

        system_id_res = re.search(r'\/([\w\d-]+)$', system_id)
        if system_id_res and len(system_id_res.groups()) > 0:
            System.unbind(email, password, system_id_res.group(1))
        else:
            self.stderr.write(
                self.style.ERROR(
                    'Could not match a system id'))
