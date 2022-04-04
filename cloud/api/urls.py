__author__ = 'noptix'

from django.conf.urls import url
from django.conf import settings

from api.views import two_fa, account, common, robot, storage, systems, transfer, utils
from notifications.views import send

urlpatterns = [
    url(r'^account-autocomplete/$', account.AccountAutocomplete.as_view(), name='account-autocomplete',),
    url(r'^permission-autocomplete/$', account.PermissionsAutocomplete.as_view(), name='permission-autocomplete',),
    url(r'^utils/visitedKey/?$',                utils.visited_key),
    url(r'^utils/language/?$',                  utils.language),
    url(r'^utils/downloads/history$',           utils.downloads_history),
    url(r'^utils/downloads/(?P<build>.*)$',    utils.download_build),
    url(r'^utils/downloads/?$',                 utils.downloads),
    url(r'^utils/settings/?$',                  utils.get_settings),
    url(r'^utils/cloudCapabilities/?$',         utils.cloud_capabilities),
    url(r'^ipvd$',                              utils.get_ipvd, name='get-ipvd'),


    url(r'^account/activate$',           account.activate),
    url(r'^account/login$',              account.login),
    url(r'^account/loginCode$',          account.login_with_code),
    url(r'^account/loginTokens$',        account.login_with_tokens),
    url(r'^account/logout$',             account.logout),
    url(r'^account/register$',           account.register),
    url(r'^account/restorePassword$',    account.restore_password),
    url(r'^account/changePassword$',     account.change_password),
    url(r'^account/authKey$',            account.auth_key),
    url(r'^account/check$',              account.check_account_in_portal),
    url(r'^account/checkCode$',          account.check_code_in_portal),
    url(r'^account/checkAuthCode$',      account.check_auth_code),
    url(r'^account/delete$',             account.delete_user),
    url(r'^account/renewSession$',       account.renew_session),
    url(r'^account/security$',           account.AccountSecurity.as_view()),
    url(r'^account/timeSincePassword$',  account.time_since_password),
    url(r'^account/reviewCookie$',       account.review_cookie),
    url(r'^account/verify$',             account.verify_password),
    url(r'^account/?$',                  account.index),

    url(r'^2fa/verification$', two_fa.TwoFactorVerification.as_view()),
    url(r'^2fa/backup$',       two_fa.BackupCode.as_view()),
    url(r'^2fa/backup/codes$', two_fa.get_active_backup_codes),
    url(r'^2fa/updateSession$', two_fa.add_2fa_to_session),

    url(r'^storage/create',     storage.create),
    url(r'^storage/delete',     storage.delete),
    url(r'^storage/move',       storage.move),
    url(r'^storage/usageStats', storage.usage_stats),

    url(r'^systems/disconnect$',                     systems.disconnect),
    url(r'^systems/connect$',                        systems.connect),
    url(r'^systems/merge$',                          systems.merge),
    url(r'^systems/toggle2fa$',                      systems.toggle2fa),
    url(r'^systems/revokeToken$',                    systems.revoke_token),
    url(r'^systems/(?P<system_id>.+?)/accessRoles$', systems.access_roles),
    url(r'^systems/(?P<system_id>.+?)/auth$',        systems.get_auth),
    url(r'^systems/(?P<system_id>.+?)/code$',        systems.get_code),
    url(r'^systems/(?P<system_id>.+?)/token$',       systems.get_token),
    url(r'^systems/(?P<system_id>.+?)/name$',        systems.rename),
    url(r'^systems/(?P<system_id>.+?)/users$',       systems.sharing),
    url(r'^systems/(?P<system_id>.+?)/proxy/(?P<system_url>.+?)$',         systems.proxy),
    url(r'^systems/(?P<system_id>.+?)/?$',           systems.system),
    url(r'^systems/?$',                              systems.list_systems),

    url('transfer/$',                                transfer.TransferSystemInfo.as_view()),
    url('transfer/(?P<system_id>.+?)/?$',            transfer.TransferSystemActions.as_view()),

    url(r'^ping$',                                   common.ping),
    url(r'^maintenance/health$',                     common.maintenance_health),

    url(r'feedback/?$',                              send.send_event),
]

if settings.DEBUG:
    urlpatterns += [
        url(r'^robot/get_code$', robot.get_code),
        url(r'^custom-properties/(?P<endpoint>.+?)/(?P<username>.+?)$', account.AccountCustomPropertyView.as_view()),
        url(r'^custom-properties/(?P<endpoint>.+?)$', account.AccountCustomPropertyView.as_view()),
    ]
