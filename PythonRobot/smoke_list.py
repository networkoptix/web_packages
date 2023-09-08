from test_cloud_merge import merge_from_primary_system

from test_system_users import owner_can_remove_user, \
    share_with_registered_user_works, \
    share_with_registered_user_sends_notification, \
    share_with_unregistered_user_sends_notification, \
    email_is_locked_when_unregistered_user_is_invited \

from test_account import test_changing_last_name_and_saving_maintains_that_setting, \
    test_changing_first_name_and_saving_maintains_that_setting, \
    test_can_access_account_page_from_dropdown

from test_restore_pass import sets_new_password_and_successfully_logs_in, \
    check_restore_password_email

from test_system_administration import owner_can_disconnect_system_from_cloud, \
    can_log_in_to_system_from_direct_link

from test_change_pass import password_is_actually_changed_and_login_works_with_new_password

from test_register import page_in_anonymous_state_register_header, \
    register_user_with_correct_credentials, \
    check_register_email

from test_footer import support_link, \
    copyright_link, \
    terms_link, \
    privacy_link

from test_activate import register_and_activate

from test_2fa import enable_and_login_with_2fa, \
    login_with_backup_code, \
    disabling_2fa, \
    system_2fa_required, \
    twofa_not_required_when_more_than_one_system

from test_login_dialog import allows_login_with_correct_credentials_and_log_out

# Todo:
# ipvd
# integrations

if __name__ == "__main__":
    merge_from_primary_system()

    owner_can_remove_user()
    share_with_registered_user_works()
    share_with_unregistered_user_sends_notification()
    share_with_registered_user_sends_notification()
    email_is_locked_when_unregistered_user_is_invited()

    owner_can_disconnect_system_from_cloud()
    can_log_in_to_system_from_direct_link()

    enable_and_login_with_2fa()
    login_with_backup_code()
    disabling_2fa()
    system_2fa_required()
    twofa_not_required_when_more_than_one_system()

    test_changing_first_name_and_saving_maintains_that_setting()
    test_changing_last_name_and_saving_maintains_that_setting()
    test_can_access_account_page_from_dropdown()

    sets_new_password_and_successfully_logs_in()
    check_restore_password_email()

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

