import robot_keywords
from generic_element import Element
from RobotVariables import RobotVariables
import time


class ToastNotification:
    def __init__(self, driver, alert_text, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        self.alert_text = alert_text

    def message(self):
        message = Element(self.driver,
                          f"//nx-toast//span[contains(text(),'{self.alert_text}')]")
        return self._wait_until_notification_disappears(message)

    def _wait_until_notification_disappears(self, message, timeout=10):
        timeout_time = time.time() + timeout
        while message.element_in_dom():
            if time.time() > timeout_time:
                raise TimeoutError(f"Notification was still in DOM after {timeout} seconds.")
            time.sleep(1)
        return message