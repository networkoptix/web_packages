import time

from urllib3.exceptions import MaxRetryError

import resource_import
import robot_keywords
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from resource_import import get_headless_chrome
from resource_import import get_lang_list
from resource_import import get_random_email
from resource_import import register_and_activate_account
from resource_import import send_restore_password_email
from resource_import import verify_in_account_page
from wrappers import Button
from wrappers import DropDown
from wrappers import Link
from wrappers import PageText
from wrappers import Pane
from wrappers import TextField

password = "qweasd1234"
login = "noptixautoqa+owner@gmail.com"
rb = RobotVariables("en_US")

def cloud_login(driver, email, password, validate=True, button=rb.LOG_IN_NAV_BAR, exists=True,  api=False, reset=False, two_FA=False, twoFA_backup_code="" ):
    if button:
        button_element = Button(driver, button)
        button_element.wait_until_visible()
        button_element.click()
    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        #TODO: set user theme (ie, light or dark mode)
        pass
    Pane(driver, rb.LOG_IN_MODAL).wait_until_visible()
    Button(driver, rb.LOG_IN_NEXT_BUTTON).wait_until_visible()
    TextField(driver, rb.EMAIL_INPUT).wait_until_visible()
    time.sleep(1)
    robot_keywords.input_text(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    Button(driver, rb.LOG_IN_NEXT_BUTTON).click()
    if exists:
        TextField(driver, rb.PASSWORD_INPUT).wait_until_visible()
        robot_keywords.input_text(driver, rb.PASSWORD_INPUT, password)
        time.sleep(1)
        Button(driver, rb.LOG_IN_BUTTON).wait_until_visible()
        Button(driver, rb.LOG_IN_BUTTON).click()
    else:
        PageText(driver, rb.ACCOUNT_DOES_NOT_EXIST).wait_until_visible()
        PageText(driver, rb.YOU_CAN_CREATE_AN_ACCOUNT).wait_until_visible()
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        # todo: remove this
        time.sleep(5)
        DropDown(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    time.sleep(0.5)


def test_can_access_account_page_from_dropdown():
    """1 Can access the account page from dropdown"""
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    driver.get(rb.ENV)
    cloud_login(driver, email, password)
    time.sleep(3)
    DropDown(driver, rb.ACCOUNT_DROPDOWN).wait_until_visible()
    Button(driver, rb.ACCOUNT_DROPDOWN).click()
    Button(driver, rb.ACCOUNT_SETTINGS_BUTTON).wait_until_visible()
    Link(driver, rb.ACCOUNT_SETTINGS_BUTTON).click()
    verify_in_account_page(driver)
    driver.quit()


def test_can_access_account_page_from_direct_link():
    """2 can access the account page from direct link while logged in"""
    driver = get_headless_chrome()
    driver.get(rb.env)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password)
    url = rb.env + "/account"
    driver.get(url)
    verify_in_account_page(driver)
    driver.quit()


# def test_cannot_access_account_page_from_direct_link_closing_log():
#     """3 accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page"""
#    this test is skipped in account.robot

def test_cannot_access_account_page_from_direct_link_on_valid_login():
    """4 accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page"""
    driver = get_headless_chrome()
    url = rb.env + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=none)
    url1 = rb.env + "/account"
    driver.get(url1)
    verify_in_account_page(driver)
    driver.quit()


def test_changing_first_name_and_saving_maintains_that_setting():
    """5 changing first name and saving maintains that setting"""
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "mark", "hamill", email, password)
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    TextField(driver, rb.ACCOUNT_FIRST_NAME).clear()
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, "namechanged")
    # todo: the save button doesn't appear.
    Button(driver, rb.ACCOUNT_SAVE).click()
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    driver.quit()
    driver = get_headless_chrome()
    url1 = rb.ENV + "/account"
    driver.get(url1)
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    time.sleep(2)
    robot_keywords.wait_until_textfield_contains(driver, rb.ACCOUNT_FIRST_NAME, "namechanged")
    TextField(driver, rb.ACCOUNT_FIRST_NAME).clear()
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, rb.TEST_FIRST_NAME)
    Button(driver, rb.ACCOUNT_SAVE).click()
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)


def test_changing_last_name_and_saving_maintains_that_setting():
    """6 changing last name and saving maintains that setting"""
    #todo: 
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "mark", "hamill", email, password)
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, "namechanged")
    Button(driver, rb.ACCOUNT_SAVE).click()
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    driver.quit()
    driver = get_headless_chrome()
    url1 = rb.ENV + "/account"
    driver.get(url1)
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.wait_until_textfield_contains(driver, rb.ACCOUNT_LAST_NAME, "namechanged")
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, rb.TEST_LAST_NAME)
    Button(driver, rb.ACCOUNT_SAVE).click()
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    driver.quit()


def test_first_name_is_required():
    """7 first name is required"""
    driver = get_headless_chrome()
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    TextField(driver, rb.ACCOUNT_FIRST_NAME).delete_all_text()
    TextField(driver, rb.ACCOUNT_LAST_NAME).click()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "border-color",
        rb.ERROR_COLOR,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    account_save = Button(driver, rb.ACCOUNT_SAVE)
    account_cancel = Button(driver, rb.ACCOUNT_CANCEL)
    account_save.wait_until_visible()
    account_cancel.wait_until_visible()
    account_save.wait_until_not_clickable()
    account_cancel.wait_until_clickable()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "border-color",
        rb.ERROR_COLOR,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    Button(driver, rb.ACCOUNT_CANCEL).click()
    driver.quit()


def test_last_name_is_required():
    """8 last name is required"""
    driver = get_headless_chrome()
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    TextField(driver, rb.ACCOUNT_LAST_NAME).delete_all_text()
    TextField(driver, rb.ACCOUNT_FIRST_NAME).click()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "border-color",
        rb.ERROR_COLOR,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    account_save = Button(driver, rb.ACCOUNT_SAVE)
    cancel_button = Button(driver, rb.ACCOUNT_CANCEL)
    account_save.wait_until_visible()
    cancel_button.wait_until_visible()
    account_save.wait_until_not_clickable()
    cancel_button.wait_until_clickable()
    account_save.wait_until_visible()
    cancel_button.wait_until_visible()
    account_save.wait_until_not_clickable()
    cancel_button.wait_until_clickable()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "border-color",
        rb.ERROR_COLOR,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    Button(driver, rb.ACCOUNT_CANCEL).click()
    driver.quit()


def test_space_for_first_name_is_not_valid():
    """9 space for first name is not valid"""
    driver = get_headless_chrome()
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, " ")
    PageText(driver, f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "border-color",
        rb.ERROR_COLOR,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_FIRST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    Button(driver, rb.ACCOUNT_SAVE).wait_until_not_clickable()
    Button(driver, rb.ACCOUNT_CANCEL).click()
    driver.quit()


def test_space_for_last_name_is_not_valid():
    """10 space for last name is not valid"""
    driver = get_headless_chrome()
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, "luke")
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, " ")
    PageText(driver,   f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").click()
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "border-top-color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    robot_keywords.wait_until_element_has_style(
        driver,
        rb.ACCOUNT_LAST_NAME,
        "color",
        rb.ERROR_COLOR_WITH_OPACITY,
        )
    Button(driver, rb.ACCOUNT_SAVE).wait_until_not_clickable()
    Button(driver, rb.ACCOUNT_CANCEL).click()
    driver.quit()


def test_language_is_changeable_on_the_account_page():
    """13 language is changeable on the account page"""
    driver = get_headless_chrome()
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    driver.refresh()
    lang_dict = get_lang_list()
    for lang in lang_dict:
        info_text = lang_dict[lang]["ACCOUNT INFORMATION"]
        verify_in_account_page(driver)
        if lang != rb.language:
            Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
            language_button = Button(
                driver,
                f"//nx-language-select//button/following-sibling::ul//span[@lang='{lang}']/..",
                )
            assert language_button.in_dom, f"No button for language {lang}"
            language_button.click()
            PageText(driver, f"//header//h4[contains(text(),'{info_text}')]").wait_until_visible()
    DropDown(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).wait_until_visible()
    Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
    Button(driver, f"//nx-language-select//button/following-sibling::ul//span[@lang='{rb.LANGUAGE}']").click()
    time.sleep(1)
    verify_in_account_page(driver)
    PageText(driver, f"//header//h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]").wait_until_visible()
    driver.quit()


def test_language_change_affects_emails():
    """14 Language change affects emails"""
    driver = get_headless_chrome()
    password = "theF0rc3"
    random_email = get_random_email(rb.BASE_EMAIL_SENDEMAIL, sendemail=True)
    register_and_activate_account(driver, "Darth", "Vader", random_email, password)
    url = rb.ENV + "/account"
    driver.get(url)
    if rb.LANGUAGE != "ru_Ru":
        cloud_login(driver, random_email, password, button=None, api=False)
        verify_in_account_page(driver)
        Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
        button = Button(
            driver,
            "//nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..",
            )
        button.wait_until_visible()
        Button(driver, "//nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']").click()
        time.sleep(5)
        driver.quit()
    # if we just closed the browser, we'll get a MaxRetryError
    try:
        url1 = rb.ENV + "/login"
        driver.get(url1)
    except MaxRetryError:
        driver = get_headless_chrome()
    send_restore_password_email(driver, random_email)
    time.sleep(10)
    mbox = resource_import.open_mailbox(host=rb.BASE_HOST,password=rb.BASE_EMAIL_PASSWORD, email=random_email, is_secure=True)
    email_uid = resource_import.wait_for_email(mbox, recipient=random_email, timeout_sec=120)
    resource_import.delete_email(mbox, email_uid)
    resource_import.check_language_logged_in(random_email, password)


def test_language_change_is_new_default():
    """15 Language change is new default"""
    lang_dict = resource_import.get_lang_list()
    ja_JP_account_info = lang_dict['ja_JP']['ACCOUNT INFORMATION']
    de_DE_account_info = lang_dict['de_DE']['ACCOUNT INFORMATION']
    driver = resource_import.get_headless_chrome()
    email = resource_import.get_random_email()
    password = "qweasd 123"
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    url = rb.ENV + "/account"
    driver.get(url)
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    Button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN).click()
    lang = 'de_DE' if rb.LANGUAGE == 'ja_JP' else 'ja_JP'
    droplang1 = rb.ACCOUNT_LANGUAGE_DROPDOWN + f"/following-sibling::ul//span[@lang='{lang}']"
    DropDown(driver, droplang1).wait_until_visible()
    DropDown(driver, droplang1).click()
    time.sleep(5)
    driver.refresh()
    dropLang2 = rb.ACCOUNT_LANGUAGE_DROPDOWN + "/span[@id='activeLang']"
    DropDown(driver, dropLang2).wait_until_visible()
    drop_lang_element = DropDown(driver, dropLang2)
    activeLang = drop_lang_element.text()
    assert activeLang.lower() in lang.lower(), f"{activeLang.lower()} not found in {lang.lower}"
    if lang == 'ja_JP':
        info_element = PageText(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
        info_element.wait_until_visible()
    elif lang == 'de_DE':
        info_element = PageText(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")
        info_element.wait_until_visible()
    resource_import.logout_japanese(driver)
    url1 = rb.ENV + "/account"
    driver.get(url1)
    cloud_login(driver, email, password, button=None, api=False)
    api = CloudPortalAPI()
    api.set_account_language(email, password, new_language=lang)
    time.sleep(5)
    driver.refresh()
    DropDown(driver, dropLang2).wait_until_visible()
    activeLang = drop_lang_element.text()
    if activeLang.lower() not in lang.lower():
        assert False, f"{activeLang.lower()} not found in {lang.lower()}"  
    if rb.LANGUAGE == 'ja_JP':
        info_element = PageText(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
        info_element.wait_until_visible()
    elif rb.LANGUAGE == 'de_DE':
        info_element = PageText(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")
        info_element.wait_until_visible()
    resource_import.check_language_logged_in(email, password)
    time.sleep(3)
    driver.refresh()


if __name__ == "__main__":
    test_can_access_account_page_from_dropdown()
    # test_can_access_account_page_from_direct_link()
    # # #test_cannot_access_account_page_from_direct_link_closing_log()
    # test_cannot_access_account_page_from_direct_link_on_valid_login()
    # test_changing_first_name_and_saving_maintains_that_setting()
    # test_changing_last_name_and_saving_maintains_that_setting()
    test_first_name_is_required()
    test_last_name_is_required()
    test_space_for_first_name_is_not_valid()
    test_space_for_last_name_is_not_valid()
    test_language_is_changeable_on_the_account_page()
    test_language_change_affects_emails()
    test_language_change_is_new_default()
