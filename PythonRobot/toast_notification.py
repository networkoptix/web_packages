from generic_elements import PageText


class ToastNotification:

    def __init__(self, driver, alert_text):
        self._driver = driver
        self._alert_text = alert_text

    def get_message(self) -> PageText:
        message = PageText(
            self._driver,
            f"//nx-toast//span[contains(text(),'{self._alert_text}')]",
            )
        message.wait_until_visible(timeout=50)
        message.wait_until_not_visible(10)
