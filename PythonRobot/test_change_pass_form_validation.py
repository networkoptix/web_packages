from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from RobotVariables import RobotVariables
from pages.change_pass_form import ChangePassForm
from pages.header import HeaderNav
from pages.login import LoginDialog
from resource_import import get_chrome
from NoptixLibrary.suite import Suite
from toast_notification import ToastNotification
from variables import ENV

rb = RobotVariables("en_US")


def test_invalid_old_passwords(email: str):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(email, rb.BASE_PASSWORD)
        CloudPortalAPI().set_user_theme(email, rb.BASE_PASSWORD, "light")
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.change_password_option().click()
        change_pass_form = ChangePassForm(driver)
        change_pass_form.verify_form_is_visible()
        change_pass_form.current_password_input().input_text(rb.SEVEN_CHAR_PASSWORD)
        change_pass_form.new_password_input().input_text(rb.BASE_PASSWORD)
        change_pass_form.save_button().click()
        message = ToastNotification(driver, f"{rb.CANNOT_SAVE_PASSWORD}: {rb.PASSWORD_INCORRECT}").get_message()
        message.wait_until_visible()
        message.wait_until_not_visible(10)
        change_pass_form.current_password_input().delete_all_text()
        change_pass_form.new_password_input().click()
        assert change_pass_form.current_password_input().get_outline_color() == rb.ERROR_COLOR
        print("pass")


def test_invalid_new_passwords(email: str):
    with get_chrome() as driver:
        driver.get(ENV)
        header = HeaderNav(driver)
        header.log_in_button().click()
        LoginDialog(driver).basic_cloud_login(email, rb.BASE_PASSWORD)
        CloudPortalAPI().set_user_theme(email, rb.BASE_PASSWORD, "light")
        header = HeaderNav(driver)
        header.account_dropdown().click()
        header.change_password_option().click()
        change_pass_form = ChangePassForm(driver)
        change_pass_form.verify_form_is_visible()
        change_pass_form.current_password_input().clear()
        change_pass_form.current_password_input().input_text(rb.BASE_PASSWORD)
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.SEVEN_CHAR_PASSWORD)
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_TOO_SHORT_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_TOO_SHORT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.CYRILLIC_TEXT)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.SMILEY_TEXT)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.GLYPH_TEXT)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.TM_TEXT)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(f" {rb.BASE_PASSWORD}")
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(f"{rb.BASE_PASSWORD} ")
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_SPECIAL_CHARS_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_INCORRECT_BADGE_TEXT
        change_pass_form.new_password_input().delete_all_text()
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWERCASE_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_WEAK_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.UPPERCASE_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_WEAK_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.NUMBERS_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_WEAK_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.SYMBOL_ONLY_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_input().get_outline_color() == rb.ERROR_COLOR
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_WEAK_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_UPPER_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_NUMBER_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.UPPER_NUMBER_PASSWORD)
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.UPPER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.NUMBER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge_tooltip().get_text() == rb.PASSWORD_IS_WEAK_TEXT
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_FAIR_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_UPPER_NUMBER_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_GOOD_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_UPPER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_GOOD_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.LOWER_NUMBER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        change_pass_form.new_password_badge().hover()
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_GOOD_BADGE_TEXT
        change_pass_form.new_password_input().clear()
        change_pass_form.new_password_input().input_text(rb.UPPER_NUMBER_SYMBOL_PASSWORD)
        change_pass_form.new_password_input().hover()
        change_pass_form.current_password_input().click()
        assert change_pass_form.new_password_badge().get_text() == rb.PASSWORD_IS_GOOD_BADGE_TEXT
        print("pass")


if __name__ == "__main__":
    with Suite() as suite:
        user1 = suite.create_cloud_account()
        test_invalid_old_passwords(user1.email)
        user2 = suite.create_cloud_account()
        test_invalid_new_passwords(user2.email)
