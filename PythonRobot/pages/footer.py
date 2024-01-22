from RobotVariables import RobotVariables
from generic_elements import Button


class Footer:

    def __init__(self, driver, lang="en_US"):
        self.driver = driver
        self.rb = RobotVariables(lang)

    def api_documentation_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.API_DOCUMENTATION_TEXT}')]")

    def api_download_sdk_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.DOWNLOAD_SDK_TEXT}')]")

    def support_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.SUPPORT}')]")

    def privacy_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.PRIVACY}')]")

    def copyright_link(self):
        return Button(
            self.driver,
            f"//nx-nav-footer//a[contains(text(),{self.rb.COPYRIGHT_SYMBOL!r})]"
            f"/span[contains(text(),{self.rb.COMPANY!r})]/parent::a",
            )

    def terms_link(self):
        return Button(self.driver, f"//nx-nav-footer//a[contains(text(),'{self.rb.TERMS}')]")

    def get_downloads_link(self):
        return self._get_visible_button(f"//nx-nav-footer//a[contains(text(),'{self.rb.DOWNLOADS_TEXT}')]")

    def _get_visible_button(self, locator):
        button = Button(self.driver, locator)
        button.wait_until_visible(10)
        return button

    def wait_until_footer_is_visible_webadmin(self):
        self.api_documentation_link().wait_until_visible()
        self.api_download_sdk_link().wait_until_visible()
        self.support_link().wait_until_visible()
        self.copyright_link().wait_until_visible()

    def wait_until_footer_is_visible_cloud(self):
        self.support_link().wait_until_visible()
        self.copyright_link().wait_until_visible()
        self.terms_link().wait_until_visible()
        self.privacy_link().wait_until_visible()
