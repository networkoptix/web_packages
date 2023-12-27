import sys
import time
import unittest
from random import randint

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables

rb = RobotVariables("en_US")
if len(sys.argv) >= 2:
    CLOUD_HOST = sys.argv[1]
    del sys.argv[1]
else:
    CLOUD_HOST = "https://test.ft-cloud.hdw.mx"


def _timer(function):
    def wrapper(*args, **kwargs):
        start_time = time.monotonic()
        function(*args, **kwargs)
        end_time = time.monotonic()
        elapsed_time = end_time - start_time
        return round(elapsed_time, 2)
    return wrapper


class TestTime(unittest.TestCase):

    def _get_random_email(
            self,
            email="noptixautoqa+sendemail@gmail.com",
            sendemail=False,
            extra="",
            ):
        if not sendemail:
            email = email.replace('sendemail', '')
        index = email.index('@')
        email = email[:index] + str(time.time()) + str(randint(1, 100)) + extra + email[index:]
        return email

    @_timer
    def _time_register(self, email: str, cloud_api: CloudPortalAPI):
        cloud_api.register_account("Mark", "Hamil", email, rb.password)

    @_timer
    def _time_activate(self, email: str, cloud_api: CloudPortalAPI):
        cloud_api.activate_account_via_api(email, rb.password)

    @_timer
    def _time_connect_server_to_cloud(self, server: Mediaserver, owner: CloudAccount, suite: Suite):
        server.connect_to_cloud(owner)
        suite._wait_for_system_ready(server.id, owner)

    @_timer
    def _time_get_users(self, server: Mediaserver, cloud_api: CloudPortalAPI):
        owner = server.get_cloud_owner()
        cloud_api.get_cloud_system_users([owner.email, owner.password], server.id)

    @_timer
    def _time_share_unregistered_user(
            self,
            server: Mediaserver,
            owner: CloudAccount,
            cloud_api: CloudPortalAPI,
            ):
        cloud_api.share(
            [owner.email, owner.password],
            server.id,
            "Viewer",
            self._get_random_email(),
            "",
            )

    def test_register(self):
        cloud_api = CloudPortalAPI(env=CLOUD_HOST)
        time = self._time_register(self._get_random_email(), cloud_api)
        print(f"test_register took {time} seconds\n")
        self.assertLess(time, 15)

    def test_activate(self):
        email = self._get_random_email()
        cloud_api = CloudPortalAPI(env=CLOUD_HOST)
        cloud_api.register_account("Mark", "Hamil", email, rb.password)
        time = self._time_activate(email, cloud_api)
        print(f"test_activate took {time} seconds\n")
        self.assertLess(time, 15)

    def test_connect_server_to_cloud(self):
        with Suite() as suite:
            owner = suite.create_cloud_account()
            server = suite.create_local_server("5.1")
            time = self._time_connect_server_to_cloud(server, owner, suite)
            print(f"test_connect_server_to_cloud took {time} seconds\n")
            self.assertLess(time, 15)

    def test_get_users(self):
        with Suite() as suite:
            owner = suite.create_cloud_account()
            server = suite.create_local_server("5.1")
            server.connect_to_cloud(owner)
            cloud_api = CloudPortalAPI(env=CLOUD_HOST)
            time = self._time_get_users(server, cloud_api)
            print(f"test_get_users took {time} seconds\n")

    def test_share_unregistered_user(self):
        with Suite() as suite:
            owner = suite.create_cloud_account()
            server = suite.create_local_server("5.1")
            server.connect_to_cloud(owner)
            cloud_api = CloudPortalAPI(env=CLOUD_HOST)
            time = self._time_share_unregistered_user(server, owner, cloud_api)
            print(f"test_share_unregistered_user took {time} seconds\n")


if __name__ == "__main__":
    unittest.main()
