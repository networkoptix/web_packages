import time
from selenium import webdriver

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from landing_page import LandingPage

from systems_page import SystemsPage
from system_admin import SystemAdmin
from system_left_menu import SystemLeftMenu
from system_users import SystemUsers
from resource_import import get_random_email

from NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems()
CLOUD_API = CloudPortalAPI()
viewer_permissions = 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'



def owner_can_remove_user():
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    CLOUD_API.share(SERVERS[0]['cloudAuth'], SERVERS[0]['id'], "viewer", email, viewer_permissions)
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header = HeaderNav(driver)
    header.account_dropdown()
    SystemAdmin(driver)
    left_menu = SystemLeftMenu(driver)
    time.sleep(1)
    left_menu.users_button().click()
    left_menu.update_users_list()
    left_menu.users[1].click()
    for user in left_menu.users:
        if user.text == email:
            user.click()
    users_page = SystemUsers(driver)
    users_page.remove_user_button().click()
    users_page.remove_user_modal_button().click()
    header.log_out()
    LandingPage(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(email, password)
    header.account_dropdown()
    SystemsPage(driver).no_systems()

    robot_keywords.close_browser(driver)
    print("pass")

def share_with_registered_user_sends_notification():
    driver = get_headless_chrome()
    email = get_random_email(sendemail=True)
    CLOUD_API.share(SERVERS[0]['cloudAuth'], SERVERS[0]['id'], "viewer", email, viewer_permissions)
    time.sleep(30)
    mail_box = Emails(email, "activate")
    links = mail_box.get_nx_links_from_email()
    print(links)




#Todo: figure out email crap
# def share_with_unregistered_user_sends_notification():

def share_with_registered_user_works():
    driver = get_headless_chrome()
    email = get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    CLOUD_API.share(SERVERS[0]['cloudAuth'], SERVERS[0]['id'], "viewer", email, viewer_permissions)
    robot_keywords.go_to_url(driver, ENV + f"/systems/{SERVERS[0]['id']}")
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header = HeaderNav(driver)
    header.account_dropdown()
    SystemAdmin(driver)
    left_menu = SystemLeftMenu(driver)
    time.sleep(1)
    left_menu.users_button().click()
    left_menu.update_users_list()
    left_menu.users[1].click()
    user_there = False
    for user in left_menu.users:
        if user.text == email:
            user_there = True
    assert user_there, "User was not in the users list"

    robot_keywords.close_browser(driver)
    print("pass")



if __name__ == "__main__":
    # owner_can_remove_user()
    # share_with_registered_user_works()
    share_with_registered_user_sends_notification()
    keywords.teardown_servers(SERVERS)
