from generic_element import Element
from resource_import import get_headless_chrome
from resource_import import rb
from robot_keywords import click_on_link
from robot_keywords import location_should_be
from variables import ENV


def test_404_page():
    """Go to a URL that doesn't exist and click the home page link.

    See: https://networkoptix.testrail.net/index.php?/cases/view/41565
    """
    driver = get_headless_chrome()
    driver.get(ENV + '/path-that-does-not-exist')
    message_locator = rb.replace_nested_variables('''//h2[@name="404" and contains(text(),'{PAGE_NOT_FOUND_TEXT}')]''')
    Element(driver, message_locator).wait_until_visible()
    button_locator = rb.replace_nested_variables('//button/a[text()="{GO_TO_MAIN_PAGE_TEXT}"]')
    Element(driver, button_locator).wait_until_visible()
    click_on_link(driver, button_locator)
    location_should_be(driver, ENV + '/')


if __name__ == '__main__':
    test_404_page()
