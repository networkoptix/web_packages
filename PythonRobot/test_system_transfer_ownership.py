from pathlib import Path
from time import sleep

from NoptixLibrary.cloud_portal_api import CloudPortalAPI
from NoptixLibrary.suite import CloudAccount
from NoptixLibrary.suite import Mediaserver
from NoptixLibrary.suite import Suite
from email_access import EmailClient
from pages.header import HeaderNav
from pages.login import LoginDialog
from pages.system_admin import FailedToAccessSystemPage
from pages.system_admin import SystemAdmin
from pages.system_left_menu import SystemLeftMenu
from pages.system_transfer import SystemOwnership
from pages.system_transfer import SystemTransferOwnershipModal
from pages.system_users import SystemUsers
from pages.systems_page import SystemsPage
from resource_import import get_chrome
from variables import ENV


def test_change_button_only_for_owner(server: Mediaserver):
    """C105083 smoke"""
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_admin = SystemOwnership(driver)
        system_admin.check_change_ownership_available()
        users = (
            server.get_cloud_admin(),
            server.get_cloud_advanced_viewer(),
            server.get_cloud_viewer(),
            server.get_cloud_live_viewer(),
            server.get_cloud_custom_user(),
            )
        navbar = HeaderNav(driver)
        for user in users:
            navbar.log_out()
            navbar.log_in_button().click()
            login_dialog.basic_cloud_login(user.email, user.password)
            _check_system_owner_is_user(system_admin, owner)
            system_admin.ensure_change_ownership_not_available()


def test_initiate_transfer_then_cancel(server: Mediaserver):
    """C105087 C105092 smoke"""
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        viewer = server.get_cloud_viewer()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership = SystemOwnership(driver)
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_ownership_modal.close()
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_ownership_modal.do_transfer(viewer.email)
        _check_transferring_system_to_user(system_ownership, viewer)
        system_ownership.cancel_ownership_transfer()
        _check_system_owner_is_you(system_ownership)
        system_ownership.check_change_ownership_available()
        navbar = HeaderNav(driver)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(viewer.email, viewer.password)
        _check_system_owner_is_user(system_ownership, owner)
        system_ownership.wait_until_accept_reject_transfer_not_visible()


def test_initiate_transfer_then_reject(server: Mediaserver):
    """C105091 smoke"""
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        viewer = server.get_cloud_viewer()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership = SystemOwnership(driver)
        transfer_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_modal.do_transfer(viewer.email)
        _check_transferring_system_to_user(system_ownership, viewer)
        navbar = HeaderNav(driver)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(viewer.email, viewer.password)
        _check_user_wants_to_transfer_to_you(system_ownership, owner)
        system_ownership.reject_ownership_transfer()
        driver.refresh()  # TODO: state should be updated without a refresh
        system_ownership = SystemOwnership(driver)
        _check_system_owner_is_user(system_ownership, owner)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership.ensure_cancel_ownership_transfer_not_available()
        _check_system_owner_is_you(system_ownership)
        system_ownership.check_change_ownership_available()


def test_initiate_transfer_then_accept(server: Mediaserver):
    """C105093 smoke"""
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        viewer = server.get_cloud_viewer()
        live_viewer = server.get_cloud_live_viewer()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership = SystemOwnership(driver)
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_ownership_modal.do_transfer(viewer.email)
        _check_transferring_system_to_user(system_ownership, viewer)
        navbar = HeaderNav(driver)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(viewer.email, viewer.password)
        _check_user_wants_to_transfer_to_you(system_ownership, owner)
        system_ownership.accept_ownership_transfer()
        driver.refresh()  # TODO: state should be updated without a refresh
        _check_system_owner_is_you(system_ownership)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(owner.email, owner.password)
        systems_page = SystemsPage(driver)
        systems_page.no_systems().wait_until_visible()
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(live_viewer.email, live_viewer.password)
        _check_system_owner_is_user(system_ownership, viewer)


def test_initiate_transfer_delete_user(server: Mediaserver):
    """C105095 smoke"""
    with get_chrome() as driver_admin, get_chrome() as driver_owner:
        owner = server.get_cloud_owner()
        admin = server.get_cloud_admin()
        driver_owner.get(f"{ENV}/systems/{server.id}")
        driver_admin.get(f"{ENV}/systems/{server.id}")
        login_dialog_owner = LoginDialog(driver_owner)
        login_dialog_owner.basic_cloud_login(owner.email, owner.password)
        login_dialog_admin = LoginDialog(driver_admin)
        login_dialog_admin.basic_cloud_login(admin.email, admin.password)
        system_ownership_owner = SystemOwnership(driver_owner)
        transfer_ownership_modal = system_ownership_owner.open_ownership_transfer_dialog()
        transfer_ownership_modal.do_transfer(admin.email)
        system_ownership_owner.check_cancel_ownership_transfer_available()
        driver_admin.refresh()
        system_ownership_admin = SystemOwnership(driver_admin)
        system_ownership_admin.wait_until_accept_reject_transfer_visible()
        left_menu_owner = SystemLeftMenu(driver_owner)
        left_menu_owner.users_button().click()
        left_menu_owner.get_user_with_email(admin.email).click()
        system_users_owner = SystemUsers(driver_owner)
        system_users_owner.remove_user_button().click()
        system_users_owner.remove_user_modal_button().click()
        driver_admin.refresh()
        failed_access_system_admin = FailedToAccessSystemPage(driver_admin)
        assert failed_access_system_admin.is_shown()


def test_transfer_ownership_for_offline_system(server: Mediaserver):
    """C105085 smoke"""
    # TODO: DOES NOT WORK on develop, recheck later, maybe after manual tests
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        viewer = server.get_cloud_viewer()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        # TODO: Yellow banner - 'System1 is offline' is displaying
        system_ownership = SystemOwnership(driver)
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_ownership_modal.do_transfer(viewer.email)
        _check_transferring_system_to_user(system_ownership, viewer)
        system_ownership.check_cancel_ownership_transfer_available()
        navbar = HeaderNav(driver)
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(viewer.email, viewer.password)
        _check_user_wants_to_transfer_to_you(system_ownership, owner)
        system_ownership.accept_ownership_transfer()
        navbar.log_out()
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(owner.email, owner.password)


def test_transfer_no_users(server: Mediaserver):
    """C105084 smoke"""
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        owner = server.get_cloud_owner()
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership = SystemOwnership(driver)
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        _check_no_users(transfer_ownership_modal)
        transfer_ownership_modal.click_add_user()
        left_menu = SystemLeftMenu(driver)
        left_menu.add_user_modal_close_button().click()


def test_initiate_transfer_then_accept_and_check_email(
        server: Mediaserver,
        viewer_user: CloudAccount,
        ):
    """C106290"""
    owner = server.get_cloud_owner()
    cloud_auth = (owner.email, owner.password)
    viewer_role_name = "viewer"
    CloudPortalAPI().share(
        cloud_auth,
        server.id,
        viewer_role_name,
        viewer_user.email,
        CloudAccount.PERMISSIONS[viewer_role_name],
        )
    with get_chrome() as driver:
        driver.get(f"{ENV}/systems/{server.id}")
        login_dialog = LoginDialog(driver)
        login_dialog.basic_cloud_login(owner.email, owner.password)
        system_ownership = SystemOwnership(driver)
        transfer_ownership_modal = system_ownership.open_ownership_transfer_dialog()
        transfer_ownership_modal.do_transfer(viewer_user.email)
        navbar = HeaderNav(driver)
        navbar.log_out()
        navbar = HeaderNav(driver)
        navbar.log_in_button().click()
        login_dialog.basic_cloud_login(viewer_user.email, viewer_user.password)
        _check_user_wants_to_transfer_to_you(system_ownership, owner)
        system_ownership.accept_ownership_transfer()
        SystemAdmin(driver)
        _check_system_owner_is_you(system_ownership)
        with EmailClient(email_alias=owner.email) as client:
            email_message = client.wait_for_email_subject(
                f"Ownership transfer for {server.name} - accepted")
            expected_message = (f"Mark Hamill ({viewer_user.email}) has accepted your request "
                                f"to transfer ownership of {server.name}.")
            actual_message = email_message.get_body()
            assert expected_message in actual_message
            expected_links = [
                "https://support.networkoptix.com",
                "https://networkoptix.com",
                ]
            email_message.find_links_in_body(expected_links)
            client.delete_email(email_message)
            print("PASS")


def _check_no_users(modal: SystemTransferOwnershipModal):
    no_users_text = modal.get_no_users_text()
    if no_users_text != (
            "There are no other users on the system besides you.\n"
            "Add them to system to be able to transfer rights"
            ):
        raise RuntimeError(f"Message does not match: {no_users_text!r}")


def _check_system_owner_is_user(system_ownership: SystemOwnership, user: CloudAccount):
    owner_text = system_ownership.get_system_owner_text()
    if owner_text != f"Owner \u2013 {user.first_name} {user.last_name} ({user.email})":
        raise RuntimeError(f"Expected {user.email} owner, got {owner_text!r}")


def _check_system_owner_is_you(system_ownership: SystemOwnership):
    owner_text = system_ownership.get_system_owner_text()
    if owner_text != "Owner \u2013 you(change)":
        raise RuntimeError(f"Unexpected system owner: {owner_text!r}")


def _check_user_wants_to_transfer_to_you(system_ownership: SystemOwnership, owner: CloudAccount):
    ownership_status = system_ownership.get_system_owner_wants_to_transfer_text()
    if ownership_status != (
            f"{owner.first_name} {owner.last_name} ({owner.email}) "
            "wants to transfer ownership of this system to you"
            ):
        raise RuntimeError(f"Unexpected ownership status: {ownership_status!r}")


def _check_transferring_system_to_user(system_ownership: SystemOwnership, user: CloudAccount):
    owner_text = system_ownership.get_system_owner_text()
    if owner_text != (
            f"Transferring ownership to \u2013 {user.first_name} {user.last_name} ({user.email})(cancel)"
            ):
        raise RuntimeError(f"Unexpected ownership status: {owner_text!r}")


if __name__ == "__main__":
    suite_name = Path(__file__).stem
    suite_name = suite_name.removeprefix("test_")
    with Suite() as suite:
        cloud_owner = suite.create_cloud_account(sendemail=True)
        cloud_users = suite.create_cloud_accounts()
        mediaserver_first = suite.create_cloud_server(cloud_owner, suite_name, cloud_users)
        test_change_button_only_for_owner(mediaserver_first)
        test_initiate_transfer_then_cancel(mediaserver_first)
        test_initiate_transfer_then_reject(mediaserver_first)
        test_initiate_transfer_then_accept(mediaserver_first)
        cloud_owner = suite.create_cloud_account()
        cloud_users = suite.create_cloud_accounts()
        mediaserver_second = suite.create_cloud_server(cloud_owner, f'{suite_name}_delete_user', cloud_users)
        test_initiate_transfer_delete_user(mediaserver_second)
        # cloud_owner = suite.create_cloud_account()
        # cloud_users = suite.create_cloud_users()
        # mediaserver_third = suite.create_cloud_server(cloud_owner, f'{suite_name}_offline_system', cloud_users)
        # mediaserver_third.stop()
        # test_transfer_ownership_for_offline_system(mediaserver_third)
        cloud_owner_single = suite.create_cloud_account()
        mediaserver_single_user = suite.create_cloud_server(cloud_owner_single, f'{suite_name}_single')
        # TODO: this case works very strange without this sleep
        sleep(90)
        test_transfer_no_users(mediaserver_single_user)
        user = suite.create_cloud_account(sendemail=True)
        test_initiate_transfer_then_accept_and_check_email(mediaserver_single_user, user)
