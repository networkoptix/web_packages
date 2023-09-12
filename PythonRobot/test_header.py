import os
import time
from selenium import webdriver
import random

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email, register_and_activate_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from security_form import SecurityForm
from NoptixLibrary.server_api import ServerApi
from system_admin import SystemAdmin
from landing_page import LandingPage

from NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables
from NoptixLibrary.Cloud2fa import Cloud2fa
from NoptixLibrary.server_api import ServerApi
from page_text import PageText
from DockerApi import DockerApi

password = "qweasd 123"

keywords = GenericKeywords()
docker_api = DockerApi()
SERVERS = keywords.create_systems(os.path.basename(__file__))
CLOUD_API = CloudPortalAPI()
driver = get_headless_chrome()
no_systems_user = register_and_activate_random_email(driver, "mark", "hamil", password)
print(no_systems_user)
driver.close()
HEADER_TMP_USERS = [no_systems_user, SERVERS[0]['cloudOwner'], SERVERS[1]['cloudOwner']]
offline_systems = []
for server in SERVERS[1:17]:
    offline_systems.append(server)
    print(server['name'])
    docker_api.stop_container(server['container'])
    docker_api.delete_container(server['container'])

def anon_header_correct():
    """1. Anonymous: Header shows correct items"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button()
    header.create_account()
    driver.close()


if __name__ == "__main__":
    anon_header_correct()
    keywords.teardown_servers(SERVERS)
