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
from variables import ERROR_COLOR

password = "qweasd1234"
login = "noptixautoqa+owner@gmail.com"
rb = RobotVariables("en_US")

def cloud_login(driver, email, password, validate=True, button=rb.LOG_IN_NAV_BAR, exists=True,  api=False, reset=False, two_FA=False, twoFA_backup_code="" ):
    if button:
        robot_keywords.wait_until_element_is_visible(driver, button)
        robot_keywords.click_element(driver, button)

    if validate and not two_FA:
        # check language variable and set it to default. That is, set language before logging in
        # TODO: check language
        pass
        #TODO: set user theme (ie, light or dark mode)
        pass
    robot_keywords.wait_until_elements_are_visible(driver, [rb.LOG_IN_MODAL, rb.LOG_IN_NEXT_BUTTON, rb.EMAIL_INPUT ])
    time.sleep(1)
    robot_keywords.input_text(driver, rb.EMAIL_INPUT, email)
    time.sleep(1)
    robot_keywords.click_element(driver, rb.LOG_IN_NEXT_BUTTON)

    if exists:
        robot_keywords.wait_until_element_is_visible(driver, rb.PASSWORD_INPUT)
        robot_keywords.input_text(driver, rb.PASSWORD_INPUT,password)
        time.sleep(1)
        robot_keywords.wait_until_element_is_visible(driver, rb.LOG_IN_BUTTON)
        robot_keywords.click_element(driver, rb.LOG_IN_BUTTON)

    else:  
        robot_keywords.wait_until_element_is_visible(driver,rb.ACCOUNT_DOES_NOT_EXIST,rb.YOU_CAN_CREATE_AN_ACCOUNT)
    # TODO: Check if 2fa is true and there is no backup code
    if validate:
        # todo: remove this
        time.sleep(5)
        robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_DROPDOWN)
    time.sleep(0.5)



def test_can_access_account_page_from_dropdown():
    """1 Can access the account page from dropdown"""
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, rb.ENV)
    cloud_login(driver, email, password)
    time.sleep(3)
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_DROPDOWN)
    robot_keywords.click_button(driver, rb.ACCOUNT_DROPDOWN)
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_SETTINGS_BUTTON)
    robot_keywords.click_on_link(driver, rb.ACCOUNT_SETTINGS_BUTTON)
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)


def test_can_access_account_page_from_direct_link():
    """2 Can access the account page from direct link while logged in"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password)
    robot_keywords.go_to_url(driver,rb.ENV + "/account")
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)  

# def test_cannot_access_account_page_from_direct_link_closing_log():
#     """3 Accessing the account page from a direct link while logged out asks for login, closing log in takes you to main page"""
#    this test is skipped in account.robot

def test_cannot_access_account_page_from_direct_link_on_valid_login():
    """4 Accessing the account page from a direct link while logged out asks for login, on valid login takes you to account page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver,rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None)
    robot_keywords.go_to_url(driver,rb.ENV + "/account")
    verify_in_account_page(driver)
    robot_keywords.close_browser(driver)

def test_changing_first_name_and_saving_maintains_that_setting():
    """5 Changing first name and saving maintains that setting"""
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.clear_element_text(driver, rb.ACCOUNT_FIRST_NAME)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, "nameChanged")
    # TODO: the save button doesn't appear.
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_SAVE)
    robot_keywords.click_button(driver, rb.ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    robot_keywords.close_browser(driver)

    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    time.sleep(2)
    robot_keywords.wait_until_textfield_contains(driver, rb.ACCOUNT_FIRST_NAME, "nameChanged")
    robot_keywords.clear_element_text(driver, rb.ACCOUNT_FIRST_NAME)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, rb.TEST_FIRST_NAME)
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_SAVE)
    robot_keywords.click_button(driver, rb.ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)

def test_changing_last_name_and_saving_maintains_that_setting():
    """6 Changing last name and saving maintains that setting"""
    #TODO: 
    driver = get_headless_chrome()
    email = resource_import.get_random_email()
    register_and_activate_account(driver, "Mark", "Hamill", email, password)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, "nameChanged")
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_SAVE)
    robot_keywords.click_button(driver, rb.ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    robot_keywords.close_browser(driver)

    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.wait_until_textfield_contains(driver, rb.ACCOUNT_LAST_NAME, "nameChanged")
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, rb.TEST_LAST_NAME)
    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_SAVE)
    robot_keywords.click_button(driver, rb.ACCOUNT_SAVE)
    robot_keywords.check_for_alert(driver, rb.YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED)
    robot_keywords.close_browser(driver)

def test_first_name_is_required():
    """7 First name is required"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)

    robot_keywords.delete_all_text(driver, rb.ACCOUNT_FIRST_NAME)
    robot_keywords.click_element(driver, rb.ACCOUNT_LAST_NAME)

    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_FIRST_NAME, f"border-color: {rb.ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_FIRST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    robot_keywords.wait_until_elements_are_visible(driver, [rb.ACCOUNT_SAVE, rb.ACCOUNT_CANCEL])
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)

    #robot_keywords.click_button(driver, rb.ACCOUNT_CANCEL)
    for element in [rb.ACCOUNT_SAVE, rb.ACCOUNT_CANCEL]:
        robot_keywords.wait_until_element_is_visible(driver, element)
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_FIRST_NAME, f"border-color: {rb.ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_FIRST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    robot_keywords.click_button(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.close_browser(driver)

def test_last_name_is_required():
    """8 Last name is required"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.delete_all_text(driver, rb.ACCOUNT_LAST_NAME)
    robot_keywords.click_element(driver, rb.ACCOUNT_FIRST_NAME)

    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"border-color: {rb.ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    for element in [rb.ACCOUNT_SAVE, rb.ACCOUNT_CANCEL]:
        robot_keywords.wait_until_element_is_visible(driver, element)
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)

    for element in [rb.ACCOUNT_SAVE, rb.ACCOUNT_CANCEL]:
        robot_keywords.wait_until_element_is_visible(driver, element)
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"border-color: {rb.ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    robot_keywords.click_button(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.close_browser(driver)

def test_SPACE_for_first_name_is_not_valid():
    """9 SPACE for first name is not valid"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, " ")   
    robot_keywords.click_element(driver,   f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]")
    robot_keywords.wait_until_element_has_style(driver, ACCOUNT_FIRST_NAME, f"border-color: {ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_FIRST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.click_button(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.close_browser(driver)

def test_SPACE_for_last_name_is_not_valid():
    """10 SPACE for last name is not valid"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    verify_in_account_page(driver)
    robot_keywords.input_text(driver, rb.ACCOUNT_FIRST_NAME, "Luke")
    robot_keywords.input_text(driver, rb.ACCOUNT_LAST_NAME, " ")

    robot_keywords.click_element(driver,   f"//header/h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"border-top-color: {rb.ERROR_COLOR};")
    robot_keywords.wait_until_element_has_style(driver, rb.ACCOUNT_LAST_NAME, f"color: {rb.ERROR_COLOR_WITH_OPACITY};")
    robot_keywords.element_should_be_disabled(driver, rb.ACCOUNT_SAVE)
    robot_keywords.element_should_be_enabled(driver, rb.ACCOUNT_CANCEL)
    time.sleep(10)
    robot_keywords.click_button(driver, rb.ACCOUNT_CANCEL)
    robot_keywords.close_browser(driver)
    
#def test_email_is_uneditable():
    """11 Email is uneditable"""
    # The email is uneditable so there is no need to test for it.
    


# todo: test 12 should be skipped?
def test_should_respond_tab_and_go():
    """12 Should respond to tab and go in the correct order"""
    pass

def test_language_is_changeable_on_the_account_page():
    """13 Language is changeable on the account page"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, "noptixautoqa+owner@gmail.com", password, button=None, api=False)
    robot_keywords.reload_page(driver)
    lang_dict = get_lang_list()
    for lang in lang_dict:
        info_text = lang_dict[lang]["ACCOUNT INFORMATION"]
        time.sleep(1)
        verify_in_account_page(driver)
        if lang != rb.LANGUAGE:
            robot_keywords.click_button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN)
            # TODO: this is not working
            #robot_keywords.wait_until_element_is_visible(driver, f"//nx-language-select//button/following-sibling::ul//span[@lang='${lang}']")
            robot_keywords.click_element(driver, f"//nx-language-select//button/following-sibling::ul//span[@lang='{lang}']/..")
            time.sleep(2)
            robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{info_text}')]")

    robot_keywords.wait_until_element_is_visible(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN)
    robot_keywords.click_button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN)
    # TODO: this is not working
    #robot_keywords.wait_until_element_is_visible(driver, f"//header//nx-header-language-select//span[@lang='{rb.LANGUAGE}']")
    robot_keywords.click_element(driver, f"//nx-language-select//button/following-sibling::ul//span[@lang='{rb.LANGUAGE}']")
    time.sleep(1)
    verify_in_account_page(driver)
    robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{rb.ACCOUNT_INFORMATION}')]")
    robot_keywords.close_browser(driver)

def test_language_change_affects_emails():
    """14 Language change affects emails"""
    driver = get_headless_chrome()
    password = "theF0rc3"
    random_email = get_random_email(rb.BASE_EMAIL_SENDEMAIL, sendemail=True)
    register_and_activate_account(driver, "Darth", "Vader", random_email, password)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    subject = "Reset your password"
    if rb.LANGUAGE != "ru_Ru":
        subject = "Восстановление пароля"
        cloud_login(driver, random_email, password, button=None, api=False)
        verify_in_account_page(driver)
        robot_keywords.click_button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN)
        robot_keywords.wait_until_element_is_visible(driver, "//nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']/..")
        robot_keywords.click_element(driver, "//nx-language-select//button/following-sibling::ul//span[@lang='ru_RU']")
        time.sleep(5)
        robot_keywords.close_browser(driver)

    # if we just closed the browser, we'll get a MaxRetryError
    try:
        robot_keywords.go_to_url(driver,rb.ENV + "/login") 
    except MaxRetryError:
        driver = None
        driver = get_headless_chrome()

    send_restore_password_email(driver, random_email)
    time.sleep(10)
    mbox = resource_import.open_mailbox(host=rb.BASE_HOST,password=rb.BASE_EMAIL_PASSWORD, email=random_email, is_secure=True)
    email_uid = resource_import.wait_for_email(mbox, recipient=random_email, timeout=120, status="UNREAD")
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
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)

    verify_in_account_page(driver)
    robot_keywords.click_button(driver, rb.ACCOUNT_LANGUAGE_DROPDOWN)
    lang = 'de_DE' if rb.LANGUAGE == 'ja_JP' else 'ja_JP'
    droplang1 = rb.ACCOUNT_LANGUAGE_DROPDOWN + f"/following-sibling::ul//span[@lang='{lang}']"
    robot_keywords.wait_until_element_is_visible(driver, droplang1)
    robot_keywords.click_element(driver, droplang1)

    time.sleep(5)
    driver.refresh()

    dropLang2 = rb.ACCOUNT_LANGUAGE_DROPDOWN + "/span[@id='activeLang']"
    robot_keywords.wait_until_element_is_visible(driver, dropLang2)   
    activeLang = robot_keywords.get_text(driver, dropLang2)
    assert activeLang.lower() in lang.lower(), f"{activeLang.lower()} not found in {lang.lower}"

    if lang == 'ja_JP':
        robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
    elif lang == 'de_DE':
        robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")

    resource_import.logout_japanese(driver)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    cloud_login(driver, email, password, button=None, api=False)

    api = CloudPortalAPI()
    api.set_account_language(email, password, new_language=lang)

    time.sleep(5)
    driver.refresh()

    robot_keywords.wait_until_element_is_visible(driver, dropLang2)
    activeLang = robot_keywords.get_text(driver, dropLang2)

    if activeLang.lower() not in lang.lower():
        assert False, f"{activeLang.lower()} not found in {lang.lower()}"  
    if rb.LANGUAGE == 'ja_JP':
        robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{ja_JP_account_info}')]")
    elif rb.LANGUAGE == 'de_DE':
        robot_keywords.wait_until_element_is_visible(driver, f"//header//h4[contains(text(),'{de_DE_account_info}')]")

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
    # test_first_name_is_required()
    # test_last_name_is_required()
    # test_SPACE_for_first_name_is_not_valid()
    # test_SPACE_for_last_name_is_not_valid()
    # test_should_respond_tab_and_go()
    # test_language_is_changeable_on_the_account_page()
    # test_language_change_affects_emails()



    test_language_change_is_new_default()


  

