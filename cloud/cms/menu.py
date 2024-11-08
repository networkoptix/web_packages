"""
This file was generated with the custommenu management command, it contains
the classes for the admin menu, you can customize this class as you want.

To activate your custom menu add the following to your settings.py::
    ADMIN_TOOLS_MENU = 'cms.menu.CustomMenu'
"""

try:
    from django.urls import reverse
except ImportError:
    from django.core.urlresolvers import reverse
from django.utils.translation import gettext_lazy as _

from django.conf import settings

from admin_tools.menu import items, Menu


class CustomMenu(Menu):
    """
    Custom Menu for cms admin site.
    """
    def __init__(self, **kwargs):
        Menu.__init__(self, **kwargs)
        debug_only_items = [
            items.MenuItem('QA Settings', reverse('qa_settings'))
        ] if settings.DEBUG else []
        self.children += [
            items.MenuItem(_('Dashboard'), reverse('admin:index')),
            items.Bookmarks(),
            items.AppList(
                _('Applications'),
                models=settings.ADMIN_DASHBOARD
            ),
            items.AppList(
                _('Internal'),
                exclude=settings.ADMIN_DASHBOARD,
                children=[] + debug_only_items
            ),
            items.MenuItem('Help', '/static/help/cms/index.hml'),
        ]

    def init_with_context(self, context):
        """
        Use this method if you need to access the request context.
        """
        return super(CustomMenu, self).init_with_context(context)
