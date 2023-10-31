import time

from RobotVariables import RobotVariables
from generic_elements import Button


class Footer:
    def __init__(self, driver, type, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)
        if type == "cloud":
            self._wait_until_footer_is_visible_cloud()
        else:
            self._wait_until_footer_is_visible_webadmin()

    def api_documentation_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.API_DOCUMENTATION_TEXT}')]")

    def api_download_sdk_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.DOWNLOAD_SDK_TEXT}')]")

    def support_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.SUPPORT}')]")

    def privacy_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.PRIVACY}')]")

    def copyright_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.COPYRIGHT_SYMBOL}')]/span[contains(text(),'{self.rb.COMPANY}')]/parent::a")

    def integrations_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.INTEGRATIONS_TITLE_TEXT}')]")

    def known_limits_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.KNOWN_LIMITATIONS}')]")

    def about_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.ABOUT}')]")

    def supported_devices_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.SUPPORTED_DEVICES}')]")

    def terms_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.TERMS}')]")

    def get_downloads_link(self):
        return self._get_visible_button(f"//nx-nav-footer//a[contains(text(),'{self.rb.DOWNLOADS_TEXT}')]")

    def _get_visible_button(self, locator):
        started_at = time.monotonic()
        timeout_sec = 10
        while True:
            button = Button(self.driver, locator)
            if button.is_visible():
                break
            if time.monotonic() - started_at > timeout_sec:
                raise RuntimeError(f"{locator!r} is not visible after {timeout_sec} seconds")
            time.sleep(0.5)
        return button

    def _wait_until_footer_is_visible_webadmin(self):
        self.api_documentation_link().wait_until_visible()
        self.api_download_sdk_link().wait_until_visible()
        self.support_link().wait_until_visible()
        self.copyright_link().wait_until_visible()

    def _wait_until_footer_is_visible_cloud(self):
        self.support_link().wait_until_visible()
        self.copyright_link().wait_until_visible()
        self.terms_link().wait_until_visible()
        self.privacy_link().wait_until_visible()
