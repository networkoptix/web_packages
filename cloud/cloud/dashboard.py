"""
This file was generated with the customdashboard management command, it
contains the two classes for the main dashboard and app index dashboard.
You can customize these classes as you want.

To activate your index dashboard add the following to your settings.py::
    ADMIN_TOOLS_INDEX_DASHBOARD = 'cloud.dashboard.CustomIndexDashboard'

And to activate the app index dashboard::
    ADMIN_TOOLS_APP_INDEX_DASHBOARD = 'cloud.dashboard.CustomAppIndexDashboard'
"""

from django.utils.translation import gettext_lazy as _
try:
    from django.urls import reverse
except ImportError:
    from django.core.urlresolvers import reverse

from admin_tools.dashboard import modules, Dashboard
from admin_tools.utils import get_admin_site_name

from django.conf import settings


class DashboardAppList(modules.AppList):
    def init_with_context(self, context):
        super().init_with_context(context)
        for child in self.children:
            # sort ignoring case
            child['models'].sort(key=lambda x: x['title'].lower())


class CustomIndexDashboard(Dashboard):
    """
    Custom index dashboard for cloud.
    """
    def init_with_context(self, context):
        user = context['user']
        site_name = get_admin_site_name(context)
        # append an app list module for "Applications"
        self.children.append(DashboardAppList(
            _('Applications'),
            models=settings.ADMIN_DASHBOARD,
            deletable=False,
            collapsible=False,
        ))

        # append an app list module for "Administration"
        self.children.append(DashboardAppList(
            _('Internal'),
            exclude=settings.ADMIN_DASHBOARD,
            deletable=False,
            collapsible=False,
        ))
        if user.is_superuser:
            # append a recent actions module
            self.children.append(DashboardAppList(
                _('Recent Actions'),
                5,
                deletable=False,
                collapsible=False,
            ))

