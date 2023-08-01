import time

from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account

from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from change_pass_form import ChangePassForm
from landing_page import LandingPage
from selenium.webdriver.common.keys import Keys

from NoptixLibrary.GenericKeywords import GenericKeywords
password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems()

def system_tiles_represent_actual_information():
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV + "/systems")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header = HeaderNav(driver)
    header.account_dropdown()
    #Log in    ${system}[cloudOwner]    ${base password}   api=${False}
    #Validate on Systems Page
    #Validate Tile    ${system}[name]    ${YOUR SYSTEM TEXT}
    #Validate Tile    ${extra system}[name]    Another Owner
    #FOR    ${sys}    IN    @{offline systems}
    #    Validate Tile    ${sys}[name]    ${YOUR SYSTEM TEXT}    offline=True
    #END
    #Verify Number Of Tiles Is Correct    9
    robot_keywords.close_browser(driver)
    print("pass")


if __name__ == "__main__":
    system_tiles_represent_actual_information()
    keywords.teardown_servers(SERVERS)