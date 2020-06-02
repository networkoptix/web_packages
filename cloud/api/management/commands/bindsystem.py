import os

import requests
from django.core.management.base import BaseCommand
from api.controllers.cloud_api import System


class Command(BaseCommand):
    help = "Unbinds a System from cloud. (This is for local dev only)"

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)
        parser.add_argument("password", type=str)
        parser.add_argument("system_name", type=str)
        parser.add_argument("system_url", type=str)

    def handle(self, *args, **options):
        if not os.environ.get("LOCAL_ENV"):
            raise RuntimeError("This command can only be ran locally!")
        email = options["email"]
        password = options["password"]
        name = options["system_name"]
        system_url = options["system_url"]
        data = System.bind(email, password, name)
        cloud_info = {
            "cloudAccountName": data["ownerAccountEmail"],
            "cloudAuthKey": data["authKey"],
            "cloudSystemID": data["id"],
            "systemName": data["name"]
        }
        res = requests.post(f"{system_url}/api/setupCloudSystem",
                            json=cloud_info, auth=requests.auth.HTTPDigestAuth('admin', 'admin'))
        res.raise_for_status()


