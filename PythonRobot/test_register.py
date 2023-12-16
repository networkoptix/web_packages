import time

from colorama import Fore
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import Suite, CloudAccount
from RobotVariables import RobotVariables
from email_access import EmailClient
from email_access import get_random_email
from generic_elements import Button
from generic_elements import Image
from generic_elements import PageText
from pages.header import HeaderNav
from pages.register_form import RegisterForm
from browsers.chrome import get_chrome

rb = RobotVariables("en_US")
CLOUD_API = CloudPortalAPI()


def page_in_anonymous_state_register_header():
    """
    1. Should open register page in anonymous state by clicking Register button on top right corner.

    [tags]    smoke    ci
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        RegisterForm(driver)


def open_from_success_page():
    """
    2. Should open register page from register success page by clicking Register button on top right corner.

    [Tags]    email
    """
    email = get_random_email(sendemail=True)
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        register_form = RegisterForm(driver)
        register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
        # Todo activate still needs email to work
        with EmailClient(email_alias=email) as client:
            email_message = client.wait_for_activate_account_email()
            link = email_message.get_activate_account_link()
        driver.get(link)
        PageText(driver, rb.ACTIVATION_SUCCESS).wait_until_visible()
        Image(driver, rb.ACTIVATION_SUCCESS_ICON).wait_until_visible()
        Button(driver, rb.ACTIVATION_SUCCESS_LOG_IN_BUTTON).wait_until_visible()
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        RegisterForm(driver)


def page_in_anonymous_state_redister_home():
    """3. Should open register page in anonymous state by clicking Register button on homepage."""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        Button(driver, rb.CREATE_ACCOUNT_BODY).click()
        RegisterForm(driver)


def page_in_anonymouse_state_navigation():
    """4. Should open register page in anonymous state.

    [tags]    C24211    anonymous
    """
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        RegisterForm(driver)


def register_user_with_correct_credentials():
    """
    5. Should register user with correct credentials.

    [tags]    smoke    ci
    """
    email = get_random_email(sendemail=True)
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
        register_form.account_creation_success()


def valid_inputs_no_errors():
    """
    7. With valid inputs no errors are displayed.

    [tags]    C41557
    """
    email = get_random_email()
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        register_form = RegisterForm(driver)
        register_form.first_name_input().input_text("mark")
        register_form.last_name_input().input_text("hamill")
        register_form.email_input().input_text(email)
        register_form.password_input().input_text(rb.BASE_PASSWORD)
        register_form.terms_and_conditions_checkbox().select()
        register_form.first_name_is_required_error().wait_until_not_visible(.5)
        register_form.last_name_is_required_error().wait_until_not_visible(.5)
        register_form.email_is_required_error().wait_until_not_visible(.5)
        register_form.password_is_required_error().wait_until_not_visible(.5)
        register_form.email_is_invalid_error().wait_until_not_visible(.5)
        register_form.password_special_chars_error().wait_until_not_visible(.5)
        register_form.password_is_weak_error().wait_until_not_visible(.5)


def password_masking_and_eye_icon():
    """
    8. Displays password masked, shows password and changes eye icon when clicked.

    [tags]    C24211
    """
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.password_eye_closed()
        assert register_form.password_input().field_type() == "password", "Input type should be 'password'"
        register_form.password_eye_closed().click()
        assert register_form.password_eye_open().is_visible(), "Eye icon not open"
        assert register_form.password_input().field_type() == "text", "Input type should be 'text'"
        register_form.password_eye_open().click()
        assert register_form.password_eye_closed().is_visible(), "Eye icon not closed"
        assert register_form.password_input().field_type() == "password", "Input type should be 'password'"


def should_respond_to_enter_key():
    """9. Should respond to Enter key and save data."""
    email = get_random_email()
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.first_name_input().input_text("mark")
        register_form.last_name_input().input_text("hamill")
        register_form.email_input().input_text(email)
        register_form.password_input().input_text(rb.BASE_PASSWORD)
        register_form.terms_and_conditions_checkbox().select()
        register_form.password_input().input_text(Keys.ENTER)
        register_form.account_creation_success()


def should_respond_to_tab_key():
    """
    10. Should respond to Tab key.

    [tags]    C41867
    """
    with get_chrome() as driver:
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        register_form = RegisterForm(driver)
        time.sleep(1)
        assert register_form.email_input().is_focused, "Email input not focused by default"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        # register_form.email_input().send_keys(Keys.TAB)
        time.sleep(1)
        assert register_form.first_name_input().is_focused, "First name input not focused after TAB"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        assert register_form.last_name_input().is_focused, "Last name input not focused after TAB"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        assert register_form.password_input().is_focused, "Password input not focused after TAB"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        assert register_form.terms_and_conditions_checkbox().is_focused, "Terms and conditions not focused after TAB"
        ActionChains(driver).send_keys(Keys.SPACE).perform()
        time.sleep(1)
        assert register_form.terms_and_conditions_checkbox().is_checked(), "Terms and conditions not checked"
        ActionChains(driver).send_keys(Keys.SPACE).perform()
        time.sleep(2)
        assert not register_form.terms_and_conditions_checkbox().is_checked(), "Terms and conditions checked"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        ActionChains(driver).send_keys(Keys.ENTER).perform()
        time.sleep(1)
        assert register_form.terms_and_conditions_link().is_focused(), "TaC link not focused after TAB"
        driver.switch_to.window(driver.window_handles[1])
        driver.location_should_be(f"{rb.ENV}/content/eula")
        driver.switch_to.window(driver.window_handles[0])
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        ActionChains(driver).send_keys(Keys.ENTER).perform()
        time.sleep(1)
        assert register_form.privacy_policy_link().is_focused(), "Privacy link not focused after TAB"
        driver.switch_to.window(driver.window_handles[2])
        driver.location_should_be("https://www.networkoptix.com/privacy-policy")
        driver.switch_to.window(driver.window_handles[0])
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        assert register_form.login_button().is_focused(), "Login Button not focused after TAB"
        ActionChains(driver).send_keys(Keys.TAB).perform()
        time.sleep(1)
        assert register_form.create_account_button().is_focused(), "Create Account Button not focused after TAB"
        register_form.first_name_is_required_error().wait_until_visible()
        register_form.last_name_is_required_error().wait_until_visible()
        register_form.email_is_required_error().wait_until_visible()
        register_form.password_is_required_error().wait_until_visible()


def terms_and_conditions_in_new_page():
    """
    11. Should open Terms and conditions in a new page.

    [tags]    C41558
    """
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        RegisterForm(driver).terms_and_conditions_link().click()
        time.sleep(1)
        driver.switch_to.window(driver.window_handles[1])
        driver.location_should_be(f"{rb.ENV}/content/eula")


def privacy_policy_in_new_page():
    """
    12. Should open Privacy Policy in a new page.

    [tags]    C41558
    """
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        RegisterForm(driver).privacy_policy_link().click()
        time.sleep(1)
        driver.switch_to.window(driver.window_handles[1])
        driver.location_should_be("https://www.networkoptix.com/privacy-policy")


def cant_register_email_already_registered():
    """
    19. Cannot register email that is already registered.

    [tags]    C41563
    """
    email = get_random_email()
    CLOUD_API.register_account("mark", "hamill", email, rb.BASE_PASSWORD)
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
        register_form.account_already_exists_error()


def cant_register_email_already_activated(activated_cloud_user: CloudAccount):
    """
    20. Cannot register email that is already activated.

    [tags]    C41563
    """
    with get_chrome() as driver:
        driver.get(f'{rb.ENV}/authorize?client_type=create')
        register_form = RegisterForm(driver)
        register_form.register_new_user(
            "mark",
            "hamill",
            activated_cloud_user.email,
            activated_cloud_user.password,
            )
        register_form.account_already_exists_error()


def check_register_email():
    """
    21. Check registration email links, colors, cloud name, and user name.

    [tags]    C24211    C43021    Customizations    smoke    ci
    """
    with get_chrome() as driver:
        email = get_random_email(sendemail=True)
        driver.get(rb.ENV)
        HeaderNav(driver).create_account().click()
        register_form = RegisterForm(driver)
        register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
        time.sleep(10)

    with EmailClient(email_alias=email) as client:
        email_message = client.wait_for_activate_account_email()
        client.delete_email(email_message)
    email_message.get_activate_account_link()
    assert email_message.get_button_color(rb.ENV) == rb.THEME_COLOR
    assert email_message.is_cloud_name_present(rb.PRODUCT_NAME)
    expected_links = [rb.SUPPORT_URL, rb.WEBSITE_URL, rb.ENV, f'{rb.ENV}/authorize/activate']
    email_message.find_links_in_body(expected_links)


if __name__ == "__main__":
    with Suite() as suite:
        cloud_account = suite.create_cloud_account()
        cant_register_email_already_activated(cloud_account)
        print(f'{Fore.WHITE}{cant_register_email_already_activated.__doc__}\t{Fore.GREEN}| PASS |')

    page_in_anonymous_state_register_header()
    print(f'{Fore.WHITE}{page_in_anonymous_state_register_header.__doc__}\t{Fore.GREEN}| PASS |')

    open_from_success_page()
    print(f'{Fore.WHITE}{open_from_success_page.__doc__}\t{Fore.GREEN}| PASS |')

    page_in_anonymous_state_redister_home()
    print(f'{Fore.WHITE}{page_in_anonymous_state_redister_home.__doc__}\t{Fore.GREEN}| PASS |')

    page_in_anonymouse_state_navigation()
    print(f'{Fore.WHITE}{page_in_anonymouse_state_navigation.__doc__}\t{Fore.GREEN}| PASS |')

    register_user_with_correct_credentials()
    print(f'{Fore.WHITE}{register_user_with_correct_credentials.__doc__}\t{Fore.GREEN}| PASS |')

    valid_inputs_no_errors()
    print(f'{Fore.WHITE}{valid_inputs_no_errors.__doc__}\t{Fore.GREEN}| PASS |')

    password_masking_and_eye_icon()
    print(f'{Fore.WHITE}{password_masking_and_eye_icon.__doc__}\t{Fore.GREEN}| PASS |')

    should_respond_to_enter_key()
    print(f'{Fore.WHITE}{should_respond_to_enter_key.__doc__}\t{Fore.GREEN}| PASS |')

    should_respond_to_tab_key()
    print(f'{Fore.WHITE}{should_respond_to_tab_key.__doc__}\t{Fore.GREEN}| PASS |')

    terms_and_conditions_in_new_page()
    print(f'{Fore.WHITE}{terms_and_conditions_in_new_page.__doc__}\t{Fore.GREEN}| PASS |')

    privacy_policy_in_new_page()
    print(f'{Fore.WHITE}{privacy_policy_in_new_page.__doc__}\t{Fore.GREEN}| PASS |')

    cant_register_email_already_registered()
    print(f'{Fore.WHITE}{cant_register_email_already_registered.__doc__}\t{Fore.GREEN}| PASS |')

    check_register_email()
    print(f'{Fore.WHITE}{check_register_email.__doc__}\t{Fore.GREEN}| PASS |')
