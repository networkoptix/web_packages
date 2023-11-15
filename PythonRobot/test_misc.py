from RobotVariables import RobotVariables
from generic_elements import Button
from generic_elements import Link
from generic_elements import PageText
from browsers.chrome import get_chrome
from variables import ENV


def test_404_page():
    """Go to a URL that doesn't exist and click the home page link.

    See: https://networkoptix.testrail.net/index.php?/cases/view/41565
    """
    rb = RobotVariables("en_US")
    with get_chrome() as driver:
        driver.get(ENV + '/path-that-does-not-exist')
        message_locator = rb.replace_nested_variables('''//h2[@name="404" and contains(text(),'{PAGE_NOT_FOUND_TEXT}')]''')
        PageText(driver, message_locator).wait_until_visible()
        button_locator = rb.replace_nested_variables('//button/a[text()="{GO_TO_MAIN_PAGE_TEXT}"]')
        Button(driver, button_locator).wait_until_visible()
        Link(driver, button_locator).click()
        driver.location_should_be(ENV + '/')


if __name__ == '__main__':
    test_404_page()
