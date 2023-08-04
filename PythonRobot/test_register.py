from selenium import webdriver
from resource_import import get_headless_chrome, get_random_email, activate
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from test_account import cloud_login
import robot_keywords
from RobotVariables import RobotVariables
import robot_lists as rl
from colorama import Fore, Back, Style
from button import Button
from header import HeaderNav
from register_form import RegisterForm

rb = RobotVariables("en_US")
# driver = get_headless_chrome()
# robot_keywords.go_to_url(driver, rb.ENV)

def page_in_anonymous_state_register_header():
    """1. Should open register page in anonymous state by clicking Register button on top right corner"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    HeaderNav(driver).create_account().click()
    RegisterForm(driver)
    driver.close()

def open_from_success_page():
    """2. Should open register page from register success page by clicking Register button on top right corner"""
    email = get_random_email(sendemail=True)
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    HeaderNav(driver).create_account().click()
    register_form = RegisterForm(driver)
    register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
    #Todo activate still needs email to work
    # activate(driver, email, from_email=True)
    # robot_keywords.go_to_url(driver, rb.ENV)
    # HeaderNav(driver).create_account().click()
    # RegisterForm(driver)
    driver.close()

def page_in_anonymous_state_redister_home():
    """3. Should open register page in anonymous state by clicking Register button on homepage"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    Button(driver, rb.CREATE_ACCOUNT_BODY).click()
    RegisterForm(driver)
    driver.close()

def page_in_anonymouse_state_navigation():
    """4. Should open register page in anonymous state"""
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize?client_type=create')
    RegisterForm(driver)
    driver.close()

def register_user_with_correct_credentials():
    """5. Should register user with correct credentials"""
    email = get_random_email(sendemail=True)
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize?client_type=create')
    register_form = RegisterForm(driver)
    register_form.register_new_user("mark", "hamill", email, rb.BASE_PASSWORD)
    register_form.account_creation_success()
    driver.close()

def valid_inputs_no_errors():
    """7. With valid inputs no errors are displayed"""
    email = get_random_email(sendemail=True)
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, rb.ENV)
    HeaderNav(driver).create_account().click()
    register_form = RegisterForm(driver)
    register_form.first_name_input().input_text("mark")
    register_form.last_name_input().input_text( "hamill")
    register_form.email_input().input_text(email)
    register_form.password_input().input_text(rb.BASE_PASSWORD)
    register_form.terms_and_conditions_checkbox().select() 
    if register_form.first_name_is_required_error().in_dom:
        raise RuntimeError("Fist name required error was visible")
    if register_form.last_name_is_required_error().in_dom:
        raise RuntimeError("last name required error was visible")
    if register_form.email_is_required_error().in_dom:
        raise RuntimeError("email required error was visible")
    if register_form.password_is_required_error().in_dom:
        raise RuntimeError("password required error was visible")
    if register_form.email_is_invalid_error().in_dom:
        raise RuntimeError("email invalid error was visible")
    if register_form.password_special_chars_error().in_dom:
        raise RuntimeError("password special chars error was visible")
    if register_form.password_is_weak_error().in_dom:
        raise RuntimeError("password weak error was visible")
    driver.close()

def password_masking_and_eye_icon():
    """8. Displays password masked, shows password and changes eye icon when clicked"""   
    driver = get_headless_chrome()
    robot_keywords.go_to_url(driver, f'{rb.ENV}/authorize?client_type=create')
    register_form = RegisterForm(driver)
    register_form.password_eye_closed()
    assert register_form.password_input().field_type() == "password", "Input type should be 'password'"
    register_form.password_eye_closed().click()
    assert register_form.password_eye_open().is_visible, "Eye icon not open"
    assert register_form.password_input().field_type() == "text", "Input type should be 'text'"
    register_form.password_eye_open().click()
    assert register_form.password_eye_closed().is_visible, "Eye icon not closed"
    assert register_form.password_input().field_type() == "password", "Input type should be 'password'"    
    driver.close()

if __name__ == "__main__":
    page_in_anonymous_state_register_header()
    print(f'{Fore.WHITE}{page_in_anonymous_state_register_header.__doc__}\t\t\t{Fore.GREEN}| PASS |')

    open_from_success_page()
    print(f'{Fore.WHITE}{open_from_success_page.__doc__}\t\t{Fore.GREEN}| PASS |')

    page_in_anonymous_state_redister_home()
    print(f'{Fore.WHITE}{page_in_anonymous_state_redister_home.__doc__}\t\t\t\t{Fore.GREEN}| PASS |')

    page_in_anonymouse_state_navigation()
    print(f'{Fore.WHITE}{page_in_anonymouse_state_navigation.__doc__}\t\t\t\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    register_user_with_correct_credentials()
    print(f'{Fore.WHITE}{register_user_with_correct_credentials.__doc__}\t\t\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    valid_inputs_no_errors()
    print(f'{Fore.WHITE}{valid_inputs_no_errors.__doc__}\t\t\t\t\t\t\t\t\t{Fore.GREEN}| PASS |')

    password_masking_and_eye_icon()
    print(f'{Fore.WHITE}{password_masking_and_eye_icon.__doc__}\t\t\t\t\t{Fore.GREEN}| PASS |')