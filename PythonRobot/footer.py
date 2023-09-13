from RobotVariables import RobotVariables
from button import Button


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


    def _wait_until_footer_is_visible_webadmin(self):
        self.api_documentation_link()
        self.api_download_sdk_link()
        self.support_link()       
        self.copyright_link()

    def _wait_until_footer_is_visible_cloud(self):
        self.support_link()
        self.copyright_link()
        self.terms_link()
        self.privacy_link()