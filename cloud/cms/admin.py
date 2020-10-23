from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter, AdminSite
from django.contrib.admin.views.main import SEARCH_VAR
from django.conf.urls import url
from django.core.exceptions import PermissionDenied
from django.db.models import Q, Case, When, Value, BooleanField
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.html import format_html

from cms.forms import *
from cms.controllers.modify_db import get_records_for_version
from cms.views.asset import page_editor, review

admin.site.disable_action('delete_selected')  # Remove delete action from all models in admin


def clone_asset(request, asset_id):
    asset = Asset.objects.get(id=asset_id)
    clone_name = asset.name + ' - copy'
    created_by = request.user
    customizations = asset.customizations.all()

    if Asset.objects.filter(name=clone_name).first():
        messages.error(request, "Copy already exists")
        return None

    if asset.asset_type.type == AssetType.ASSET_TYPES.cloud_portal:
        messages.error(request, "Cannot clone cloud portal assets")
        return None

    asset.pk = asset.id = None
    asset.name = clone_name
    asset.created_by = created_by
    asset.primary_group = None
    asset.save()

    old_asset = Asset.objects.get(id=asset_id)
    asset.customizations.set(customizations)

    data_structures = DataStructure.objects.filter(context__asset_type=asset.asset_type)
    for ds in data_structures:
        datarecord = old_asset.datarecord_set.filter(data_structure=ds).last()
        if datarecord:
            datarecord.pk = datarecord.id = None
            datarecord.asset = asset
            datarecord.version = None
            datarecord.save()

    if '_clone_copy_perms' in request.POST or not request.user.is_superuser:
        grouptoassets = UserGroupsToAssetPermissions.objects.filter(asset=old_asset)
        for relation in grouptoassets:
            if relation.group != old_asset.primary_group:
                UserGroupsToAssetPermissions.objects.create(group=relation.group, asset=asset)

    return asset.id


class AssetTypeFilter(SimpleListFilter):
    title = 'Asset Type'
    parameter_name = 'asset_type'

    def lookups(self, request, model_admin):
        qs = AssetType.objects.all()
        return [('all', 'All')] + [(asset_type.id, str(asset_type)) for asset_type in qs]

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == str(lookup) if self.value() else lookup == 'all',
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def queryset(self, request, queryset):
        val = self.value()
        if val and val != 'all':
            return queryset.filter(asset_type__id=self.value())
        return queryset


class ContextFilter(SimpleListFilter):
    title = 'Show Hidden Pages'
    parameter_name = 'hidden'
    default_state = 'false'

    def lookups(self, request, model_admin):
        return (
            ('true', 'Yes'),
            ('false', 'No')
        )

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == lookup if self.value() else lookup == self.default_state,
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def queryset(self, request, queryset):
        return queryset


class CustomizationFilter(SimpleListFilter):
    title = 'Customization'
    parameter_name = 'customization'
    default_customization = None
    ALL_CUSTOMIZATIONS = '0'
    OTHER_CUSTOMIZATIONS = '1000'

    def __init__(self, request, params, model, model_admin):
        super().__init__(request, params, model, model_admin)
        self.request = request
        self.model_admin = model_admin

    def value(self):
        value = self.used_parameters.get(self.parameter_name)
        if not value and isinstance(self.model_admin, AssetCustomizationReviewAdmin) and \
                self.request.user.is_portal_manager:
            value = self.ALL_CUSTOMIZATIONS
        return value

    def lookups(self, request, model_admin):
        # Temporary customization 0 is need for 'All' since we need to keep it,
        # but choose the customization for the current cloud portal as the default value
        self.default_customization = Customization.objects.get(name=settings.CUSTOMIZATION).id
        customizations = [Customization(id=self.ALL_CUSTOMIZATIONS, name='All Customizations')]
        customizations.extend(list(Customization.objects.filter(name__in=request.user.customizations)))
        customizations.extend([Customization(id=self.OTHER_CUSTOMIZATIONS, name='Other Customizations')])
        return [(c.id, c.name) for c in customizations]

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            lookup = str(lookup)
            yield {
                'selected': self.value() == lookup if self.value() else lookup == str(self.default_customization),
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def queryset(self, request, queryset):
        field_names = [f.name for f in queryset.model._meta.get_fields()]
        if 'customizations' in field_names:
            field_name = 'customizations'
        else:
            field_name = 'customization'

        if self.value():
            if self.value() == self.OTHER_CUSTOMIZATIONS:
                return queryset.exclude(**{field_name + '__name__in': request.user.customizations})
            elif self.value() != self.ALL_CUSTOMIZATIONS:
                return queryset.filter(**{field_name + '__id': self.value()})
        else:
            return queryset.filter(**{field_name + '__id': self.default_customization})
        return queryset


class ReviewStateFilter(SimpleListFilter):
    title = 'State'
    parameter_name = 'state'
    ALL_STATES = 'all'

    def __init__(self, request, params, model, model_admin):
        super().__init__(request, params, model, model_admin)
        self.request = request
        self.model_admin = model_admin

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == lookup,
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def lookups(self, request, model_admin):
        states = [(self.ALL_STATES, 'All')]
        states.extend(
            [(str(i), AssetCustomizationReview.REVIEW_STATES[i])
             for i in range(len(AssetCustomizationReview.REVIEW_STATES))]
        )
        return states

    def queryset(self, request, queryset):
        if self.value() is None or self.value() == self.ALL_STATES:
            return queryset
        else:
            return queryset.filter(state__exact=self.value())

    def value(self):
        value = self.used_parameters.get(self.parameter_name)
        if value is None:
            if isinstance(self.model_admin, AssetCustomizationReviewAdmin) and \
                    (self.request.user.is_superuser or self.request.user.is_portal_manager):
                value = str(AssetCustomizationReview.REVIEW_STATES.pending)
            else:
                value = self.ALL_STATES
        return value


class ReviewVersionFilter(SimpleListFilter):
    title = 'Version'
    parameter_name = 'version'
    ALL_VERSIONS = 'all'
    LATEST_VERSION = 'latest'

    def __init__(self, request, params, model, model_admin):
        super().__init__(request, params, model, model_admin)
        self.request = request
        self.model_admin = model_admin

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == lookup,
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def lookups(self, request, model_admin):
        versions = [(self.ALL_VERSIONS, 'All'), (self.LATEST_VERSION, 'Latest')]
        return versions

    def queryset(self, request, queryset):
        if self.value() == self.LATEST_VERSION:
            asset_ids = set(queryset.values_list('version__asset', flat=True))
            review_ids = []
            for review in AssetCustomizationReview.objects.all().order_by('-pk').select_related('version__asset'):
                if review.version.asset.id in asset_ids:
                    review_ids.append(review.id)
                    asset_ids.remove(review.version.asset.id)
            return queryset.filter(id__in=review_ids)
        return queryset

    def value(self):
        value = self.used_parameters.get(self.parameter_name)
        if value is None:
            if isinstance(self.model_admin, AssetCustomizationReviewAdmin) and self.request.user.is_developer:
                value = self.LATEST_VERSION
            else:
                value = self.ALL_VERSIONS
        return value


class AssetFilter(SimpleListFilter):
    title = 'Asset'
    parameter_name = 'asset'

    # TODO: show available assets base on role/whats available
    def lookups(self, request, model_admin):
        assets = Asset.objects.all()
        if not request.user.is_superuser:
            assets = assets.filter(customizations__name__in=request.user.customizations).distinct()
        # TODO: Get list of available assets for non context managers
        if not UserGroupsToAssetPermissions.\
                check_customization_permission(request.user, settings.CUSTOMIZATION, 'cms.publish_version'):
            editable_assets = request.user.assets_with_permission('cms.edit_content')
            assets = Asset.objects.filter(Q(id__in=editable_assets))

        return [(p.id, p.__str__()) for p in assets]

    def queryset(self, request, queryset):
        if self.value():
            if isinstance(queryset.first(), AssetCustomizationReview):
                return queryset.filter(version__asset__id=self.value())
            elif isinstance(queryset.first(), ContentVersion):
                return queryset.filter(asset__id=self.value())
        return queryset


class CMSAdmin(admin.ModelAdmin):
    # this class protects us from user error:
    # 1. only superuser can edit specific data in CMS (get_readonly_fields, has_add_permission, has_delete_permission)
    # 2. customization admins cannot see anything in another customizations (get_queryset)
    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return list(self.readonly_fields)
        return list(set(list(self.readonly_fields) +
                        [field.name for field in obj._meta.fields] +
                        [field.name for field in obj._meta.many_to_many]))

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


class AssetTypeAdmin(CMSAdmin):
    list_display = ('name', 'type', 'can_preview', 'single_customization',)
    list_display_links = ('name', 'type')


admin.site.register(AssetType, AssetTypeAdmin)


class AssetAdmin(CMSAdmin):
    list_display = ('asset_settings', 'edit_asset_button', 'name', 'asset_type', 'customizations_list', 'last_modified', )
    list_display_links = ('name',)
    list_filter = (AssetTypeFilter, CustomizationFilter,)
    search_fields = ('name', 'created_by__email',)
    form = AssetForm
    change_form_template = 'cms/asset_change_form.html'
    change_list_template = 'cms/asset_list_view.html'

    def get_form(self, request, obj=None, change=False, **kwargs):
        AssetForm = super().get_form(request, obj, change, **kwargs)

        class AssetFormWithUser(AssetForm):
            def __new__(cls, *args, **kwargs):
                kwargs['user'] = request.user
                return AssetForm(*args, **kwargs)

        return AssetFormWithUser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser or len(request.user.assets) > 0

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser or len(request.user.assets) > 0

    def has_add_permission(self, request):
        return super(CMSAdmin, self).has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.protected:
            return False
        elif request.user.is_superuser:
            return True
        return False

    def changelist_view(self, request, extra_context=None):
        filters_dict = caches['filters'].get(request.user.id) or {}
        cached_path = filters_dict.get(request.path_info, None)
        if not request.META['QUERY_STRING'] and cached_path:
            return redirect(f'{request.path_info}?{cached_path}')
        else:
            # If an exception is raised, clear the saved filter
            try:
                # Extra context for search form
                if not extra_context:
                    extra_context = {}
                extra_context['search_var'] = SEARCH_VAR
                response = super(AssetAdmin, self).changelist_view(request, extra_context)
                filters_dict[request.path_info] = request.META['QUERY_STRING']
                caches['filters'].set(request.user.id, filters_dict)
                return response
            except Exception as exception:
                filters_dict.pop(request.path_info, None)
                caches['filters'].set(request.user.id, filters_dict)
                raise exception

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['current_versions'] = []
        approved = AssetCustomizationReview.REVIEW_STATES.accepted
        asset = Asset.objects.get(id=object_id)
        asset_customizations = AssetCustomizationReview.objects.filter(version__asset=asset)

        for customization in asset.customizations.filter(name__in=request.user.customizations):
            approved_version = asset_customizations.filter(customization=customization, state=approved).last()
            if approved_version:
                extra_context['current_versions'].append(approved_version)
            else:
                extra_context['current_versions'].append({'customization': customization.name,
                                                          'id': "Not published"})

        extra_context['related_groups'] = Group.objects.filter(
            usergroupstoassetpermissions__asset=asset
        ).prefetch_related('permissions')

        if asset.asset_type.type != AssetType.ASSET_TYPES.cloud_portal:
            extra_context['show_clone_asset'] = True

        return super(AssetAdmin, self).change_view(
            request, object_id, form_url, extra_context=extra_context,
        )

    def get_fields(self, request, obj=None):
        fields = [field for field in self.form.base_fields]
        if not request.user.is_superuser:
            fields.remove('protected')
        if obj:
            fields.remove('publish_all_customizations')
            if not request.user.is_superuser and not obj.asset_type.single_customization:
                fields.remove('customizations')
        else:
            fields.remove('preview_status')
            fields.append(fields.pop(fields.index('customizations')))
        return fields

    def get_readonly_fields(self, request, obj=None):
        if obj and not request.user.is_superuser:
            readonly_fields = super().get_readonly_fields(request, obj)
            readonly_fields.remove('name')
            return readonly_fields

        return self.readonly_fields

    def get_list_display(self, request):
        if not request.user.is_superuser:
            return self.list_display[1:4]
        return self.list_display

    def get_queryset(self, request):
        queryset = super(AssetAdmin, self).get_queryset(request)
        if not request.user.is_superuser:
            editable_assets = request.user.assets_with_permission('cms.edit_content')
            queryset = Asset.objects.filter(Q(id__in=editable_assets))
        return queryset

    def get_list_filter(self, request):
        if request.resolver_match.view_name == 'admin:pages':
            if request.user.is_superuser:
                return (ContextFilter,)
            else:
                return tuple()
        list_display = self.get_list_display(request)
        if 'customizations_list' not in list_display:
            list_filter = list(self.list_filter)
            list_filter.remove(CustomizationFilter)
            return list_filter
        return self.list_filter

    def get_urls(self):
        urls = super(AssetAdmin, self).get_urls()
        my_urls = [
            url(r'^(?P<asset_id>.+?)/pages/$', self.admin_site.admin_view(self.page_list_view), name='pages'),
            url(r'^(?P<asset_id>.+?)/pages/(?P<context_id>.+?)/change/$',
                self.admin_site.admin_view(self.change_page),
                name='change_page')
        ]
        return my_urls + urls

    def response_change(self, request, obj):
        if '_clone' in request.POST:
            new_id = clone_asset(request, obj.id)
            if new_id:
                return redirect(reverse('admin:cms_asset_change', args=(new_id,)))
            else:
                return redirect('.')
        return super().response_change(request, obj)

    def response_add(self, request, obj, post_url_continue=None):
        if '_save' in request.POST and not request.user.is_superuser:
            return redirect(reverse('admin:pages', args=[obj.id]))
        return super().response_add(request, obj, post_url_continue)

    def asset_settings(self, obj):
        if not obj.asset_type or obj.asset_type.type in [AssetType.ASSET_TYPES.integration,
                                                         AssetType.ASSET_TYPES.article,
                                                         AssetType.ASSET_TYPES.agreement]:
            return format_html('')
        return format_html('<a class="btn btn-sm" href="{}">Settings</a>',
                           reverse('asset_settings', args=[obj.id]))

    asset_settings.short_description = 'Asset settings'
    asset_settings.allow_tags = True

    def page_list_view(self, request, asset_id=None):
        context = {
            'title': 'Edit a page',
            'app_label': self.model._meta.app_label,
            'opts': self.model._meta,
            'cl': self.get_changelist_instance(request),
            'has_permission': admin.site.has_permission(request),
            'asset': self.get_object(request, asset_id, None),
            'site_header': admin.site.site_header,
            'site_title': admin.site.site_title,
            'site_url': admin.site.site_url
        }

        if not context['asset']:
            raise PermissionDenied()

        if asset_id:
            qs = context['asset'].asset_type.context_set.all()
            if not request.user.is_superuser or request.GET.get('hidden') != 'true':
                qs = qs.filter(hidden=False)

            for page in qs:
                page.state = page.get_state(context['asset'])
            context['contexts'] = qs

        return render(request, 'cms/page_list_view.html', context)

    @staticmethod
    def change_page(request, context_id=None, asset_id=None):
        order_options = {'name': 'Tag/File name', 'label': 'Label'}
        order = request.GET.get('order', None)
        if order not in order_options.keys():
            order = None
        context = {'errors': []}
        if request.method == "POST" and 'asset_id' in request.POST:
            context['preview_link'], context['errors'] = page_editor(request)
            if 'SendReview' in request.POST and context['preview_link']:
                return redirect(context['preview_link'].url)

        target_context = Context.objects.get(id=context_id)
        asset = Asset.objects.get(id=asset_id)

        context['title'] = f"Edit {target_context.get_nice_name()}"
        context['language_code'] = Customization.objects.get(name=settings.CUSTOMIZATION).default_language
        context['EXTERNAL_IMAGE'] = DataStructure.DATA_TYPES[
            DataStructure.DATA_TYPES.external_image]
        context['BYTES_TO_MB'] = BYTES_TO_MEGABYTES

        if 'admin_language' in request.session:
            context['language_code'] = request.session['admin_language']

        context['asset'] = asset
        context['app_label'] = target_context._meta.app_label
        context['opts'] = target_context._meta
        context['asset_opts'] = asset._meta
        context['original'] = target_context
        context['has_permission'] = admin.site.has_permission(request)
        context['site_header'] = admin.site.site_header
        context['site_title'] = admin.site.site_title
        context['site_url'] = admin.site.site_url
        context['order_options'] = order_options

        form = CustomContextForm(initial={'language': context['language_code'], 'context': context_id}, order=order)
        form.add_fields(asset, target_context, Language.objects.get(code=context['language_code']), request.user)
        form.cleaned_data = {}
        for field_error in context['errors']:
            form.add_error(field_error[0], field_error[1])
        context['custom_form'] = form

        return render(request, 'cms/context_change_form.html', context)

    def edit_asset_button(self, obj):
        return format_html('<a class="btn btn-sm asset" href="{}">Edit content</a>',
                           reverse('admin:pages', args=[obj.id]))

    edit_asset_button.short_description = 'Edit page'
    edit_asset_button.allow_tags = True

    @staticmethod
    def customizations_list(obj):
        return ", ".join(obj.customizations.values_list('name', flat=True))


admin.site.register(Asset, AssetAdmin)


class ContextAdmin(CMSAdmin):
    list_display = ('name', 'description', 'url', 'translatable', 'is_global', 'hidden', 'deprecated')
    list_filter = ('asset_type', 'translatable', 'is_global', 'hidden', 'deprecated')
    actions = ('delete_selected',)


admin.site.register(Context, ContextAdmin)


class ContextTemplateAdmin(CMSAdmin):
    list_display = ('context', 'language', 'skin')
    list_filter = ('context', 'language', 'skin')
    search_fields = ('context__name', 'context__file_path', 'language__code')


admin.site.register(ContextTemplate, ContextTemplateAdmin)


class DataStructureAdmin(CMSAdmin):
    list_display = ('context', 'label', 'name', 'description', 'translatable', 'type', 'deprecated')
    list_filter = ('type', 'translatable', 'context__asset_type', 'deprecated')
    search_fields = ('context__name', 'name', 'description', 'type')
    actions = ('delete_selected',)


admin.site.register(DataStructure, DataStructureAdmin)


class LanguageAdmin(CMSAdmin):
    list_display = ('name', 'code')


admin.site.register(Language, LanguageAdmin)


class CustomizationAdmin(CMSAdmin):
    list_display = ('name', 'parent', 'trust_parent')
    form = CustomizationForm


admin.site.register(Customization, CustomizationAdmin)


class DataRecordAdmin(CMSAdmin):
    list_display = ('asset', 'language', 'context',
                    'data_structure', 'short_description', 'version')
    list_filter = ('asset', 'language', 'data_structure__context', 'data_structure')
    search_fields = ('data_structure__context__name', 'data_structure__name',
                     'data_structure__description', 'value', 'language__code')
    readonly_fields = ('created_by',)


admin.site.register(DataRecord, DataRecordAdmin)


class ContentVersionAdmin(CMSAdmin):
    list_display = ('id', 'asset', 'created_date', 'created_by', 'state')

    list_display_links = ('id', )
    list_filter = (AssetFilter, CustomizationFilter,)
    search_fields = ('created_by__email',)
    readonly_fields = ('created_by',)
    exclude = ('accepted_by', 'accepted_date')

    def changelist_view(self, request, extra_context=None):
        if not request.user.is_superuser:
            self.list_display_links = (None,)
        return super(ContentVersionAdmin, self).changelist_view(request, extra_context)

    def get_queryset(self, request):  # show only users for current cloud_portal asset
        qs = super(ContentVersionAdmin, self).get_queryset(request)  # Basic check from CMSAdmin
        if not request.user.is_superuser:
            qs = qs.filter(asset__customizations__name__in=request.user.customizations)
        return qs


admin.site.register(ContentVersion, ContentVersionAdmin)


class AssetCustomizationReviewAdmin(CMSAdmin):
    list_display = (
        'asset', 'version', 'customization_name', 'reviewer_email', 'reviewed_date', 'state', 'current_version'
    )
    readonly_fields = ('customization', 'version', 'reviewed_date', 'reviewed_by', 'notes',)
    list_filter = (
        'version__asset__asset_type', ReviewStateFilter, AssetFilter, CustomizationFilter, ReviewVersionFilter
    )

    change_form_template = 'cms/asset_customization_review_change_form.html'
    fieldsets = (
        (None, {
            "fields": (
                'notes',
            )
        }),
    )
    actions = ('delete_selected',)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        customization_review = AssetCustomizationReview.objects.get(id=object_id)
        version = customization_review.version
        extra_context['contexts'] = get_records_for_version(version.asset,
                                                            version,
                                                            customization_review.customization)

        extra_context['review_states'] = AssetCustomizationReview.REVIEW_STATES
        extra_context['customization_reviews'] = version.assetcustomizationreview_set.all()
        if not request.user.is_superuser:
            extra_context['customization_reviews'] = extra_context['customization_reviews'].\
                filter(customization__name__in=request.user.customizations)

        extra_context['DataStructureTypes'] = DataStructure.DATA_TYPES

        extra_context['allowed'] = self.template_allowed(request, customization_review)
        is_integration = version.asset.is_integration
        is_article = version.asset.is_asset_type(AssetType.ASSET_TYPES.article)
        extra_context['partial_preview'] = customization_review.can_preview_customization and not (
                    is_integration or is_article)
        extra_context['whole_preview'] = is_integration or is_article

        # Customization name should be visible in notes heading if developer has access or user has access
        customization_name = customization_review.customization.name
        title = f"Changes for {version.asset.name} - Version: {version.id}"
        if not UserGroupsToAssetPermissions.check_customization_access(request.user, customization_name):
            title = f"{title} – {self.state_tag(customization_review.state)}"

        extra_context["page_title"] = format_html(title)
        return super(AssetCustomizationReviewAdmin, self).change_view(
            request, object_id, form_url, extra_context=extra_context,
        )

    # TODO: filter visible reviews
    def get_queryset(self, request):
        qs = super(AssetCustomizationReviewAdmin, self).get_queryset(request)
        if not request.user.is_superuser:
            qs = qs.filter(Q(customization__name__in=request.user.customizations_with_permission('cms.publish_version')))

            editable_assets = request.user.assets_with_permission('cms.edit_content')
            qs = qs | AssetCustomizationReview.objects.filter(Q(version__asset__id__in=editable_assets))
        can_view = request.user.customizations
        qs = qs.annotate(show_customization=Case(When(customization__name__in=can_view, then=Value(True)),
                                                 default=Value(False),
                                                 output_field=BooleanField()))

        return qs

    def get_readonly_fields(self, request, obj=None):
        if obj is None:
            return self.readonly_fields
        if request.user != obj.version.asset.created_by and\
                obj.state != AssetCustomizationReview.REVIEW_STATES.rejected:
            return self.readonly_fields
        return list(set(list(self.readonly_fields) +
                        [field.name for field in obj._meta.fields] +
                        [field.name for field in obj._meta.many_to_many]))

    def has_delete_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        elif obj:
            return request.user == obj.version.asset.created_by
        return False

    def has_add_permission(self, request):
        return False

    @staticmethod
    def asset(obj):
        return obj.version.asset

    def save_model(self, request, obj, form, change):
        # Save the review notes
        super(AssetCustomizationReviewAdmin, self).save_model(request, obj, form, change)
        # handle the action the user chose in asset.review
        review(request)

    def response_change(self, request, obj):
        return redirect(reverse('admin:cms_assetcustomizationreview_change', args=(obj.id,)))

    def current_version(self, obj):
        return obj.version.asset.version_id(obj.customization.name) == obj.version.id

    current_version.short_description = "Current Published Version"
    current_version.boolean = True

    def customization_name(self, obj):
        return obj.customization if obj.show_customization else "-"

    customization_name.short_description = "Customization"

    def reviewer_email(self, obj):
        return obj.reviewed_by if obj.show_customization else "-"

    reviewer_email.short_description = "Reviewed By"

    def template_allowed(self, request, customization_review):
        customization_name = customization_review.customization.name
        matching_portal = customization_name == settings.CUSTOMIZATION
        asset = customization_review.version.asset
        is_cloud_portal = asset.is_cloud_portal
        state = customization_review.state

        has_asset_type_permission = UserGroupsToAssetType.check_asset_type(
            request.user, asset.asset_type, 'cms.publish_version'
        )
        can_force_update = UserGroupsToAssetPermissions.check_customization_permission(
            request.user, customization_name, 'cms.force_update'
        ) & has_asset_type_permission
        can_publish_or_accept = UserGroupsToAssetPermissions.check_customization_permission(
            request.user, customization_name, 'cms.publish_version'
        ) & has_asset_type_permission

        developer_access_customization = UserGroupsToAssetPermissions.check_customization_permission(
            customization_review.version.created_by, customization_name, 'cms.access_customization')
        can_delete = self.has_delete_permission(request, customization_review)

        allowed = dict()
        allowed['force_update'] = \
            is_cloud_portal and state == AssetCustomizationReview.REVIEW_STATES.accepted and matching_portal \
            and can_force_update
        allowed['reject'] = \
            can_publish_or_accept and \
            state in [AssetCustomizationReview.REVIEW_STATES.blocked,
                      AssetCustomizationReview.REVIEW_STATES.pending]
        allowed['publish'] = \
            is_cloud_portal and state == AssetCustomizationReview.REVIEW_STATES.pending and can_publish_or_accept
        allowed['accept'] = \
            not is_cloud_portal and state == AssetCustomizationReview.REVIEW_STATES.pending \
            and can_publish_or_accept
        allowed['question'] = \
            (state == AssetCustomizationReview.REVIEW_STATES.pending or
             state == AssetCustomizationReview.REVIEW_STATES.rejected)
        allowed['delete'] = can_delete
        allowed['submit_row'] = True in allowed.values()
        allowed['access_customization_checkbox'] = not developer_access_customization and can_publish_or_accept

        return allowed

    @staticmethod
    def state_tag(state):
        name = AssetCustomizationReview.REVIEW_STATES[state]
        label_type = "label-default"
        if state == AssetCustomizationReview.REVIEW_STATES.rejected:
            label_type = "label-danger"
        elif state == AssetCustomizationReview.REVIEW_STATES.accepted:
            label_type = "label-success"
        return f"<span class=\"label {label_type}\">{name}</span>"


admin.site.register(AssetCustomizationReview, AssetCustomizationReviewAdmin)


class UserGroupsToAssetPermissionsAdmin(admin.ModelAdmin):
    list_display = ('id', 'group', 'asset',)
    list_filter = ('asset', )


admin.site.register(UserGroupsToAssetPermissions, UserGroupsToAssetPermissionsAdmin)


class UserGroupsToAssetTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'group', 'asset_type',)
    list_filter = ('asset_type', )


admin.site.register(UserGroupsToAssetType, UserGroupsToAssetTypeAdmin)


class ExternalFileAdmin(CMSAdmin):
    list_display = ('id', 'file', 'size',)


admin.site.register(ExternalFile, ExternalFileAdmin)


@admin.register(ContributorAgreement)
class ContributorAgreementAdmin(CMSAdmin):
    form = ContributorAgreementForm
    search_fields = ('user__email',)
    list_filter = ('accepted_agreement__customization',)
    list_display = ('user', 'customization', 'version', 'valid', 'accepted_review')
    readonly_fields = ('accepted_agreement', 'customization', 'version', 'valid')

    def customization(self, obj):
        if obj.accepted_agreement:
            return obj.accepted_agreement.customization

    def version(self, obj):
        if obj.accepted_agreement:
            return obj.accepted_agreement.version

    def valid(self, obj):
        if obj.accepted_agreement:
            return obj.accepted_agreement.version.id == obj.accepted_agreement.version.asset.version_id()

    def accepted_review(self, obj):
        if obj.accepted_agreement:
            link = reverse('admin:cms_assetcustomizationreview_change', args=[obj.accepted_agreement.id])
            return format_html('<a href="{}">Review</a>', link)

