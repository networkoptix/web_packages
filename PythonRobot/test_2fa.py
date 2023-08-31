import time
from selenium import webdriver
import random

from resource_import import get_headless_chrome, register_and_activate_account, get_random_email
from PythonRobot.NoptixLibrary.CloudPortalAPI import CloudPortalAPI
from variables import ENV
import robot_keywords
from RobotVariables import RobotVariables
from login import LoginDialog
from header import HeaderNav
from security_form import SecurityForm
from system_admin import SystemAdmin

from system_admin import SystemAdmin

from PythonRobot.NoptixLibrary.GenericKeywords import GenericKeywords
from RobotVariables import RobotVariables
from PythonRobot.NoptixLibrary.Cloud2fa import Cloud2fa
from PythonRobot.NoptixLibrary.ServerAPI5 import ServerAPI5
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
    robot_keywords.sleep(1)
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

def system_2fa_required():
    """6.1 2fa is required when accessing only system with 2fa required"""
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
    robot_keywords.sleep(5)
    robot_keywords.go_to_url(driver, f"{ENV}systems/{SERVERS[0]['id']}")
    system_admin_page = SystemAdmin(driver)
    system_admin_page.mandatory_2fa_chechbox().select()
    system_admin_page.twofa_verification_code_input().input_text(twofa_codes['totp'])
    system_admin_page.twofa_enable_button().click()
    header.log_out()
    robot_keywords.sleep(3)
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CloudPortalAPI().toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def twofa_not_required_when_more_than_one_system():
    """6.2 2fa is not required when accessing systems page with more than one system"""
    bind_info = CLOUD_API.connect(SERVERS[1]['name'], SERVERS[0]['cloudOwner'], password)
    id = ServerAPI5(f"https://10.1.5.48:{SERVERS[1]['port'][0]}").api_connect_to_cloud(bind_info)
    SERVERS[1]['id'] = id
    SERVERS[1]['cloudOwner'] = SERVERS[0]['cloudOwner']
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    robot_keywords.sleep(2)
    robot_keywords.go_to_url(driver, f"{ENV}systems/{id}")
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password, qr_code=True)
    security_form.twofa_enabled_badge()
    security_form.twofa_verification_checkbox().checked()
    security_form.twofa_verification_checkbox().unselect()
    security_form.twofa_settings_modal_check()
    security_form.twofa_settings_modal_off_instructions()
    security_form.twofa_settings_modal_apply()
    security_form.twofa_settings_modal_cancel()
    security_form.twofa_totp_input().input_text(twofa_codes['totp'])
    security_form.twofa_settings_modal_apply().click()
    robot_keywords.sleep(2)
    header.log_out()
    robot_keywords.sleep(3)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    robot_keywords.sleep(2)
    robot_keywords.go_to_url(driver, f"{ENV}systems/{id}")
    SystemAdmin(driver)
    driver.close()

if __name__ == "__main__":
    enable_and_login_with_2fa()
    login_with_backup_code()
    login_with_qr_code()
    disabling_2fa()
    system_2fa_required()
    twofa_not_required_when_more_than_one_system()
    keywords.teardown_servers(SERVERS)
