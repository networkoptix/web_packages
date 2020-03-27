__author__ = 'noptix'

from django.conf.urls import url
from cloud import settings
from api.views import account, systems, common, utils, robot, storage
from notifications.views import send

urlpatterns = [
    url(r'^account-autocomplete/$', account.AccountAutocomplete.as_view(), name='account-autocomplete',),
    url(r'^utils/visitedKey/?$',                utils.visited_key),
    url(r'^utils/language/?$',                  utils.language),
    url(r'^utils/downloads/history$',           utils.downloads_history),
    url(r'^utils/downloads/(?P<build>.+?)$',    utils.download_build),
    url(r'^utils/downloads/?$',                 utils.downloads),
    url(r'^utils/settings/?$',                  utils.get_settings),
    url(r'^utils/cloudCapabilities/?$',         utils.cloud_capabilities),
    url(r'^ipvd$',                              utils.get_ipvd),


    url(r'^account/activate$',           account.activate),
    url(r'^account/login$',              account.login),
    url(r'^account/logout$',             account.logout),
    url(r'^account/register$',           account.register),
    url(r'^account/restorePassword$',    account.restore_password),
    url(r'^account/changePassword$',     account.change_password),
    url(r'^account/authKey$',            account.auth_key),
    url(r'^account/checkCode$',          account.check_code_in_portal),
    url(r'^account/checkAuthCode$',      account.check_auth_code),
    url(r'^account/delete$',             account.delete_user),
    url(r'^account/?$',                  account.index),

    url(r'^storage/create',     storage.enable),
    url(r'^storage/delete',     storage.delete),
    url(r'^storage/move',       storage.move),
    url(r'^storage/usageStats', storage.usage_stats),

    url(r'^systems/disconnect$',                     systems.disconnect),
    url(r'^systems/connect$',                        systems.connect),
    url(r'^systems/merge$',                          systems.merge),
    url(r'^systems/(?P<system_id>.+?)/accessRoles$', systems.access_roles),
    url(r'^systems/(?P<system_id>.+?)/auth$',        systems.get_auth),
    url(r'^systems/(?P<system_id>.+?)/name$',        systems.rename),
    url(r'^systems/(?P<system_id>.+?)/users$',       systems.sharing),
    url(r'^systems/(?P<system_id>.+?)/proxy/(?P<system_url>.+?)$',         systems.proxy),
    url(r'^systems/(?P<system_id>.+?)/?$',           systems.system),
    url(r'^systems/?$',                              systems.list_systems),

    url(r'^ping$',                                   common.ping),
    url(r'^maintenance/health$',                     common.maintenance_health),

    url(r'feedback/?$',                              send.send_event),
]

if settings.DEBUG:
    urlpatterns += [
        url(r'^robot/get_code$', robot.get_code)
    ]
