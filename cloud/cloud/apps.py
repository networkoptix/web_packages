from django.contrib.admin.apps import AdminConfig


class CmsAdminConfig(AdminConfig):
    default_site = 'cloud.admin.CMSAdminSite'
