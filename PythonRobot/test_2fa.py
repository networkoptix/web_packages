import time
from selenium import webdriver
import random

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from security_form import SecurityForm

from system_admin import SystemAdmin

from NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables
from NoptixLibrary.Cloud2fa import Cloud2fa
from NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from page_text import PageText

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems()
CLOUD_API = CloudPortalAPI()

def enable_and_login_with_2fa():
    """1. Enable and perform login with 2fa"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password)
    security_form.twofa_enabled_badge()
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CloudPortalAPI().toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def login_with_backup_code():
    """2. 2fa login with random backup code"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password)
    security_form.twofa_enabled_badge()
    header.log_out()
    robot_keywords.sleep(2)
    header.log_in_button().click()
    try:
        LoginDialog(driver).twofa_backup_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['backup'])
        robot_keywords.sleep(2)
        header.log_out()
        robot_keywords.sleep(2)
    except:
        print("FAIL")
    header.log_in_button().click()
    LoginDialog(driver).twofa_backup_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['backup'])
    security_form.twofa_backup_code_error()
    CloudPortalAPI().toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def login_with_qr_code():
    """3. Enable and perform login with 2fa using QR"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password, qr_code=True)
    security_form.twofa_enabled_badge()
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CloudPortalAPI().toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def disabling_2fa():
    """5. Successful disabling 2FA for user with enabled 2FA for the whole account"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password, qr_code=True)
    security_form.twofa_enabled_badge()
    security_form.twofa_verification_checkbox().checked()
    security_form.turn_off_2fa(twofa_codes["totp"])
    security_form.twofa_disabled_badge()
    driver.close()

if __name__ == "__main__":
    enable_and_login_with_2fa()
    login_with_backup_code()
    login_with_qr_code()
    disabling_2fa()
    keywords.teardown_servers(SERVERS)
