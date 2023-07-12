from django.contrib import admin
from django.contrib.admin import helpers, SimpleListFilter
from django.contrib.auth.decorators import user_passes_test
from django.contrib.sessions.models import Session
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.urls import path, re_path
from django_csv_exports.admin import CSVExportAdmin

from api.forms import *
from api.models import *
from cms.admin import CMSAdmin
from cms.models import *


@admin.register(Permission)
class PermissionAdmin(CMSAdmin):
    list_display = ['id', 'name', 'codename', 'asset_groups']
    search_fields = ['codename', 'name']

    def has_delete_permission(self, request, obj=None):
        return False

    def asset_groups(self, obj):
        return list(UserGroupsToAssetPermissions.objects
                    .filter(group__permissions__id__in=[obj.id])
                    .values_list('asset__name', 'group__name'))

    asset_groups.short_description = 'Asset - Groups'
    asset_groups.allow_tags = True


class CustomizationFilter(SimpleListFilter):
    title = 'Customization'
    parameter_name = 'customization'
    default_customization = None

    def lookups(self, request, model_admin):
        # Temporary customization 0 is need for 'All' since we need to keep it,
        # but choose the customization for the current cloud portal as the default value
        self.default_customization = Customization.objects.get(name=request.CUSTOMIZATION)
        customizations = [Customization(id=0, name="All")]
        customizations.extend(list(Customization.objects.filter(name__in=request.user.customizations)))
        return [(c.id, c.name) for c in customizations]

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == lookup if self.value() else lookup == self.default_customization.id,
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def queryset(self, request, queryset):
        customization_name = Customization.objects.filter(id=self.value()).first()
        if self.value() and customization_name:
            return queryset.filter(customization=customization_name.name)

        if self.value() is None:
            return queryset.filter(customization=self.default_customization.name)
        return queryset


class GroupFilter(SimpleListFilter):
    title = 'Group'
    parameter_name = 'group'

    def lookups(self, request, model_admin):
        groups = Group.objects.all()
        return [(g.id, g.name) for g in groups]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(groups=self.value())
        return queryset


@admin.register(Account)
class AccountAdmin(CMSAdmin, CSVExportAdmin):
    list_display = ['short_email', 'short_first_name', 'short_last_name', 'created_date', 'last_login',
                    'is_staff', 'language', 'customization']
    # forbid changing all fields which can be edited by user in cloud portal except sub
    readonly_fields = ('email', 'first_name', 'last_name', 'created_date', 'activated_date', 'last_login',
                       'customization')

    exclude = ("user_permissions",)

    list_filter = ['is_staff', 'created_date', 'last_login', CustomizationFilter]
    search_fields = ('email', 'first_name', 'last_name', 'customization', 'language', 'groups__name')

    csv_fields = ('email', 'first_name', 'last_name', 'created_date', 'last_login',
                  'is_staff', 'language', 'customization')

    change_list_template = "api/account_changelist.html"
    change_form_template = "api/account_change_form.html"
    form = AccountAdminForm

    def save_model(self, request, obj, form, change):
        # forbid creating superusers if their email isn't from the superuser domain

        # forbid creating superusers if they're not staff
        obj.is_superuser &= obj.is_staff and obj.email.endswith(settings.SUPERUSER_DOMAIN)

        obj.save()

    def get_queryset(self, request):  # show only users for current customization
        qs = super(AccountAdmin, self).get_queryset(request)  # Basic check from CMSAdmin
        if not request.user.is_superuser:  # only superuser can watch full accounts list
            show_customizations = request.user.customizations_with_permission(permission='api.change_account')
            qs = qs.filter(customization__in=show_customizations).distinct()
        return qs

    def get_list_filter(self, request):
        if UserGroupsToAssetPermissions.check_customization_permission(
                request.user, request.CUSTOMIZATION, 'api.change_proxygroup'
        ):
            return self.list_filter + [GroupFilter]
        return self.list_filter

    def get_list_display(self, request):
        if UserGroupsToAssetPermissions.check_customization_permission(
                request.user, request.CUSTOMIZATION, 'api.change_proxygroup'
        ):
            return self.list_display + ['user_groups']
        return self.list_display

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return self.readonly_fields
        return self.readonly_fields + ('language',)

    def has_add_permission(self, request):  # Only superuser can add users
        return False

    def has_change_permission(self, request, obj=None):
        return UserGroupsToAssetPermissions.\
            check_customization_change_account(request.user, customization=request.CUSTOMIZATION)

    def has_delete_permission(self, request, obj=None):  # No deleting users at all
        return False

    def has_view_permission(self, request, obj=None):
        return UserGroupsToAssetPermissions.\
            check_customization_change_account(request.user, customization=request.CUSTOMIZATION)

    def get_urls(self):
        urls = super(AccountAdmin, self).get_urls()
        my_urls = [
            re_path(r'^invite/$', self.admin_site.admin_view(self.invite), name='invite'),
            re_path(r'^clear_perms/$', self.admin_site.admin_view(self.clear_perm_cache), name='clear_perms'),
            path('force_logout/<slug:user_id>/', self.force_logout, name='force_logout')
        ]
        return my_urls + urls

    @staticmethod
    @user_passes_test(lambda user: user.is_superuser)
    def force_logout(request, user_id):
        session_count = 0
        for session in Session.objects.all():
            decoded_session = session.get_decoded()
            if decoded_session.get('_auth_user_id', None) == user_id:
                session.delete()
                session_count += 1
        messages.success(request, f'Deleted {session_count} sessions')
        return redirect('admin:api_account_change', user_id)

    def invite(self, request):
        group_id = request.GET.get('group_id')
        group = Group.objects.filter(id=group_id).first() if group_id and group_id.isnumeric() else None
        group_name = group.name if group else None
        context = {
            'title': 'Invite User' + (f' to Group "{group_name}"' if group_name else ""),
            'app_label': self.model._meta.app_label,
            'opts': self.model._meta,
            'has_change_permission': self.has_change_permission(request),
            'group': group
        }

        if request.method == 'POST':
            form = UserInviteFrom(request.POST, user=request.user, request=request)
            if form.is_valid():
                user_id = form.add_user(request, group=group)
                return redirect(reverse('admin:api_account_change', args=[user_id]))
        else:
            form = UserInviteFrom(user=request.user, request=request)
        context['form'] = form
        context['adminform'] = helpers.AdminForm(form, list([(None, {'fields': form.base_fields})]),
                                                 self.get_prepopulated_fields(request))
        return render(request, 'api/invite_form.html', context)

    def clear_perm_cache(self, request):
        perm_cache = caches['permissions']
        perm_cache.scan_unlink()
        return redirect('admin:api_account_changelist')

    @staticmethod
    def user_groups(obj):
        return [group.name for group in obj.groups.all()]


@admin.register(AccountLoginHistory)
class AccountLoginHistoryAdmin(CMSAdmin, CSVExportAdmin):
    list_display = ('action', 'email', 'ip', 'date')
    list_filter = ('action', 'date')
    search_fields = ('email', 'ip', 'date')

    csv_fields = ('action', 'email', 'ip', 'date')
    # actions = ['clean_old_records']

    def clean_old_records(self, request, queryset):
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS)
        AccountLoginHistory.objects.filter(date__lt=cutoff_date).delete()

    def get_readonly_fields(self, request, obj=None):
        return list(set(list(self.readonly_fields) +
                        [field.name for field in obj._meta.fields] +
                        [field.name for field in obj._meta.many_to_many]))

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    clean_old_records.short_description = f"Remove messages older than {settings.CLEAR_HISTORY_RECORDS_OLDER_THAN_X_DAYS} days"


admin.site.unregister(Group)


@admin.register(ProxyGroup)
class GroupAdmin(admin.ModelAdmin):
    # Use our custom form.
    form = GroupAdminForm
    # Filter permissions horizontal as well.
    filter_horizontal = ['permissions']
    list_display = ('name', 'list_permissions', 'assets', 'asset_types')
    search_fields = ('name', 'user__email', 'permissions__name')
    list_filter = ('usergroupstoassetpermissions__asset__asset_type', 'usergroupstoassetpermissions__asset__customizations')

    def list_permissions(self, obj):
        return [permission.name for permission in obj.permissions.all()]

    list_permissions.short_description = 'Group of permissions'

    def assets(self, obj):
        return [relation.asset.name for relation in obj.usergroupstoassetpermissions_set.all() if relation.asset]

    def asset_types(self, obj):
        return [relation.asset_type.name or AssetType.ASSET_TYPES[relation.asset_type.type] for relation in obj.usergroupstoassettype_set.all()]
