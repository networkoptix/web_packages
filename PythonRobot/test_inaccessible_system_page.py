from RobotVariables import RobotVariables
from generic_element import Element
from header import HeaderNav
from login import LoginDialog
from resource_import import get_headless_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account

rb = RobotVariables("en_US")
password = "qweasd 123"


def test_failed_to_access_system_page_correctly_shows_when_going_to_a_nonexistent_system():
    driver = get_headless_chrome()
    driver.get(rb.ENV)
    email = get_random_email()
    register_and_activate_account(driver, 'Mark', 'Hamill', email, password)
    nav = HeaderNav(driver)
    nav.log_in_button().click()
    LoginDialog(driver).basic_cloud_login(email, password)
    nav.account_dropdown()
    nonexistent_system_url = f'{rb.ENV}systems/nonexistent_system_name'
    driver.get(nonexistent_system_url)
    link_is_broken_xpath = rb.replace_nested_variables('//div[contains(text(), "{THIS_LINK_IS_BROKEN_TEXT}")]')
    Element(driver, link_is_broken_xpath).wait_until_visible()
    Element(driver, '//button//a[@routerlink="/"]/..').wait_until_visible()


if __name__ == '__main__':
    test_failed_to_access_system_page_correctly_shows_when_going_to_a_nonexistent_system()
