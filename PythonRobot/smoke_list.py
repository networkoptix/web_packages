import time

from NoptixLibrary.suite import Suite
from NoptixLibrary.suite import CloudAccount
from email_access import get_random_email
from test_2fa import disabling_2fa
from test_2fa import enable_and_login_with_2fa
from test_2fa import login_with_backup_code
from test_2fa import system_2fa_required
from test_2fa import twofa_not_required_when_more_than_one_system
from test_account import test_can_access_account_page_from_dropdown
from test_account import test_changing_first_name_and_saving_maintains_that_setting
from test_account import test_changing_last_name_and_saving_maintains_that_setting
from test_activate import register_and_activate
from test_change_pass import password_is_actually_changed_and_login_works_with_new_password
from test_cloud_merge import merge_from_primary_system
from test_footer import copyright_link
from test_footer import privacy_link
from test_footer import support_link
from test_footer import terms_link
from test_login_dialog import allows_login_with_correct_credentials_and_log_out
from test_register import check_register_email
from test_register import page_in_anonymous_state_register_header
from test_register import register_user_with_correct_credentials
from test_restore_pass import check_restore_password_email
from test_restore_pass import sets_new_password_and_successfully_logs_in
from test_system_administration import can_log_in_to_system_from_direct_link
from test_system_administration import owner_can_disconnect_system_from_cloud
from test_system_users import email_is_locked_when_unregistered_user_is_invited
from test_system_users import owner_can_remove_user
from test_system_users import share_with_registered_user_sends_notification
from test_system_users import share_with_registered_user_works
from test_system_users import share_with_unregistered_user_sends_notification

# Todo:
# ipvd
# integrations

if __name__ == "__main__":
    with Suite() as suite:
        cloud_users = suite.create_cloud_accounts()

        cloud_owner = suite.create_cloud_account()
        cloud_server = suite.create_cloud_server(cloud_owner, None, cloud_users)
        cloud_owner_second = suite.create_cloud_account()
        cloud_server_second = suite.create_cloud_server(cloud_owner_second)
        cloud_owner_third = suite.create_cloud_account()
        cloud_server_third = suite.create_cloud_server(cloud_owner_third)
        cloud_owner_fourth = suite.create_cloud_account()
        cloud_server_fourth = suite.create_cloud_server(cloud_owner_fourth)
        cloud_owner_fifth = suite.create_cloud_account()
        cloud_server_fifth = suite.create_cloud_server(cloud_owner_fourth)
        cloud_owner_six = suite.create_cloud_account()
        cloud_server_six = suite.create_cloud_server(cloud_owner_six)

        cloud_server_seven = suite.create_cloud_server(cloud_owner_six)

        merge_from_primary_system(cloud_server_seven, cloud_server_six)

        owner_can_remove_user(cloud_server)
        share_with_registered_user_works(cloud_server)
        share_with_unregistered_user_sends_notification(cloud_server)
        share_with_registered_user_sends_notification(cloud_server)
        email_is_locked_when_unregistered_user_is_invited(cloud_server)

        owner_can_disconnect_system_from_cloud(cloud_server_second)
        can_log_in_to_system_from_direct_link(cloud_server)

        enable_and_login_with_2fa(cloud_server_third)
        login_with_backup_code(cloud_server_third)
        disabling_2fa(cloud_server_third)
        system_2fa_required(cloud_server_third)
        twofa_not_required_when_more_than_one_system(cloud_server_fourth)

        test_changing_first_name_and_saving_maintains_that_setting()
        test_changing_last_name_and_saving_maintains_that_setting()
        test_can_access_account_page_from_dropdown()
        with CloudAccount(get_random_email(sendemail=True)) as user:
            user.activate()
            sets_new_password_and_successfully_logs_in(user)
            check_restore_password_email(user)

        password_is_actually_changed_and_login_works_with_new_password()

        support_link()
        copyright_link()
        privacy_link()
        terms_link()

        register_and_activate()

        allows_login_with_correct_credentials_and_log_out()

        page_in_anonymous_state_register_header()
        register_user_with_correct_credentials()
        check_register_email()
