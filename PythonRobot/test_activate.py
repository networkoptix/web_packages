import resource_import
from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from email_access import get_random_email
from email_access import EmailClient
from pages.login import LoginDialog
from pages.register_form import RegisterForm
from generic_elements import Button
from generic_elements import PageText
from resource_import import get_chrome

rb = RobotVariables("en_US")


def register_and_activate():
    """1. Register and Activate"""
    with resource_import.get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "Mark", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login(random_email, rb.BASE_PASSWORD)


def register_and_activate_curly_text():
    """2. Allows register, activate, login with curly text in First and Last name fields"""
    with get_chrome() as driver:
        curly_names = [rb.CYRILLIC_TEXT, rb.SMILEY_TEXT, rb.GLYPH_TEXT, rb.SYMBOL_TEXT]
        for name in curly_names:
            random_email = get_random_email(sendemail=True)
            resource_import.register_and_activate_account(
                driver, name, name, random_email, rb.BASE_PASSWORD, from_email=False)


def register_and_activate_special_chars():
    """3. Allows register, activate, login with +!#$%'*-/=\?^_`{\|}~ in email field"""
    with get_chrome() as driver:
        random_email = get_random_email(rb.BASE_EMAIL, symbols=True)
        resource_import.register_and_activate_account(
            driver, "Mark", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login(random_email, rb.BASE_PASSWORD)


def register_activate_with_leading_space():
    """4. Allows register, activate, login with leading space in email"""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    with get_chrome() as driver:
        random_email = " " + get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "bla", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)


def register_activate_with_trailing_space():
    """5. Allows register, activate, login with trailing space in email"""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True) + " "
        resource_import.register_and_activate_account(
            driver, "barf", "Hamil", random_email, rb.BASE_PASSWORD, from_email=False)


def register_and_activate_with_special_chars_in_pw():
    """6. Allows register, activate, login with pass!@#$%^&*()_-+=;:'\"`~,./\|?[]{} password"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "#@!k", "Hamil", random_email, rb.SYMBOL_PASSWORD, from_email=False)
        driver.get(rb.ENV + "/account")
        LoginDialog(driver).basic_cloud_login(random_email, rb.SYMBOL_PASSWORD)


def activate_same_link_twice():
    """7. Should show activation success if same link is used twice"""
    random_email = get_random_email(sendemail=True)
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        RegisterForm(driver).register_new_user("Acti", "Vader", random_email, rb.BASE_PASSWORD)
    with EmailClient(email_alias=random_email) as client:
        email_message = client.wait_for_activate_account_email()
        link = email_message.get_activate_account_link()
    driver.get(link)
    PageText(driver, rb.ACTIVATION_SUCCESS).wait_until_visible(timeout=10)
    driver.get(link)
    PageText(driver, rb.ACTIVATION_SUCCESS).wait_until_visible(timeout=10)


def save_user_data_correctly():
    """8. Should save user data to user account correctly"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "Moo", "Cow", random_email, rb.BASE_PASSWORD, from_email=False)
        user_data = CloudPortalAPI().get_account_data(random_email, rb.BASE_PASSWORD)
        assert user_data['first_name'] == "Moo"
        assert user_data['last_name'] == "Cow"


def truncate_long_names():
    """9. Should allow to enter more than 255 symbols in First and Last names and cut it to 255"""
    # Bug: https://networkoptix.atlassian.net/browse/CLOUD-11071
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "bla", "bla", random_email, rb.BASE_PASSWORD, from_email=False)


def trim_leading_spaces():
    """10. Should trim leading spaces in First and Last names"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register_and_activate_account(
            driver, "   fra ", "   frafra ", random_email, rb.BASE_PASSWORD, from_email=False)
        user_data = CloudPortalAPI().get_account_data(random_email, rb.BASE_PASSWORD)
        assert user_data['first_name'] == "fra"
        assert user_data['last_name'] == "frafra"


def allow_activation_desktop():
    """11. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=desktop"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register(
            driver, "darth", "bye", random_email, rb.BASE_PASSWORD, view_type="desktop")
        resource_import.activate(driver, random_email, rb.BASE_PASSWORD)


def allow_activation_mobile():
    """12. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=mobile"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        resource_import.register(
            driver, "darth", "desktop", random_email, rb.BASE_PASSWORD, view_type="mobile")
        resource_import.activate(driver, random_email, rb.BASE_PASSWORD)


def link_works_logged_out():
    """13. Link works and suggests to log out user, if he was logged in, buttons operate correctly"""
    # TODO: is this necessary? says robot test


def login_before_activation():
    """14. Should allow to login with email instead of username"""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        RegisterForm(driver).register_new_user("Acti", "Vader", random_email, rb.BASE_PASSWORD)
        with EmailClient(email_alias=random_email) as client:
            email_message = client.wait_for_activate_account_email()
            email_message.get_activate_account_link()
            client.delete_email(email_message)
        driver.get(f'{rb.ENV}/authorize')
        login = LoginDialog(driver)
        login._wait_until_modal_is_visible()
        login.email_input().input_text(random_email)
        login.next_button().click()
        Button(driver, rb.RESEND_ACTIVATION_LINK_BUTTON).wait_until_visible()
        Button(driver, rb.RESEND_ACTIVATION_LINK_BUTTON).click()
        with EmailClient(email_alias=random_email) as client:
            email_message = client.wait_for_activate_account_email()
            email_message.get_activate_account_link()


if __name__ == "__main__":
    # TODO: doesn't work due to known bugs.
    # register_and_activate_special_chars()
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
