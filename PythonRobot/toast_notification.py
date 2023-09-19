import time

from generic_element import Element


class ToastNotification:

    def __init__(self, driver, alert_text):
        self._driver = driver
        self._alert_text = alert_text

    def message(self):
        message = Element(
            self._driver,
            f"//nx-toast//span[contains(text(),'{self._alert_text}')]",
            )
        self._wait_until_notification_disappears(message)
        return message

    def _wait_until_notification_disappears(self, message, timeout=10):
        start = time.monotonic()
        while True:
            if not message.in_dom:
                return
            if time.monotonic() - start > timeout:
                raise TimeoutError(f"Notification was still in DOM after {timeout} seconds.")
            time.sleep(1)
