from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


# keep the following functions in alphabetical order


def wait_until_element_has_style(driver, css_selector, style_name, expected_value, timeout=30):
    def check_style(driver):
        try:
            element = driver.find_element(By.CSS_SELECTOR, css_selector)
            style_value = element.value_of_css_property(style_name)
            return style_value == expected_value
        except:
            return False

    WebDriverWait(driver, timeout).until(check_style)
