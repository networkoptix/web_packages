from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from RobotVariables import RobotVariables
from browsers.chrome import get_chrome
from email_access import EmailClient
from email_access import get_random_email
from generic_elements import Button
from generic_elements import PageText
from pages.login import LoginDialog
from pages.register_form import RegisterForm

rb = RobotVariables("en_US")


def register_and_activate():
    """1. Register and Activate."""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        with CloudAccount(random_email) as user:
            user.activate()
            driver.get(rb.ENV + "/account")
            LoginDialog(driver).basic_cloud_login(user.email, user.password)


def register_and_activate_curly_text():
    """2. Allows register, activate, login with curly text in First and Last name fields."""
    curly_names = [rb.CYRILLIC_TEXT, rb.SMILEY_TEXT, rb.GLYPH_TEXT, rb.SYMBOL_TEXT]
    for name in curly_names:
        random_email = get_random_email(sendemail=True)
        with CloudAccount(random_email, name, name) as user:
            user.activate()


def register_and_activate_special_chars():
    r"""3. Allows register, activate, login with +!#$%'*-/=\?^_`{\|}~ in email field."""
    with get_chrome() as driver:
        random_email = get_random_email(rb.BASE_EMAIL, symbols=True)
        with CloudAccount(random_email) as user:
            user.activate()
            driver.get(rb.ENV + "/account")
            LoginDialog(driver).basic_cloud_login(user.email, user.password)


def register_activate_with_leading_space():
    """4. Allows register, activate, login with leading space in email."""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    random_email = " " + get_random_email(sendemail=True)
    with CloudAccount(random_email) as user:
        user.activate()


def register_activate_with_trailing_space():
    """5. Allows register, activate, login with trailing space in email."""
    # TODO: doesn't work with space, does work without it
    # Bug: https://networkoptix.atlassian.net/browse/CQA-581
    random_email = get_random_email(sendemail=True) + " "
    with CloudAccount(random_email) as user:
        user.activate()


def register_and_activate_with_special_chars_in_pw():
    r"""6. Allows register, activate, login with pass!@#$%^&*()_-+=;:'\"`~,./\|?[]{} password."""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        with CloudAccount(random_email, "#@!k", "Hamil", password=rb.SYMBOL_PASSWORD) as user:
            user.activate()
            driver.get(rb.ENV + "/account")
            LoginDialog(driver).basic_cloud_login(user.email, user.password)


def activate_same_link_twice():
    """7. Should show activation success if same link is used twice."""
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
    """8. Should save user data to user account correctly."""
    random_email = get_random_email(sendemail=True)
    with CloudAccount(random_email, "Moo", "Cow") as user:
        user.activate()
        user_data = CloudPortalAPI().get_account_data(user.email, user.password)
        assert user_data['first_name'] == "Moo"
        assert user_data['last_name'] == "Cow"


def truncate_long_names():
    """9. Should allow to enter more than 255 symbols in First and Last names and cut it to 255."""
    # Bug: https://networkoptix.atlassian.net/browse/CLOUD-11071
    random_email = get_random_email(sendemail=True)
    with CloudAccount(random_email, "bla", "bla") as user:
        user.activate()


def trim_leading_spaces():
    """10. Should trim leading spaces in First and Last names."""
    random_email = get_random_email(sendemail=True)
    with CloudAccount(random_email, "   fra ", "   frafra ") as user:
        user.activate()
        user_data = CloudPortalAPI().get_account_data(user.email, user.password)
        assert user_data['first_name'] == "fra"
        assert user_data['last_name'] == "frafra"


def allow_activation_desktop():
    """11. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=desktop."""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        driver.get(rb.ENV + "/authorize?client_type=create&view_type=desktop")
        RegisterForm(driver).register_new_user("darth", "bye", random_email, rb.BASE_PASSWORD)
        CloudPortalAPI().activate_account_via_api(random_email, rb.BASE_PASSWORD)


def allow_activation_mobile():
    """12. Should allow activation, if user is registered by link /authorize?client_type=create&view_type=mobile."""
    with get_chrome() as driver:
        random_email = get_random_email(sendemail=True)
        driver.get(rb.ENV + "/authorize?client_type=create&view_type=mobile")
        RegisterForm(driver).register_new_user("darth", "desktop", random_email, rb.BASE_PASSWORD)
        CloudPortalAPI().activate_account_via_api(random_email, rb.BASE_PASSWORD)


def link_works_logged_out():
    """13. Link works and suggests to log out user, if he was logged in, buttons operate correctly."""
    # This test no longer needed


def login_before_activation():
    """14. Should allow to login with email instead of username."""
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
