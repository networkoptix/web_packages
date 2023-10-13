from generic_elements import TextField


# keep the following functions in alphabetical order


def wait_until_element_has_style(driver, selector, style_name, expected_value, timeout=30):
    TextField(driver, selector).wait_until_has_style(style_name, expected_value, timeout)
