from django.contrib import admin
from django.apps import apps

from partners.models import Organization, ChannelPartner, CloudSystemId, \
    CloudHost, ChannelPartnerService, SystemGroup

excluded = [Organization, ChannelPartner, CloudSystemId, CloudHost, ChannelPartnerService, SystemGroup]
app = apps.get_app_config('partners')

for model_name, model in app.models.items():
    if model not in excluded:
        admin.site.register(model)


class ChannelPartnerInline(admin.TabularInline):
    model = ChannelPartner
    extra = 0
    show_change_link = True
    fields = ('name',)

    def has_change_permission(self, request, obj=None):
        return False


class ChannelPartnerUserInline(admin.StackedInline):
    model = ChannelPartner.users.through
    extra = 0

    verbose_name = 'User'
    verbose_name_plural = 'Users'


class ChannelPartnerOrganizationInline(admin.TabularInline):
    model = Organization
    extra = 0
    show_change_link = True
    fields = ('name',)

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ChannelPartner)
class ChannelPartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'cloud_host', 'parent_channel_partner')
    readonly_fields = ('path',)
    inlines = [
        ChannelPartnerUserInline,
        ChannelPartnerOrganizationInline,
        ChannelPartnerInline
    ]
    exclude = ('users',)


@admin.register(ChannelPartnerService)
class ChannelPartnerServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'created_by_channel_partner')


class OrganizationUserInline(admin.StackedInline):
    list_display = ('name', 'channel_partner')
    model = Organization.users.through
    extra = 0

    verbose_name = 'User'
    verbose_name_plural = 'Users'


class CloudSystemInline(admin.TabularInline):
    model = CloudSystemId
    extra = 0
    show_change_link = True
    fields = ('name', 'system_id', 'cloud_host')

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel_partner')
    readonly_fields = ('path',)
    inlines = [
        OrganizationUserInline,
        CloudSystemInline
    ]
    exclude = ('users',)

@admin.register(SystemGroup)
class SystemGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization')
    inlines = [
        OrganizationUserInline,
    ]
    exclude = ('users',)



@admin.register(CloudSystemId)
class CloudSystemIdAdmin(admin.ModelAdmin):
    list_display = ('name', 'system_id', 'cloud_host')

    inlines = [
        # CloudServiceInline
    ]


@admin.register(CloudHost)
class CloudHostAdmin(admin.ModelAdmin):
    list_display = ('hostname', 'instance')
