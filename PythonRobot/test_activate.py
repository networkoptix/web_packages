import resource_import


from RobotVariables import RobotVariables
import robot_keywords
from generic_element import Element
from register_form import RegisterForm
from time import sleep
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from email_access import Email
from login import LoginDialog

rb = RobotVariables("en_US")

def register_and_activate():
    """1. Register and Activate"""
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register_and_activate_account(driver, "Mark", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    resource_import.cloud_login(driver, random_email, rb.BASE_PASSWORD, button=None, api=False)

def register_and_activate_curly_text():
    """2  Allows register, activate, login with curly text in First and Last name fields"""
    driver = resource_import.get_headless_chrome()
    curly_names = [rb.CYRILLIC_TEXT, rb.SMILEY_TEXT, rb.GLYPH_TEXT, rb.SYMBOL_TEXT]
    for name in curly_names:
        random_email = Email.get_random_email(sendemail=True)
        resource_import.register_and_activate_account(driver, name, name, random_email, rb.BASE_PASSWORD, from_email=False)

def register_and_activate_special_chars():
    """3  Allows register, activate,  login with +!#$%'*-/=\?^_`{\|}~ in email field"""
    driver = resource_import.get_headless_chrome()
    random_email = resource_import.get_random_email(rb.BASE_EMAIL, symbols=True)
    resource_import.register_and_activate_account(driver, "Mark", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    resource_import.cloud_login(driver, random_email, rb.BASE_PASSWORD, button=None, api=False) 

def register_activate_with_leading_space():
    """4. Allows register, activate, login with with leading space in email"""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    driver = resource_import.get_headless_chrome()
    random_email = " " + Email.get_random_email(sendemail=True)
    resource_import.register_and_activate_account(driver, "bla", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)

def register_activate_with_trailing_space():
    """5. Allows register, activate, login with with trailing space in email"""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True) + " "
    resource_import.register_and_activate_account(driver, "barf", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)

def register_and_activate_with_special_chars_in_pw():
    """6. Allows register, activate, login with pass!@#$%^&*()_-+=;:'\"`~,./\|?[]{} password"""
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register_and_activate_account(driver, "#@!k", "Hamil", random_email, rb.SYMBOL_PASSWORD, from_email=False)
    robot_keywords.go_to_url(driver, rb.ENV + "/account")
    resource_import.cloud_login(driver, random_email, rb.SYMBOL_PASSWORD, button=None, api=False)

def activate_same_link_twice():
    """7. Should show activation success if same link is used twice"""
    random_email = Email.get_random_email(sendemail=True)

    driver = resource_import.get_headless_chrome()
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize?client_type=create')
    rf = RegisterForm(driver)
    rf.register_new_user("Acti", "Vader", random_email, rb.BASE_PASSWORD)

    e = Email()
    link = e.get_email_link(random_email, 'activate')
    robot_keywords.go_to_url(driver, link)
    Element(driver, rb.ACTIVATION_SUCCESS).wait_until_visible(timeout=10)
    # You go back, Jack,  do it again. Wheel turnin' round and round
    robot_keywords.go_to_url(driver, link)
    Element(driver, rb.ACTIVATION_SUCCESS).wait_until_visible(timeout=10)


def save_user_data_correctly():
    """8. Should save user data to user account correctly"""

    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register_and_activate_account(driver, "Moo", "Cow", random_email, rb.BASE_PASSWORD, from_email=False)

    api = CloudPortalAPI()
    user_data = api.get_account_data(random_email, rb.BASE_PASSWORD)

    assert user_data['first_name'] == "Moo"
    assert user_data['last_name'] == "Cow"

def truncate_long_names():
    """9. Should allow to enter more than 255 symbols in First and Last names and cut it to 255"""
    # TODO: doesn't work with 300 chars.
    # TODO: bug: https://networkoptix.atlassian.net/browse/CQA-580
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    #resource_import.register_and_activate_account(driver, rb.THREEHUNDREDCHARS, rb.THREEHUNDREDCHARS, random_email, rb.BASE_PASSWORD, from_email=False)
    resource_import.register_and_activate_account(driver, "bla", "bla", random_email, rb.BASE_PASSWORD, from_email=False)

def trim_leading_spaces():
    """10. Should trim leading spaces in First and Last names"""
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register_and_activate_account(driver, "   fra ", "   frafra ", random_email, rb.BASE_PASSWORD, from_email=False)
    api = CloudPortalAPI()
    user_data = api.get_account_data(random_email, rb.BASE_PASSWORD)
    assert user_data['first_name'] == "fra"
    assert user_data['last_name'] == "frafra"

def allow_activation_desktop():
    """11. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=desktop"""
    
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register(driver, "darth", "bye", random_email, rb.BASE_PASSWORD, view_type="desktop")
    resource_import.activate(driver, random_email, rb.BASE_PASSWORD)

def allow_activation_mobile():
    """12. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=mobile"""
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    resource_import.register(driver, "darth", "desktop", random_email, rb.BASE_PASSWORD, view_type="mobile")
    resource_import.activate(driver, random_email, rb.BASE_PASSWORD)

def link_works_logged_out():
    """13. Link works and suggests to log out user, if he was logged in, buttons operate correctly"""
    # TODO: is this necessary? says robot test

def login_before_activation():
    """14. Should allow to login with email instead of username"""
    driver = resource_import.get_headless_chrome()
    random_email = Email.get_random_email(sendemail=True)
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize?client_type=create')
    rf = RegisterForm(driver)
    rf.register_new_user("Acti", "Vader", random_email, rb.BASE_PASSWORD)

    e = Email()
    link = e.get_email_link(random_email, 'activate')
    if not link:
        raise Exception("Registration email not found")
 
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize')
    login = LoginDialog(driver)
    login._wait_until_modal_is_visible()
    login.email_input().input_text(random_email)
    login.next_button().click()
    robot_keywords.wait_until_element_is_visible(driver, rb.RESEND_ACTIVATION_LINK_BUTTON)

    robot_keywords.click_button(driver, rb.RESEND_ACTIVATION_LINK_BUTTON)
    sleep(10) # give time for email to arrive
    link = e.get_email_link(random_email, 'activate')
    if not link:
        raise Exception("Registration email not found")
    
    



if __name__ == "__main__":

    # TODO: doesn't work due to known bugs.
    #register_and_activate_special_chars()
    # register_activate_with_leading_space()
    # register_activate_with_trailing_space()
    # truncate_long_names()

    save_user_data_correctly()
    trim_leading_spaces()
    register_and_activate_with_special_chars_in_pw()
    activate_same_link_twice()
    register_and_activate()
    register_and_activate_curly_text()
    allow_activation_desktop()
    allow_activation_mobile()
    login_before_activation()
