__author__ = 'noptix'

from django.urls import re_path
from django.conf import settings

from api.views import two_fa, account, common, robot, storage, systems, transfer, utils
from notifications.views import send

urlpatterns = [
    re_path(r'^account-autocomplete/$', account.AccountAutocomplete.as_view(),
        name='account-autocomplete',),
    re_path(r'^permission-autocomplete/$', account.PermissionsAutocomplete.as_view(),
        name='permission-autocomplete',),
    re_path(r'^utils/visitedKey/?$',                utils.visited_key),
    re_path(r'^utils/language/?$',                  utils.language),
    re_path(r'^utils/languages/?$',                 utils.languages),
    re_path(r'^utils/downloads/history$',           utils.downloads_history),
    re_path(r'^utils/downloads/(?P<build>.*)$',     utils.download_build),
    re_path(r'^utils/downloads/?$',                 utils.downloads),
    re_path(r'^utils/settings/?$',                  utils.get_settings),
    re_path(r'^utils/cloudCapabilities/?$',         utils.cloud_capabilities),
    re_path(r'^ipvd$',                              utils.get_ipvd, name='get-ipvd'),
    re_path(r'^utils/customizations/?$',            utils.get_customizations),

    re_path(r'^account/activate$',           account.activate),
    re_path(r'^account/login$',              account.login),
    re_path(r'^account/loginCode$',          account.login_with_code),
    re_path(r'^account/loginTokens$',        account.login_with_tokens),
    re_path(r'^account/logout$',             account.logout),
    re_path(r'^account/register$',           account.register),
    re_path(r'^account/restorePassword$',    account.restore_password),
    re_path(r'^account/changePassword$',     account.change_password),
    re_path(r'^account/authKey$',            account.auth_key),
    re_path(r'^account/check$',              account.check_account_in_portal),
    re_path(r'^account/checkCode$',          account.check_code_in_portal),
    re_path(r'^account/checkAuthCode$',      account.check_auth_code),
    re_path(r'^account/delete$',             account.delete_user),
    re_path(r'^account/renewSession$',       account.renew_session),
    re_path(r'^account/security$',           account.AccountSecurity.as_view()),
    re_path(r'^account/timeSincePassword$',  account.time_since_password),
    re_path(r'^account/reviewCookie$',       account.review_cookie),
    re_path(r'^account/verify$',             account.verify_password),
    re_path(r'^account/?$',                  account.index),

    re_path(r'^2fa/verification$', two_fa.TwoFactorVerification.as_view()),
    re_path(r'^2fa/backup$',       two_fa.BackupCode.as_view()),
    re_path(r'^2fa/backup/codes$', two_fa.get_active_backup_codes),
    re_path(r'^2fa/updateSession$', two_fa.add_2fa_to_session),

    re_path(r'^storage/create',     storage.create),
    re_path(r'^storage/delete',     storage.delete),
    re_path(r'^storage/move',       storage.move),
    re_path(r'^storage/usageStats', storage.usage_stats),

    re_path(r'^systems/disconnect$',                     systems.disconnect),
    re_path(r'^systems/connect$',                        systems.connect),
    re_path(r'^systems/merge$',                          systems.merge),
    re_path(r'^systems/toggle2fa$',                      systems.toggle2fa),
    re_path(r'^systems/revokeToken$',                    systems.revoke_token),
    re_path(r'^systems/group-users$',                    systems.system_groups_users_management),
    re_path(r'^systems/(?P<system_id>.+?)/accessRoles$', systems.access_roles),
    re_path(r'^systems/(?P<system_id>.+?)/auth$',        systems.get_auth),
    re_path(r'^systems/(?P<system_id>.+?)/code$',        systems.get_code),
    re_path(r'^systems/(?P<system_id>.+?)/token$',       systems.get_token),
    re_path(r'^systems/(?P<system_id>.+?)/name$',        systems.rename),
    re_path(r'^systems/(?P<system_id>.+?)/users$',       systems.sharing),
    re_path(r'^systems/(?P<system_id>.+?)/proxy/(?P<system_url>.+?)$',         systems.proxy),
    re_path(r'^systems/(?P<system_id>.+?)/licenseServer$', systems.license_server),
    re_path(r'^systems/(?P<system_id>.+?)/?$',           systems.system),
    re_path(r'^systems/?$',                              systems.list_systems),

    re_path('transfer/$',                                transfer.TransferSystemInfo.as_view()),
    re_path('transfer/(?P<system_id>.+?)/?$',            transfer.TransferSystemActions.as_view()),

    re_path(r'^ping$',                                   common.ping),
    re_path(r'^maintenance/health$',                     common.maintenance_health),

    re_path(r'feedback/?$',                              send.send_event),
    re_path(r'^custom-properties/(?P<endpoint>.+?)/(?P<username>.+?)$',
        account.AccountCustomPropertyView.as_view()),
    re_path(r'^custom-properties/(?P<endpoint>.+?)$',
        account.AccountCustomPropertyView.as_view()),
    re_path(r'^robot/get_code$', robot.get_code)
]
