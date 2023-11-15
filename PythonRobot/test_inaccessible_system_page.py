from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Suite
from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import PageText
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome

rb = RobotVariables("en_US")


def test_inaccessible_system_page(cloud_user: CloudAccount):
    """Failed to access system page correctly shows when going to a non-existent system"""
    with get_chrome() as driver:
        driver.get(rb.ENV)
        nav = HeaderNav(driver)
        nav.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(cloud_user.email, cloud_user.password)
        nav.account_dropdown()
        nonexistent_system_url = f'{rb.ENV}systems/nonexistent_system_name'
        driver.get(nonexistent_system_url)
        link_is_broken_xpath = rb.replace_nested_variables('//div[contains(text(), "{THIS_LINK_IS_BROKEN_TEXT}")]')
        PageText(driver, link_is_broken_xpath).wait_until_visible()
        Button(driver, '//button//a[@routerlink="/"]/..').wait_until_visible()


if __name__ == '__main__':
    with Suite() as suite:
        cloud_account = suite.create_cloud_account()
        test_inaccessible_system_page(cloud_account)
