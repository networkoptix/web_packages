import datetime
from pathlib import Path

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from header import HeaderNav
from login import LoginDialog
from resource_import import get_headless_chrome
from security_form import SecurityForm
from system_admin import SystemAdmin
from variables import ENV

CLOUD_API = CloudPortalAPI()


def enable_and_login_with_2fa(server: Mediaserver):
    """
    1. Enable and perform login with 2fa
    [tags]    smoke    ci    C107768    C107769
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password,
        server.cloud_owner.get_otp(),
        )
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp()
        )
    driver.close()


def login_with_backup_code(server: Mediaserver):
    """
    2. 2fa login with random backup code
    [Tags]    smoke    ci    C107770
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password
        )
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    backup_code = server.cloud_owner.pop_backup_code()
    for _ in range(2):
        header.log_out()
        header.log_in_button().click()
        LoginDialog(driver).twofa_backup_cloud_login(
            server.cloud_owner.email,
            server.cloud_owner.password,
            backup_code,
            )
    security_form.twofa_backup_code_error()
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp()
        )
    driver.close()


def login_with_qr_code(server: Mediaserver):
    """3. Enable and perform login with 2fa using QR"""
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password,
        )
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner, qr_code=True)
    security_form.twofa_enabled_badge()
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password,
        server.cloud_owner.get_otp(),
        )
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp()
    )
    driver.close()


def disabling_2fa(server: Mediaserver):
    """
    5. Successful disabling 2FA for user with enabled 2FA for the whole account
    [Tags]    smoke    ci    C107771
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    security_form.twofa_verification_checkbox().checked()
    security_form.turn_off_2fa(server.cloud_owner.get_otp())
    security_form.twofa_disabled_badge()
    driver.close()


def system_2fa_required(server: Mediaserver):
    """
    6.1 2fa is required when accessing only system with 2fa required
    [Tags]    smoke    ci    C110067
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    driver.get(f"{ENV}/systems/{server.id}")
    system_admin_page = SystemAdmin(driver)
    system_admin_page.mandatory_2fa_chechbox().select()
    system_admin_page.twofa_verification_code_input().input_text(server.cloud_owner.get_otp())
    system_admin_page.twofa_enable_button().click()
    header.log_out()
    header.log_in_button().click()
    LoginDialog(driver).twofa_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password,
        server.cloud_owner.get_otp(),
        )
    header.account_dropdown().click()
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )
    driver.close()


def twofa_not_required_when_more_than_one_system(server: Mediaserver, second_server: Mediaserver):
    """
    6.2 2fa is not required when accessing systems page with more than one system
    [Tags]    smoke    ci    C110067
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    SystemAdmin(driver)  # TODO: Consider removing when header ready logic is implemented
    driver.get(f"{ENV}/systems/{server.id}")
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    security_form.twofa_verification_checkbox().checked()
    security_form.twofa_verification_checkbox().unselect()
    security_form.twofa_settings_modal_check()
    security_form.twofa_settings_modal_off_instructions()
    security_form.twofa_settings_modal_apply()
    security_form.twofa_settings_modal_cancel()
    security_form.twofa_totp_input().input_text(server.cloud_owner.get_otp())
    security_form.twofa_settings_modal_apply().click()
    header.log_out()
    driver.get(f"{ENV}/systems/{second_server.id}")
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    SystemAdmin(driver)
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )
    driver.close()


def change_2fa_for_user_to_specific_systems_and_whole_account(server: Mediaserver):
    """
    7. Successfully changing 2FA mode for user to specific systems
    [Tags]    C93780
    8. Successfully changing 2FA mode for user to the whole account
    [Tags]    C93781
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
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
    security_form.twofa_totp_input().input_text(server.cloud_owner.get_otp())
    modal_apply = security_form.twofa_settings_modal_apply()
    modal_apply.click()
    security_form.twofa_verification_checkbox().unchecked()
    modal_apply.wait_until_visible()
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
    security_form.twofa_totp_input().input_text(server.cloud_owner.get_otp())
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
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )
    driver.close()


def fail_to_login_with_expired_code(server: Mediaserver):
    """
    9. Unsuccessful cloud authorization with 2FA using expired code from app
    [Tags]    C94715
    """
    driver = get_headless_chrome()
    driver.get(ENV)
    header = HeaderNav(driver)
    header.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(server.cloud_owner.email, server.cloud_owner.password)
    header.account_dropdown().click()
    header.security_option().click()
    security_form = SecurityForm(driver)
    security_form.turn_on_2fa(server.cloud_owner)
    security_form.twofa_enabled_badge()
    header.log_out()
    header.log_in_button().click()
    login_form = LoginDialog(driver)
    old_time = datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(minutes=1)
    login_form.twofa_cloud_login(
        server.cloud_owner.email,
        server.cloud_owner.password,
        server.cloud_owner.get_otp(at_time=old_time),
        )
    login_form.twofa_error_login_code()
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )
    driver.close()


def twofa_login_via_api(server: Mediaserver):
    """10. 2fa api call login with totp token"""
    key = CLOUD_API.toggle_2fa_on_api(server.cloud_owner.email, server.cloud_owner.password)
    server.cloud_owner.setup_2fa(key)
    CLOUD_API.api_log_in(
        server.cloud_owner.email,
        server.cloud_owner.password,
        verification_code=server.cloud_owner.get_otp(),
        )
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )


def twofa_login_via_api_backup(server: Mediaserver):
    """11. 2fa api call login with backout code"""
    key = CLOUD_API.toggle_2fa_on_api(server.cloud_owner.email, server.cloud_owner.password)
    server.cloud_owner.setup_2fa(key)
    backup = CLOUD_API.generate_2fa_backup_codes_api(
        server.cloud_owner.email,
        server.cloud_owner.password,
        verification_code=server.cloud_owner.get_otp(),
        )
    server.cloud_owner.setup_2fa(key, backup)
    for _ in range(2):
        CLOUD_API.api_log_in(
            server.cloud_owner.email,
            server.cloud_owner.password,
            backup_code=server.cloud_owner.pop_backup_code(),
            )
    CLOUD_API.toggle_2fa_off_api(
        server.cloud_owner,
        verification_code=server.cloud_owner.get_otp(),
        )


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        suite: Suite
        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_1_')
        enable_and_login_with_2fa(cloud_server)
        login_with_backup_code(cloud_server)
        login_with_qr_code(cloud_server)
        disabling_2fa(cloud_server)
        system_2fa_required(cloud_server)
        second_cloud_server = suite.create_cloud_server(cloud_owner, f'{suite_name}_2_')
        twofa_not_required_when_more_than_one_system(cloud_server, second_cloud_server)
        change_2fa_for_user_to_specific_systems_and_whole_account(cloud_server)
        fail_to_login_with_expired_code(cloud_server)
        twofa_login_via_api(cloud_server)
        twofa_login_via_api_backup(cloud_server)
