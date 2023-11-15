import json
import os
import pathlib
import time

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from generic_elements import Button
from generic_elements import DropDown
from generic_elements import Link
from generic_elements import PageText
from generic_elements import TextField
from pages.header import HeaderNav
from pages.landing_page import LandingPage
from pages.login import LoginDialog
from pages.reset_password_dialog import ResetPasswordDialog
from email_access import EmailClient
from email_access import get_random_email

password = "qweasd1234"
login = "noptixautoqa+owner@gmail.com"
rb = RobotVariables("en_US")


def test_can_access_account_page_from_dropdown(cloud_user: CloudAccount):
    """1 Can access the account page from dropdown"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        header.account_dropdown().wait_until_visible()
        time.sleep(3)
        Button(driver, rb.ACCOUNT_DROPDOWN).click()
        Link(driver, rb.ACCOUNT_SETTINGS_BUTTON).click()
        verify_in_account_page(driver)


def test_can_access_account_page_from_direct_link():
    """2 can access the account page from direct link while logged in"""
    with get_chrome() as driver:
        driver.get(rb.env)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        header.account_dropdown().wait_until_visible()
        url = rb.env + "/account"
        driver.get(url)
        verify_in_account_page(driver)


def test_cannot_access_account_page_from_direct_link_on_valid_login():
    """4 accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page"""
    with get_chrome() as driver:
        url = rb.env + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        url1 = rb.env + "/account"
        driver.get(url1)
        verify_in_account_page(driver)


def test_changing_first_name_and_saving_maintains_that_setting(cloud_user: CloudAccount):
    """5 changing first name and saving maintains that setting"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).clear()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).input_text("namechanged")
        # todo: the save button doesn't appear.
        Button(driver, rb.ACCOUNT_SAVE).click()
        alert = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
        xpath = f"{alert}/../span[contains(text(), '{rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED}')]"
        alert = PageText(driver, xpath)
        alert.wait_until_visible(10)
        alert.wait_until_not_visible(10)
    with get_chrome() as driver:
        url1 = rb.ENV + "/account"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        time.sleep(2)
        text = TextField(driver, rb.ACCOUNT_FIRST_NAME).get_text()
        assert text == "namechanged", "Name was not 'namechanged'"
        TextField(driver, rb.ACCOUNT_FIRST_NAME).clear()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).input_text(rb.TEST_FIRST_NAME)
        Button(driver, rb.ACCOUNT_SAVE).click()
        alert1 = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
        xpath1 = f"{alert1}/../span[contains(text(), '{rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED}')]"
        alert1 = PageText(driver, xpath1)
        alert1.wait_until_visible(10)
        alert1.wait_until_not_visible(10)


def test_changing_last_name_and_saving_maintains_that_setting(cloud_user: CloudAccount):
    """6 changing last name and saving maintains that setting"""
    #todo:
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_LAST_NAME).input_text("namechanged")
        Button(driver, rb.ACCOUNT_SAVE).click()
        alert = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
        xpath = f"{alert}/../span[contains(text(), '{rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED}')]"
        alert = PageText(driver, xpath)
        alert.wait_until_visible(10)
        alert.wait_until_not_visible(10)
    with get_chrome() as driver:
        url1 = rb.ENV + "/account"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_text_is("namechanged")
        TextField(driver, rb.ACCOUNT_LAST_NAME).input_text("hamill")
        Button(driver, rb.ACCOUNT_SAVE).click()
        alert1 = "//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
        xpath1 = f"{alert1}/../span[contains(text(), '{rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED}')]"
        alert1 = PageText(driver, xpath1)
        alert1.wait_until_visible(10)
        alert1.wait_until_not_visible(10)


def test_first_name_is_required():
    """7 first name is required"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).delete_all_text()
        TextField(driver, rb.ACCOUNT_LAST_NAME).click()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("border-color", rb.ERROR_COLOR)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_save = Button(driver, rb.ACCOUNT_SAVE)
        account_save.wait_until_visible()
        account_save.wait_until_not_clickable()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("border-color", rb.ERROR_COLOR)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        Button(driver, rb.ACCOUNT_CANCEL).click()


def test_last_name_is_required():
    """8 last name is required"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_LAST_NAME).delete_all_text()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).click()
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("border-color", rb.ERROR_COLOR)
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        account_save = Button(driver, rb.ACCOUNT_SAVE)
        cancel_button = Button(driver, rb.ACCOUNT_CANCEL)
        account_save.wait_until_visible()
        account_save.wait_until_not_clickable()
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("border-color", rb.ERROR_COLOR)
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        Button(driver, rb.ACCOUNT_CANCEL).click()


def test_space_for_first_name_is_not_valid():
    """9 space for first name is not valid"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).input_text(" ")
        PageText(driver, f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("border-color", rb.ERROR_COLOR)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        Button(driver, rb.ACCOUNT_SAVE).wait_until_not_clickable()
        Button(driver, rb.ACCOUNT_CANCEL).click()


def test_space_for_last_name_is_not_valid():
    """10 space for last name is not valid"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        verify_in_account_page(driver)
        TextField(driver, rb.ACCOUNT_FIRST_NAME).input_text("luke")
        TextField(driver, rb.ACCOUNT_LAST_NAME).input_text(" ")
        PageText(driver,   f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("border-top-color", rb.ERROR_COLOR_WITH_OPACITY)
        TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_has_style("color", rb.ERROR_COLOR_WITH_OPACITY)
        Button(driver, rb.ACCOUNT_SAVE).wait_until_not_clickable()
        Button(driver, rb.ACCOUNT_CANCEL).click()


def test_language_is_changeable_on_the_account_page():
    """13 language is changeable on the account page"""
    with get_chrome() as driver:
        url = rb.ENV + "/account"
        driver.get(url)
        LoginDialog(driver).basic_cloud_login("noptixautoqa+owner@gmail.com", password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        driver.refresh()
        lang_dict = _get_lang_list()
        for lang in lang_dict:
            info_text = lang_dict[lang]["ACCOUNT INFORMATION"]
            verify_in_account_page(driver)
            if lang != rb.language:
                Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
                language_button = Button(
                    driver,
                    f"//nx-language-select//button/following-sibling::ul//span[@lang='{lang}']/..",
                    )
                language_button.click()
                PageText(driver, f"//header//h4[contains(text(),'{info_text}')]").wait_until_visible()
        Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
        Button(driver, f"//nx-language-select//button/following-sibling::ul//span[@lang='{rb.LANGUAGE}']").click()
        time.sleep(1)
        verify_in_account_page(driver)
        PageText(driver, f"//header//h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").wait_until_visible()


def test_language_change_affects_emails():
    """14 Language change affects emails"""
    with get_chrome() as driver:
        with CloudAccount(get_random_email(sendemail=True)) as cloud_user:
            cloud_user.activate()
            url = rb.ENV + "/account"
            driver.get(url)
            if rb.LANGUAGE != "ru_Ru":
                LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
                HeaderNav(driver).account_dropdown().wait_until_visible()
                verify_in_account_page(driver)
                Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
                button = Button(
                    driver,
                    "//nx-language-select//span[@lang='ru_RU']/..",
                    )
                button.click()
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
    """15 Language change is new default"""
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
        verify_in_account_page(driver)
        Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
        japanese_button_locator = f"//following-sibling::ul//span[@id='{japanese_code}']"
        DropDown(driver, japanese_button_locator).click()
        time.sleep(5)
        driver.refresh()
        dropLang2 = rb.ACCOUNT_LANGUAGE_DROPDOWN + "/span[@id='activeLang']"
        drop_lang_element = DropDown(driver, dropLang2)
        activeLang = drop_lang_element.text()
        assert activeLang.lower() in japanese_code.lower(), f"{activeLang.lower()} not found in {japanese_code.lower}"
        info_element = PageText(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
        info_element.wait_until_visible()
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.japanese_log_out_option().click()
        LandingPage(driver).wait_until_loaded()
        url1 = rb.ENV + "/account"
        driver.get(url1)
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        HeaderNav(driver).account_dropdown().wait_until_visible()
        api = CloudPortalAPI()
        api.set_account_language(cloud_user.email, cloud_user.password, new_language=german_code)
        time.sleep(5)
        driver.refresh()
        activeLang = drop_lang_element.text()
        assert activeLang.lower() in german_code.lower(), f"{activeLang.lower()} not found in {german_code.lower()}"
        info_element = PageText(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")
        info_element.wait_until_visible()
        api.set_account_language(cloud_user.email, cloud_user.password, "en_US")


def verify_in_account_page(driver):
    TextField(driver, rb.ACCOUNT_EMAIL).wait_until_visible()
    TextField(driver, rb.ACCOUNT_FIRST_NAME).wait_until_visible()
    TextField(driver, rb.ACCOUNT_LAST_NAME).wait_until_visible()
    DropDown(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).wait_until_visible()
    DropDown(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    Button(driver, rb.DELETE_ACCOUNT_BUTTON).wait_until_visible()
    Button(driver, rb.ACCOUNT_SETTINGS_BUTTON).wait_until_not_visible()
    Button(driver, rb.ACCOUNT_CANCEL).wait_until_not_visible()
    time.sleep(0.5)


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
        # test_can_access_account_page_from_direct_link()
        # test_cannot_access_account_page_from_direct_link_on_valid_login()
        # test_changing_first_name_and_saving_maintains_that_setting()
        # test_changing_last_name_and_saving_maintains_that_setting()
        test_first_name_is_required()
        test_last_name_is_required()
        test_space_for_first_name_is_not_valid()
        test_space_for_last_name_is_not_valid()
        test_language_is_changeable_on_the_account_page()
        test_language_change_affects_emails()
        test_language_change_is_new_default(cloud_account)
