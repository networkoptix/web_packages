import time

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

from RobotVariables import RobotVariables
from generic_elements import ElementNotInDOM
from generic_elements import ElementNotVisible
from generic_elements import Button
from generic_elements import Link
from generic_elements import PageText
from generic_elements import Pane
from generic_elements import TabItem
from generic_elements import TextField


class TabSettings:

    def __init__(self, driver: WebDriver, locator: str, robot_variables: RobotVariables):
        self._driver = driver
        self._element = TabItem(driver, locator)
        self._rb = robot_variables

    def click(self):
        self._element.click()
        # The page always renders in online status and then changes to offline if needed.
        # Without a sleep, the following code does not have time to detect the offline status.
        time.sleep(2)
        self._wait_until_ready()

    def _wait_until_ready(self):
        Pane(self._driver, "//nx-system-settings-component").wait_until_visible()
        Pane(self._driver, "//div[contains(@class, 'fixed-sidebar')]//a[@id='servers']").wait_until_visible()
        TextField(self._driver, "//div/nx-editable-heading//nx-text-editable").wait_until_visible()

    def get_servers_section(self) -> '_ServersSection':
        return _ServersSection(self._driver, '//nx-menu//nx-level-1-item/a[@id="servers"]', 'Servers', self._rb)


class _ServersSection:

    def __init__(self, driver: WebDriver, locator: str, name: str, robot_variables: RobotVariables):
        self._driver = driver
        self._element = TabItem(driver, locator)
        self._name = name
        self._rb = robot_variables

    def click(self):
        self._element.click()
        started_at = time.monotonic()
        timeout_sec = 30
        while True:
            if self._is_active():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise TimeoutError(f"{self._name} section is not visible after {timeout_sec} seconds")
            time.sleep(0.5)

    def get_server_page(self, name: str) -> '_ServerPage':
        locator = f'//nx-level-3-item//nx-search-highlight[contains(text(),"{name}")]'
        return _ServerPage(self._driver, locator, self._rb)

    def get_default_server_page(self) -> '_ServerPage':
        locator = '//nx-level-3-item//nx-search-highlight'
        Link(self._driver, locator).wait_until_visible()
        return _ServerPage(self._driver, locator, self._rb)

    def _is_active(self) -> bool:
        try:
            self.get_default_server_page()
        except (ElementNotVisible, ElementNotInDOM):
            return False
        else:
            return True


class _ServerPage:

    def __init__(self, driver: WebDriver, locator: str, robot_variables: RobotVariables):
        self._element = Link(driver, locator)
        self._element.wait_until_visible(30)
        self._driver = driver
        self._rb = robot_variables

    def click(self):
        self._element.click()

    def wait_until_visible_common_elements(self):
        Button(self._driver, f'//nx-section//button/span[contains(text(),"{self._rb.RESTART}")]/..').wait_until_visible()
        Button(
            self._driver,
            ('//div[contains(@class, "server-info")]//header//button/'
             f'span[contains(text(),"{self._rb.DETAILED_INFO_TEXT}")]/..'),
            ).wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.IP_TEXT}")]').wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.OS_TEXT}")]').wait_until_visible()
        PageText(self._driver, f'//header//p[contains(text(),"{self._rb.VERSION_TEXT}")]').wait_until_visible()

    def wait_until_visible_owner_elements(self):
        TextField(self._driver, '//nx-standard-server-component//input[@id="server-port-numeric"]').wait_until_visible()

    def set_server_name(self, name: str):
        element_name = TextField(self._driver, f'//nx-block//nx-editable-heading//nx-text-editable')
        element_name.click()
        element_name.input_text(name + Keys.ENTER)
        button_save = Button(self._driver, f'//nx-process-button//button[contains(text(), "{self._rb.SAVE_BUTTON_TEXT}")]')
        button_save.click()

    def open_restart_dialog(self) -> '_RestartDialog':
        restart_button = Button(self._driver, f'//nx-section//button/span[contains(text(), "{self._rb.RESTART}")]')
        restart_button.click()
        return _RestartDialog(self._driver, self._rb)

    def wait_until_restarting_banner(self):
        PageText(self._driver, f"//nx-alert-block//span[contains(text(),{self._rb.RESTARTING})]")

    def wait_until_restarting_alert_visible(self):
        locator = ('//div[contains(@class,"toast")]//span[contains(@class,"toast-content")]'
                   f'/../span[contains(text(),"{self._rb.SERVER_RESTARTED_TEXT}")]')
        PageText(self._driver, locator).wait_until_visible(timeout=30)
        PageText(self._driver, locator).wait_until_does_not_exist()

    def get_port_field(self) -> TextField:
        return TextField(self._driver, f'//nx-numeric[@name="server-port"]/input[@id="server-port-numeric"]')


class _RestartDialog:

    def __init__(self, driver: WebDriver, robot_variables: RobotVariables):
        self._driver = driver
        self._rb = robot_variables

    def wait_until_visible(self):
        button = self.get_button_close()
        button.wait_until_visible()
        button = self.get_button_cancel()
        button.wait_until_visible()
        button = self.get_button_restart()
        button.wait_until_visible()

    def wait_until_not_visible(self):
        button = self.get_button_close()
        button.wait_until_not_visible()
        button = self.get_button_cancel()
        button.wait_until_not_visible()
        button = self.get_button_restart()
        button.wait_until_not_visible()

    def get_button_close(self) -> Button:
        return Button(self._driver, '//nx-modal-restart-server-content//button[contains(@class,"close")]')

    def get_button_cancel(self) -> Button:
        return Button(
            self._driver,
            f'//nx-modal-restart-server-content//button[contains(text(),"{self._rb.CANCEL_BUTTON_TEXT}")]',
            )

    def get_button_restart(self) -> Button:
        return Button(self._driver, '//nx-modal-restart-server-content//button[@type="submit"]')
