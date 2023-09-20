from RobotVariables import RobotVariables
from header import HeaderNav
from login import LoginDialog
from resource_import import get_headless_chrome
from resource_import import get_random_email
from resource_import import register_and_activate_account
from wrappers import Button
from wrappers import PageText

rb = RobotVariables("en_US")
password = "qweasd 123"


def test_inaccessible_system_page():
    """Failed to access system page correctly shows when going to a non-existent system"""
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
    PageText(driver, link_is_broken_xpath).wait_until_visible()
    Button(driver, '//button//a[@routerlink="/"]/..').wait_until_visible()


if __name__ == '__main__':
    test_inaccessible_system_page()
