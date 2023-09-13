import os
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
from NoptixLibrary.server_api import ServerApi
from system_admin import SystemAdmin

from system_admin import SystemAdmin

from NoptixLibrary.generic_keywords import GenericKeywords
from RobotVariables import RobotVariables
from NoptixLibrary.cloud_2fa import Cloud2fa
from NoptixLibrary.server_api import ServerApi
from page_text import PageText

password = "qweasd 123"

keywords = GenericKeywords()
SERVERS = keywords.create_systems(os.path.basename(__file__))
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
    time.sleep(2)
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
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
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
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
    time.sleep(2)
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
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
    twofa_codes = security_form.turn_on_2fa(password)
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
    twofa_codes = security_form.turn_on_2fa(password)
    security_form.twofa_enabled_badge()
    robot_keywords.sleep(5)
    robot_keywords.go_to_url(driver, f"{ENV}/systems/{SERVERS[0]['id']}")
    system_admin_page = SystemAdmin(driver)
    system_admin_page.mandatory_2fa_chechbox().select()
    system_admin_page.twofa_verification_code_input().input_text(twofa_codes['totp'])
    system_admin_page.twofa_enable_button().click()
    header.log_out()
    robot_keywords.sleep(3)
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def twofa_not_required_when_more_than_one_system():
    """6.2 2fa is not required when accessing systems page with more than one system"""
    bind_info = CLOUD_API.connect(SERVERS[1]['name'], SERVERS[0]['cloudOwner'], password)
    ServerApi(f"https://10.1.5.48:{SERVERS[1]['port'][0]}").api_connect_to_cloud(bind_info)
    SERVERS[1]['id'] = bind_info['systemId']
    SERVERS[1]['cloudOwner'] = SERVERS[0]['cloudOwner']
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    robot_keywords.sleep(2)
    robot_keywords.go_to_url(driver, f"{ENV}/systems/{SERVERS[1]['id']}")
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password)
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
    robot_keywords.go_to_url(driver, f"{ENV}/systems/{SERVERS[1]['id']}")
    SystemAdmin(driver)
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def change_2fa_for_user_to_specific_systems_and_whole_account():
    """7. Successfully changing 2FA mode for user to specific systems \n 
    8. Successfully changing 2FA mode for user to the whole account"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    robot_keywords.sleep(2)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password)
    security_form.twofa_enabled_badge()
    security_form.twofa_verification_checkbox().checked()
    try:
        security_form.twofa_page_save()
    except:
        pass
    else:
        raise RuntimeError("Page Save Button present")
    try:
        security_form.twofa_page_cancel()
    except:
        pass
    else:
        raise RuntimeError("Page Cancel Button present")
    security_form.twofa_verification_checkbox().unselect()
    security_form.twofa_settings_modal_check()
    security_form.twofa_settings_modal_off_instructions()
    security_form.twofa_settings_modal_apply()
    security_form.twofa_settings_modal_cancel()
    security_form.twofa_totp_input().input_text(twofa_codes['totp'])
    security_form.twofa_settings_modal_apply().click()
    security_form.twofa_verification_checkbox().unchecked()
    robot_keywords.sleep(3)
    try:
        security_form.twofa_settings_modal_apply()
    except:
        pass
    else:
        raise RuntimeError("Page Save Button present")
    try:
        security_form.twofa_settings_modal_cancel()
    except:
        pass
    else:
        raise RuntimeError("Page Cancel Button present")
    security_form.twofa_verification_checkbox().select()
    security_form.twofa_settings_modal_uncheck()
    security_form.twofa_settings_modal_on_instructions()
    security_form.twofa_settings_modal_apply()
    security_form.twofa_settings_modal_cancel()
    security_form.twofa_totp_input().input_text(twofa_codes['totp'])
    security_form.twofa_settings_modal_apply().click()
    security_form.twofa_verification_checkbox().checked()
    try:
        security_form.twofa_page_save()
    except:
        pass
    else:
        raise RuntimeError("Page Save Button present")
    try:
        security_form.twofa_page_cancel()
    except:
        pass
    else:
        raise RuntimeError("Page Cancel Button present")
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def fail_to_login_with_expired_code():
    """9. Unsuccessful cloud authorization with 2FA using expired code from app"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(SERVERS[0]['cloudOwner'], password)
    robot_keywords.sleep(2)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)    
    twofa_codes = security_form.turn_on_2fa(password)
    security_form.twofa_enabled_badge()
    robot_keywords.sleep(1)
    header.log_out()
    robot_keywords.sleep(60)
    header.log_in_button().click()
    login_form = LoginDialog(driver)
    login_form.twofa_cloud_login(SERVERS[0]['cloudOwner'], password, twofa_codes['totp'])
    login_form.twofa_error_login_code()
    twofa_codes['totp'] = Cloud2fa().get_2fa_verification_code(twofa_codes['key'])
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=twofa_codes['totp'])
    driver.close()

def twofa_login_via_api():
    """10. 2fa api call login with totp token"""
    key = CLOUD_API.toggle_2fa_on_api(SERVERS[0]['cloudOwner'], password)
    totp = Cloud2fa().get_2fa_verification_code(key)
    CLOUD_API.api_log_in(SERVERS[0]['cloudOwner'], password, verification_code=totp)
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=totp)

def twofa_login_via_api_backup():
    """11. 2fa api call login with backout code"""
    key = CLOUD_API.toggle_2fa_on_api(SERVERS[0]['cloudOwner'], password)
    totp = Cloud2fa().get_2fa_verification_code(key)
    backup = CLOUD_API.generate_2fa_backup_codes_api(SERVERS[0]['cloudOwner'], password, verification_code=totp)
    CLOUD_API.api_log_in(SERVERS[0]['cloudOwner'], password, backup_code=backup)
    CLOUD_API.toggle_2fa_off_api(SERVERS[0]['cloudOwner'], password, verification_code=totp)

if __name__ == "__main__":
    enable_and_login_with_2fa()
    login_with_backup_code()
    login_with_qr_code()
    disabling_2fa()
    system_2fa_required()
    twofa_not_required_when_more_than_one_system()
    change_2fa_for_user_to_specific_systems_and_whole_account()
    fail_to_login_with_expired_code()
    twofa_login_via_api()
    twofa_login_via_api_backup()
    keywords.teardown_servers(SERVERS)
