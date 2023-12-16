import json
import os
import pathlib
import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from email_access import EmailClient
from email_access import get_random_email
from generic_elements import PageText
from pages.account_page import AccountPage
from pages.account_page import SuccessToast
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.reset_password_dialog import ResetPasswordDialog

password = "qweasd1234"
login = "noptixautoqa+owner@gmail.com"
rb = RobotVariables("en_US")


def test_can_access_account_page_from_dropdown(cloud_user: CloudAccount):
    """1 Can access the account page from dropdown."""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        header.account_dropdown().click()
        header.account_settings_option().click()
        AccountPage(driver).wait_until_loaded()


def test_can_access_account_page_from_direct_link():
    """2 can access the account page from direct link while logged in."""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        header.account_dropdown().wait_until_visible()
        driver.get(rb.env + "/account")
        AccountPage(driver).wait_until_loaded()


def test_cannot_access_account_page_from_direct_link_on_valid_login():
    """4 accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page."""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        driver.get(url)
        AccountPage(driver).wait_until_loaded()


def test_changing_first_name_and_saving_maintains_that_setting(cloud_user: CloudAccount):
    """5 changing first name and saving maintains that setting."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.first_name().input_text("namechanged")
        # todo: the save button doesn't appear.
        account_page.save_button().click()
        success_toast = SuccessToast(driver)
        success_toast.wait_until_visible()
        assert success_toast.get_text() == "Your account is successfully saved"
        success_toast.wait_until_not_visible()
    with get_chrome() as driver:
        url1 = rb.ENV + "/account"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        text = account_page.first_name().get_text()
        assert text == "namechanged", "Name was not 'namechanged'"
        account_page.first_name().input_text(rb.TEST_FIRST_NAME)
        account_page.save_button().click()
        success_toast = SuccessToast(driver)
        success_toast.wait_until_visible()
        assert success_toast.get_text() == "Your account is successfully saved"
        success_toast.wait_until_not_visible()


def test_changing_last_name_and_saving_maintains_that_setting(cloud_user: CloudAccount):
    """6 changing last name and saving maintains that setting."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.last_name().input_text("namechanged")
        account_page.save_button().click()
        success_toast = SuccessToast(driver)
        success_toast.wait_until_visible()
        assert success_toast.get_text() == "Your account is successfully saved"
        success_toast.wait_until_not_visible()
    with get_chrome() as driver:
        url1 = rb.ENV + "/account"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        assert account_page.last_name().get_text() == "namechanged"
        account_page.last_name().input_text("hamill")
        account_page.save_button().click()
        success_toast = SuccessToast(driver)
        success_toast.wait_until_visible()
        assert success_toast.get_text() == "Your account is successfully saved"
        success_toast.wait_until_not_visible()


def test_first_name_is_required():
    """7 first name is required."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        first_name_field = account_page.first_name()
        first_name_field.delete_all_text()
        account_page.last_name().click()
        first_name_field.wait_until_has_style("border-color", rb.ERROR_COLOR)
        first_name_field.wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_save = account_page.save_button()
        account_save.wait_until_visible()
        account_save.wait_until_not_clickable()
        account_page.cancel_button().click()


def test_last_name_is_required():
    """8 last name is required."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        last_name_field = account_page.last_name()
        last_name_field.delete_all_text()
        last_name_field.delete_all_text()
        account_page.first_name().click()
        last_name_field.wait_until_has_style("border-color", rb.ERROR_COLOR)
        last_name_field.wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_save = account_page.save_button()
        account_save.wait_until_visible()
        account_save.wait_until_not_clickable()
        account_page.cancel_button().click()


def test_space_for_first_name_is_not_valid():
    """9 space for first name is not valid."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        first_name_field = account_page.first_name()
        first_name_field.input_text(" ")
        PageText(driver, f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
        first_name_field.wait_until_has_style("border-color", rb.ERROR_COLOR)
        first_name_field.wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_page.save_button().wait_until_not_clickable()
        account_page.cancel_button().click()


def test_space_for_last_name_is_not_valid():
    """10 space for last name is not valid."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.first_name().input_text("luke")
        last_name_field = account_page.last_name()
        last_name_field.input_text(" ")
        PageText(driver,   f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
        last_name_field.wait_until_has_style("border-top-color", rb.ERROR_COLOR_WITH_OPACITY)
        last_name_field.wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_page.save_button().wait_until_not_clickable()
        account_page.cancel_button().click()


def test_language_is_changeable_on_the_account_page():
    """13 language is changeable on the account page."""
    with get_chrome() as driver:
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        driver.refresh()
        lang_dict = _get_lang_list()
        account_page = AccountPage(driver)
        for lang in lang_dict:
            info_text = lang_dict[lang]["ACCOUNT INFORMATION"]
            account_page.wait_until_loaded()
            if lang != rb.language:
                account_page.get_language_dropdown().set_language(lang)
                PageText(driver, f"//header//h4[contains(text(),'{info_text}')]").wait_until_visible()
        account_page.get_language_dropdown().set_language(rb.LANGUAGE)
        time.sleep(1)
        account_page.wait_until_loaded()
        PageText(driver, f"//header//h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").wait_until_visible()


def test_language_change_affects_emails():
    """14 Language change affects emails."""
    with get_chrome() as driver:
        with CloudAccount(get_random_email(sendemail=True)) as cloud_user:
            cloud_user.activate()
            driver.get(rb.ENV + "/account")
            if rb.LANGUAGE != "ru_Ru":
                LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
                HeaderNav(driver).account_dropdown().wait_until_visible()
                account_page = AccountPage(driver)
                account_page.wait_until_loaded()
                account_page.get_language_dropdown().set_language('ru_RU')
                time.sleep(5)
            driver.get(rb.ENV + "/authorize")
            login = LoginDialog(driver, lang="ru_RU")
            login.email_input().input_text(cloud_user.email)
            login.russian_next_button().click()
            login.russian_forgot_password_button().click()
            reset_password_dialog = ResetPasswordDialog(driver)
            reset_password_dialog.input_email(cloud_user.email)
            reset_password_dialog.get_russian_reset_password_button().click()
            with EmailClient(email_alias=cloud_user.email) as email_client:
                email_message = email_client.wait_for_reset_password_email()
                email_client.delete_email(email_message)
                CloudPortalAPI().set_account_language(
                    cloud_user.email,
                    cloud_user.password,
                    "en_US",
                    )


def test_language_change_is_new_default(cloud_user: CloudAccount):
    """15 Language change is new default."""
    lang_dict = _get_lang_list()
    japanese_code = 'ja_JP'
    german_code = 'de_DE'
    ja_JP_account_info = lang_dict[japanese_code]['ACCOUNT INFORMATION']
    de_DE_account_info = lang_dict[german_code]['ACCOUNT INFORMATION']
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        account_page = AccountPage(driver)
        account_page.wait_until_loaded()
        account_page.get_language_dropdown().set_language(japanese_code)
        time.sleep(5)
        driver.refresh()
        assert account_page.get_language_dropdown().get_active_language() == '日本'
        info_element = PageText(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
        info_element.wait_until_visible()
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.japanese_log_out_option().click()
        LandingPage(driver).wait_until_loaded()
        driver.get(url)
        login = LoginDialog(driver)
        login.email_input().input_text(cloud_user.email)
        login.japanese_next_button().click()
        login.password_input().input_text(cloud_user.password)
        login.login_button().click()
        HeaderNav(driver).account_dropdown().wait_until_visible()
        api = CloudPortalAPI()
        api.set_account_language(cloud_user.email, cloud_user.password, new_language=german_code)
        time.sleep(5)
        driver.refresh()
        activeLang = account_page.get_language_dropdown().get_active_language()
        assert activeLang.lower() in german_code.lower()
        info_element = PageText(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")
        info_element.wait_until_visible()
        api.set_account_language(cloud_user.email, cloud_user.password, "en_US")


def _get_lang_list():
    path = pathlib.Path(__file__).parent / 'customizations' / 'default_lang_list.json'
    with open(path, encoding="utf-8") as langDict:
        return json.load(langDict)


if __name__ == "__main__":
    suite_name = os.path.basename(__file__)
    suite_name = suite_name.replace("test_", "").replace(".py", "")
    with Suite() as suite:
        cloud_account = suite.create_cloud_account()
        test_can_access_account_page_from_dropdown(cloud_account)
        test_can_access_account_page_from_direct_link()
        test_cannot_access_account_page_from_direct_link_on_valid_login()
        test_changing_first_name_and_saving_maintains_that_setting(cloud_account)
        test_changing_last_name_and_saving_maintains_that_setting(cloud_account)
        test_first_name_is_required()
        test_last_name_is_required()
        test_space_for_first_name_is_not_valid()
        test_space_for_last_name_is_not_valid()
        test_language_is_changeable_on_the_account_page()
        test_language_change_affects_emails()
        test_language_change_is_new_default(cloud_account)
