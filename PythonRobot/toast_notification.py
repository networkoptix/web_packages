from wrappers import PageText


class ToastNotification:

    def __init__(self, driver, alert_text):
        self._driver = driver
        self._alert_text = alert_text

    def message(self):
        message = PageText(
            self._driver,
            f"//nx-toast//span[contains(text(),'{self._alert_text}')]",
            )
        message.wait_until_does_not_exist(10)
        return message
    