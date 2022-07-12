from cms.tasks import async_menu_export, async_menu_import
from urllib.parse import unquote, quote

from django.contrib import admin, messages
from django.contrib.admin import SimpleListFilter, AdminSite
from django.contrib.admin.actions import delete_selected
from django.contrib.admin.views.main import SEARCH_VAR
from django.conf.urls import url
from django.core.exceptions import PermissionDenied
from django.db.models import F, Q, Case, When, Value, BooleanField, Max
from django.db import transaction
from django.shortcuts import render, redirect
from django.urls import reverse, path
from django.utils.html import format_html

import nested_admin
from waffle.admin import FlagAdmin as WaffleFlagAdmin
from waffle import flag_is_active

from cms.forms import *
from cms.feature_flags import *
from cms.controllers.zendesk import Importer, clean_menu, CategoryNotFoundException, sync_menu
from cms.controllers import generate_structure, structure
from cms.controllers.modify_db import generate_preview_links, get_records_for_version, generate_preview_link
from cms.views.asset import page_editor, prepare_asset_exports, review, response_attachment, prepare_asset_info_for_menu

admin.site.disable_action('delete_selected')  # Remove delete action from all models in admin


def clone_asset(request, asset_id):
    asset = Asset.objects.get(id=asset_id)
    clone_name = asset.name + ' - copy'
    created_by = request.user
    customizations = asset.customizations.all()

    if Asset.objects.filter(name=clone_name).first():
        messages.error(request, "Copy already exists")
        return None

    if asset.is_cloud_portal:
        messages.error(request, "Cannot clone cloud portal assets")
        return None

    asset.pk = asset.id = None
    asset.name = clone_name
    asset.created_by = created_by
    asset.primary_group = None
    asset.uuid = uuid.uuid4()
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
            for review in AssetCustomizationReview.objects.all().select_related('version__asset'):
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
    list_display = ('name', 'type', 'asset_type_settings', 'can_preview', 'single_customization',)
    list_display_links = ('name', 'type')
    change_form_template = 'cms/asset_type_change_form.html'

    def asset_type_settings(self, obj):
        return format_html('<a class="btn btn-sm" href="{}">Settings</a>',
                           reverse('asset_type_settings', args=[obj.id]))

    asset_type_settings.short_description = 'Asset Type settings'
    asset_type_settings.allow_tags = True


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
                if request.META['QUERY_STRING'] != 'e=1':
                    filters_dict[request.path_info] = request.META['QUERY_STRING']
                else:
                    filters_dict[request.path_info] = ''
                caches['filters'].set(request.user.id, filters_dict)
                return response
            except Exception as exception:
                filters_dict.pop(request.path_info, None)
                caches['filters'].set(request.user.id, filters_dict)
                raise exception

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['current_versions'] = []
        extra_context['object_id'] = object_id
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
            Q(usergroupstoassetpermissions__asset=asset) |
            Q(options__all_assets=True, usergroupstoassettype__asset_type=asset.asset_type)
        ).prefetch_related('permissions')

        if request.user.is_superuser:
            nodes = asset.nodes.all()
            related_nodes_list = []
            for node in nodes:
                menu = node.get_parent()
                related_nodes_list.append({'menu': menu, 'node': node})
            extra_context['related_nodes'] = related_nodes_list

        if not asset.is_cloud_portal:
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
            fields.remove('menu')
            if not request.user.is_superuser and not obj.asset_type.single_customization:
                fields.remove('customizations')
        else:
            fields.remove('preview_status')
            fields.append(fields.pop(fields.index('customizations')))
            if not request.user.is_superuser:
                fields.remove('menu')
        return fields

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            new = True
        else:
            new = False
        super().save_model(request, obj, form, change)
        if new and obj.asset_type.type == AssetType.ASSET_TYPES.documentation:
            menu = form.cleaned_data.get('menu', None)
            if menu:
                order = (menu.nodes.aggregate(Max('order'))['order__max'] or 0) + 1
                MenuNode.objects.create(name=obj.name, parent_menu=menu, asset=obj, order=order)

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
                name='change_page'),
            url(r'^(?P<asset_id>.+?)/pages/(?P<custom_preview>.+?)$', self.admin_site.admin_view(self.page_list_view), name='pages_custom_preview')
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
        if '_save' in request.POST and \
                (not request.user.is_superuser or obj.asset_type.type == AssetType.ASSET_TYPES.documentation) and \
                not request.GET.get('_popup', False):
            return redirect(reverse('admin:pages', args=[obj.id]))
        return super().response_add(request, obj, post_url_continue)

    def asset_settings(self, obj):
        return format_html('<a class="btn btn-sm" href="{}">Settings</a>',
                           reverse('asset_settings', args=[obj.id]))

    asset_settings.short_description = 'Asset settings'
    asset_settings.allow_tags = True

    def page_list_view(self, request, asset_id=None, custom_preview=None):
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
            return redirect('/admin/cms/asset/add/?_to_field=id&_popup=1')

        if asset_id:
            qs = context['asset'].asset_type.context_set.all()
            exclude_hidden = qs.filter(hidden=False)
            if qs.count() == 1 or not request.user.is_superuser and exclude_hidden.count() == 1:
                context_id = exclude_hidden.first().id
                params = f'?customPreview={unquote(custom_preview).replace("asset_id", asset_id)}' if custom_preview else ''
                return redirect(reverse('admin:change_page', args=[asset_id, context_id]) + params)
            if not request.user.is_superuser or request.GET.get('hidden') != 'true':
                qs = exclude_hidden

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
        target_context = Context.objects.get(id=context_id)
        asset = Asset.objects.get(id=asset_id)
        if request.method == "POST" and 'asset_id' in request.POST:
            context['preview_link'], context['errors'] = page_editor(request)
            if 'SendReview' in request.POST and context['preview_link']:
                custom_preview = request.POST.get('customPreview', '') or generate_preview_link(target_context, asset, 'pending')
                if custom_preview:
                    custom_preview = "?customPreview=" + custom_preview.replace('draft', 'pending')
                return redirect(f'{context["preview_link"].url}{custom_preview or ""}')

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
        context['preview_url'] = generate_preview_link(context=target_context, asset=asset, state="draft")
        context['preview_url_list'] = json.dumps(list(filter(lambda item: item[1], generate_preview_links(context=target_context, asset=asset, state="draft"))))
        context['can_edit_datastructure'] = request.user.has_perm('cms.change_datastructure')
        context['order_options'] = order_options
        image_extensions = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'apng', 'avif' 'svg', 'gif', 'webp', 'bmp', 'ico', 'tif', 'tiff']
        admin_files = [
            {'title': upload.file.url.split('/')[-1],  'value': upload.file.url}
            for upload in ExternalFile.objects.exclude(admin_upload=None)
            if upload.file
        ]
        admin_uploads = [
            upload for upload in admin_files
            if upload['title'].split('.')[-1] in image_extensions
        ]
        context['admin_files'] = json.dumps(admin_files)
        context['admin_uploads'] = json.dumps(admin_uploads)

        form = CustomContextForm(initial={'language': context['language_code'], 'context': context_id}, order=order)
        form.add_fields(asset, target_context, Language.objects.get(code=context['language_code']), request.user)
        form.cleaned_data = {}
        for field_error in context['errors']:
            form.add_error(field_error[0], field_error[1])
        context['custom_form'] = form
        branding, *_ = get_branding_shortcuts()
        restricted = get_restricted_keywords()
        context['default_branding'] = json.dumps(list({
            shortcut[1].lower()
            for shortcut in branding + [(None, term) for term in restricted]
        }))


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
    form = LanguageForm

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        form.instance.customization_set.set(form.cleaned_data['customizations'])



admin.site.register(Language, LanguageAdmin)


class CustomizationAdmin(CMSAdmin):
    list_display = ('name', 'parent', 'trust_parent', 'enabled')
    list_filter = ('enabled',)
    form = CustomizationForm
    ordering = ['-pk']


admin.site.register(Customization, CustomizationAdmin)


class DataRecordAdmin(CMSAdmin):
    list_display = ('asset', 'language', 'context',
                    'data_structure', 'short_description', 'created_by', 'version')
    list_filter = ('asset', 'language', 'data_structure__context', 'data_structure')
    search_fields = ('data_structure__context__name', 'data_structure__name',
                     'data_structure__description', 'value', 'language__code', 'created_by__email',)
    readonly_fields = ('created_by',)
    actions = ('delete_selected',)


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
        extra_context['contexts'], extra_context['context_preview_links'] = get_records_for_version(version.asset,
                                                            version,
                                                            customization_review.customization)
        custom_preview_from_params = request.GET.get('customPreview') or request.POST.get('customPreview')
        custom_preview = custom_preview_from_params or customization_review.default_preview
        if custom_preview:
            extra_context['context_preview_links']['Content'] = custom_preview
            if custom_preview_from_params and not customization_review.default_preview:
                customization_review.default_preview = custom_preview
                customization_review.save()
                reviews = version.assetcustomizationreview_set.all()
                reviews.update(default_preview=custom_preview)

        extra_context['review_states'] = AssetCustomizationReview.REVIEW_STATES
        # Exclude customization reviews that are not in the asset's customizations
        extra_context['customization_reviews'] = version.assetcustomizationreview_set.\
            filter(customization__in=version.asset.customizations.all())
        if not request.user.is_superuser:
            extra_context['customization_reviews'] = extra_context['customization_reviews'].\
                filter(customization__name__in=request.user.customizations)

        if extra_context['customization_reviews'].count() > 1:
            extra_context['show_accept_all'] = True
        else:
            extra_context['show_accept_all'] = False

        extra_context['DataStructureTypes'] = DataStructure.DATA_TYPES

        extra_context['allowed'] = self.template_allowed(request, customization_review)
        is_integration = version.asset.is_integration
        is_article = version.asset.is_article
        is_agreement = version.asset.is_agreement
        extra_context['partial_preview'] = customization_review.can_preview_customization and not (
                    is_integration or is_article or is_agreement)
        extra_context['whole_preview'] = is_integration or is_article or is_agreement
        extra_context['preview_url_list'] = json.dumps(list(filter(lambda item: item[1], generate_preview_links(asset=version.asset, state="pending"))))

        # Customization name should be visible in notes heading if developer has access or user has access
        customization_name = customization_review.customization.name
        extra_context['current_customization_name'] = customization_name
        title = f"Changes for {version.asset.name} - Version: {version.id}"
        if not UserGroupsToAssetPermissions.check_customization_access(request.user, customization_name):
            title = f"{title} – {self.state_tag(customization_review.state)}"

        extra_context["page_title"] = format_html(title)

        if request.method == 'POST' and 'delete_all' in request.POST or request.POST.get('action', None) == 'delete_selected':
            if extra_context['allowed']['delete']:
                response = delete_selected(self, request, version.assetcustomizationreview_set.all())
                if response:
                    return response
                else:
                    filters = request.GET.get('_changelist_filters', '')
                    return redirect(reverse('admin:cms_assetcustomizationreview_changelist') + f'?{filters}')
            else:
                raise PermissionDenied
        return super(AssetCustomizationReviewAdmin, self).change_view(
            request, object_id, form_url, extra_context=extra_context,
        )

    # TODO: filter visible reviews
    def get_queryset(self, request):
        qs = super(AssetCustomizationReviewAdmin, self).get_queryset(request).order_by('-version_id')
        if not request.user.is_superuser:
            qs = qs.filter(Q(customization__name__in=request.user.customizations_with_permission('cms.publish_version')))

            editable_assets = request.user.assets_with_permission('cms.edit_content')
            qs = qs | AssetCustomizationReview.objects.filter(Q(version__asset__id__in=editable_assets))
        can_view = request.user.customizations
        qs = qs.annotate(show_customization=Case(When(customization__name__in=can_view, then=Value(True)),
                                                 default=Value(False),
                                                 output_field=BooleanField()))
        # Hide customizations that are not in the asset's customizations.
        qs = qs.filter(customization__in=F('version__asset__customizations'))
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
        ) and has_asset_type_permission
        can_publish_or_accept = UserGroupsToAssetPermissions.check_customization_permission(
            request.user, customization_name, 'cms.publish_version'
        ) and has_asset_type_permission

        developer_access_customization = UserGroupsToAssetPermissions.check_customization_permission(
            customization_review.version.created_by, customization_name, 'cms.access_customization')
        can_delete = self.has_delete_permission(request, customization_review)

        is_current_version = asset.version_id(customization_name) == customization_review.version.id

        allowed = dict()
        allowed['force_update'] = \
            is_cloud_portal and state == AssetCustomizationReview.REVIEW_STATES.accepted and matching_portal \
            and can_force_update and is_current_version
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
        allowed['revoke'] = state == AssetCustomizationReview.REVIEW_STATES.accepted \
            and can_publish_or_accept and is_current_version
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
        elif state == AssetCustomizationReview.REVIEW_STATES.pending:
            label_type = "label-warning"
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


class AdminUploadedFilter(SimpleListFilter):
    title = 'Admin Uploaded'
    parameter_name = 'admin_uploaded'

    def lookups(self, request, model_admin):
        return (('Yes', 'Only admin uploads'), ('Mine', 'Only my uploads'), ('No', 'Exclude admin uploaded'))

    def queryset(self, request, queryset):
        value = self.value()
        if value == 'Yes':
            return queryset.exclude(admin_upload=None)
        elif value == 'Mine':
            return queryset.filter(admin_upload=request.user)
        elif value == 'No':
            return queryset.filter(admin_upload=None)

        return queryset


@admin.register(ExternalFile)
class ExternalFileAdmin(CMSAdmin):
    list_display = 'id', 'file_path', 'download', 'admin_uploaded', 'asset_ds_pair_count', 'size', 'md5'
    fields = 'file',
    list_filter = AdminUploadedFilter,
    change_list_template = 'cms/externalfile_change_list.html'

    def asset_ds_pair_count(self, obj):
        return obj.asset_ds_pair.count()

    def admin_uploaded(self, obj):
        return obj.admin_upload or 'No'

    def download(sef, obj):
        return mark_safe(f'<a class="btn btn-sm" href="/static{settings.MEDIA_URL}{obj}">Download File</a>')

    def file_path(sef, obj):
        return mark_safe(f'<a href="/serve/{obj}" target="_blank">{obj}</a>')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return obj.admin_upload == request.user if obj else  request.user.is_superuser

    def save_model(self, request, obj, form, change):
        obj = ExternalFile.objects.create(obj.file, user=request.user)
        super().save_model(request, obj, form, change)


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


class MenuNodeInline(nested_admin.SortableHiddenMixin, nested_admin.NestedStackedInline):
    model = MenuNode
    form = MenuNodeInlineForm
    # Hack to force inlines checking. Inlines are actually populated by get_inline_instances below
    inlines = [None]
    sortable_field_name = 'order'
    extra = 0
    verbose_name = 'Item'
    verbose_name_plural = 'Items'
    loaded_config = None

    hidden_fields = ('asset', 'related_assets')
    readonly_fields = ('is_global', 'preview', 'zendesk_record')

    def __init__(self, *args, **kwargs):
        default_config = Menu._meta.get_field('admin_config').default
        self.depth = kwargs.pop('depth', 1)
        self.total_depth = kwargs.pop('total_depth', 1)
        self.chosen_customization = kwargs.pop('customization', 'all')
        self.user_customizations = kwargs.pop('user_customizations', [])
        self.admin_config = kwargs.pop('admin_config', default_config)
        self.custom_preview = kwargs.pop('custom_preview')

        try:
            self.loaded_config = json.loads(self.admin_config)
        except JSONDecodeError:
            self.loaded_config = json.loads(default_config)

        super().__init__(*args, **kwargs)

    def get_fieldsets(self, request, obj=None):
        fieldsets = (
            (None, {
                'classes': ('nested-stacked-flex', 'nested-stacked-heading',),
                'fields': ['name', 'order']
            }),
            (None, {
                'classes': ('nested-stacked-flex', 'nested-stacked-details',),
                'fields': []
            }),
            ('Advanced', {
                'classes': ('nested-stacked-advanced', 'nested-stacked-flex',),
                'fields': []
            }),
        )
        added_fields = ['name', 'order']
        required_fields = ['enabled', 'asset']

        def add_field(fieldset, fields):
            for field in fields:
                if field in required_fields:
                    required_fields.remove(field)

                if field not in added_fields:
                    fieldsets[fieldset][1]['fields'].append(field)
                    added_fields.append(field)

        fieldset_list = [self.loaded_config.get(field_key, []) for field_key in ['header', 'details', 'advanced']]

        [add_field(fieldset, field) for fieldset, field in enumerate(fieldset_list)]

        fieldsets[2][1]['fields'].extend(required_fields)

        return fieldsets

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form.current_customization = self.chosen_customization
        formset.form.user_customizations = self.user_customizations
        formset.form.custom_preview = self.custom_preview
        return formset

    def get_queryset(self, request):
        return super().get_queryset(request).order_by('order')

    def get_inline_instances(self, request, obj=None):
        if self.depth < self.total_depth:
            return [MenuNodeInline(
                self.model, self.admin_site, depth=self.depth + 1, total_depth=self.total_depth,
                customization=self.chosen_customization, user_customizations=self.user_customizations,
                admin_config=self.admin_config,
                custom_preview=self.custom_preview
            )]
        return []

    def enabled_ro(self, obj):
        if obj:
            return format_html(f'<a href="{reverse("admin:cms_menunode_change", args=(obj.id,))}">Advanced</a>')
        return ''
    enabled_ro.short_description = 'Enable / Disable'

    def preview(self, obj):
        if obj:
            if obj.url:
                obj_url = obj.url
                if not obj_url.startswith('http') and not obj_url.startswith('/'):
                    obj_url = '/' + obj_url
                return format_html(f'<a href="{obj_url}" title="Preview"><span class="glyphicon glyphicon-picture"></span></a>')
            elif obj.asset:
                return format_html(f'<a href="{generate_preview_link(context=None, asset=obj.asset)}" title="Preview"><span class="glyphicon glyphicon-picture"></span></a>')
        return ''

    def zendesk_record(self, obj):
        if self.chosen_customization != 'all':
            zd_obj = None
            title = None
            section = obj.zendesksection_set.select_related('site').filter(
                site__customization__name=self.chosen_customization
            ).first()
            if section:
                zd_obj = section
                title = 'Section'
            article = obj.zendeskarticle_set.select_related('site').filter(
                site__customization__name=self.chosen_customization
            ).first()
            if article:
                zd_obj = article
                title = 'Article'

            if zd_obj:
                sync_status = 'no' if zd_obj.needs_sync or not zd_obj.sync else 'yes'
                sync_status_title = 'Sync Disabled' if not zd_obj.sync else 'Not synced' if zd_obj.needs_sync else 'Synced'
                return format_html(f'<a style="padding-right: 5px;" href="{zd_obj.admin_link}" target="_blank">Zendesk {title}</a>'
                                   f'<img src="/static/admin/img/icon-{sync_status}.svg" alt="{sync_status_title}"'
                                   f'title="{sync_status_title}">')
        return None

@admin.register(Menu)
class MenuAdmin(nested_admin.NestedModelAdmin):
    list_display = ('name', 'depth', 'eval_url', 'enabled')
    form = MenuChangeForm
    change_form_template = 'cms/menu_change_form.html'

    def eval_url(self, obj: Menu):
        if obj.type in [Menu.MENU_TYPES.docs_struct, Menu.MENU_TYPES.docs_knowledgebase] and obj.base_url:
            return f'/docs/{obj.base_url}/{obj.url}'
        return ''
    eval_url.short_description = 'URL'

    def get_fieldsets(self, request, obj=None):
        zendesk_sync_feature_enabled = flag_is_active(request, FLAGS.zendesk_sync) and request.user.is_superuser
        fields = [field for field in super().get_fields(request, obj)]
        fields.remove('admin_config')
        if not zendesk_sync_feature_enabled:
            fields.remove('zendesk_sync_enabled')
        if not (obj and obj.pk):
            fields.remove('customization_view')
        main = (None, {
                "fields": fields
            })
        advanced = ('Advanced', {
                "classes": ['nested-stacked-advanced'],
                "fields": ['admin_config']
            })

        return (main, advanced) if request.user.is_superuser else (main,)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        zendesk_sync_feature_enabled = flag_is_active(request, FLAGS.zendesk_sync) and request.user.is_superuser
        extra_context = extra_context or {}
        filters_dict = caches['filters'].get(request.user.id) or {}
        cached_path = filters_dict.get(request.path_info, None)
        query_params = request.META['QUERY_STRING']
        if not query_params and cached_path:
            return redirect(f'{request.path_info}?{cached_path}')
        menu = Menu.objects.get(id=object_id)
        extra_context['preview_url_draft'] = menu.preview_url('draft')
        if zendesk_sync_feature_enabled:
            extra_context['zendesk_sync_url'] = reverse("admin:menu_sync", args=(menu.id,))
            extra_context['sync_states'] = menu.zendesk_sync_state
            extra_context['zendesk_mapping_url'] = reverse("admin:zendesk_mapping", args=(getattr(self, 'chosen_customization', settings.CUSTOMIZATION),))
        extra_context['preview_url_review'] = menu.preview_url('pending')
        extra_context['asset_info'] = json.dumps(prepare_asset_info_for_menu(request, object_id))
        extra_context['label_lookup'] = Menu.LABEL_LOOKUP
        extra_context['menu_id'] = object_id
        self.chosen_customization = request.GET.get('customization', 'all')
        if self.chosen_customization != 'all':
            self.chosen_customization = Customization.objects.filter(
                name=self.chosen_customization, name__in=request.user.customizations
            ).first() or 'all'
            extra_context['customization'] = self.chosen_customization.name
            if zendesk_sync_feature_enabled:
                extra_context['sync_states'] = list(filter(lambda customization: customization['customization_name'] == self.chosen_customization.name, extra_context['sync_states']))
        valid_query = query_params != 'e=1' and str(self.chosen_customization) == request.GET.get(
            'customization') and str(self.chosen_customization) != 'all'
        filters_dict[request.path_info] = query_params if valid_query else ''
        caches['filters'].set(request.user.id, filters_dict)
        return super().change_view(request, object_id, form_url, extra_context)

    def get_inline_instances(self, request, obj=None):
        # This serves two purposes:
        # 1. Only show inline admins after a menu is created and depth is defined
        # 2. If depth is changed, makes sure number of expected inline forms doesn't change right before processing them
        if obj and obj.pk:
            obj_orig = Menu.objects.get(pk=obj.pk)
            if obj_orig.depth > 0:
                return [MenuNodeInline(
                    self.model, self.admin_site, depth=1, total_depth=obj_orig.depth,
                    customization=self.chosen_customization, user_customizations=request.user.customizations,
                    admin_config=getattr(obj_orig, 'admin_config'),
                    custom_preview=self.model.node_preview_url
                )]
        return []

    def save_formset(self, request, form, formset, change):
        super().save_formset(request, form, formset, change)
        objs = [obj for obj, fields in formset.changed_objects]
        objs.extend(formset.new_objects)
        ZendeskSection.objects.filter(menu_node__in=objs, sync=True).update(needs_sync=True)
        ZendeskArticle.objects.filter(menu_node__in=objs, sync=True, section__sync=True).update(needs_sync=True)
        for obj in objs:
            obj.refresh_from_db()
            if obj.asset:
                obj.asset.customizations.set(obj.enabled.all())

    def get_form(self, request, obj=None, change=False, **kwargs):
        form = super().get_form(request, obj, change, **kwargs)
        if obj and obj.pk:
            form.user_customizations = request.user.customizations
            form.current_customization = self.chosen_customization
        return form

    @staticmethod
    def on_save(obj, request):
        MENU_CACHE.clear_cache()
        zendesk_sync_feature_enabled = flag_is_active(request, FLAGS.zendesk_sync) and request.user.is_superuser
        if zendesk_sync_feature_enabled:
            for _ in sync_menu(obj):
                # TODO: Will probably need to take the taskId and use it for tracking status
                pass

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        transaction.on_commit(lambda: self.on_save(obj, request))

    def response_change(self, request, obj):
        response = super().response_change(request, obj)
        if '_continue' in request.POST:
            return redirect(f'{request.path}?{request.META.get("QUERY_STRING")}')
        return response

    def get_urls(self):
        urls = super().get_urls()
        my_urls = [
            path('port/', self.admin_site.admin_view(self.menu_porting), name='menu_porting'),
            path('zendesk_import/', self.admin_site.admin_view(self.zendesk_import), name='zendesk_import'),
            path('zendesk_sync/<str:id>', self.admin_site.admin_view(self.menu_sync), name='menu_sync'),
            path('zendesk_mapping/<str:customization>/', self.admin_site.admin_view(self.zendesk_mapping), name='zendesk_mapping')
        ]
        return my_urls + urls

    def zendesk_import(self, request):
        if not request.user.is_superuser:
            raise PermissionDenied()
        if request.method == "POST":
            form = ZendeskImportForm(request.POST)
            if form.is_valid():
                data = form.cleaned_data
                if 'import' in request.POST:
                    subdomain, domain = data['domain'].split('.', 1)
                    credentials = {'token': data['api_token'], 'email': data['zendesk_email'], 'password': data['zendesk_password']}
                    # Use fake token to make Zenpy happy
                    if not (credentials['token'] or data['zendesk_email']):
                        credentials['token'] = 'xx'
                    try:
                        Importer(subdomain=subdomain, domain=domain, user=request.user, creds=credentials).import_knowledgebase(menu=data['menu'], category_name=data['zendesk_category_name'])
                    except CategoryNotFoundException:
                        messages.error(request, 'Zendesk category not found')
                    else:
                        messages.success(request, 'Successfully imported articles')
                        return redirect('admin:cms_menu_change', data['menu'].id)
                elif 'delete' in request.POST:
                    menu = data['menu']
                    clean_menu(menu)
                    messages.success(request, 'Successfully cleaned the menu')

        else:
            form = ZendeskImportForm()

        return render(request, 'cms/zendesk_import.html',
                      {'form': form,
                       'user': request.user,
                       'has_permission': admin.site.has_permission(request),
                       'site_url': admin.site.site_url,
                       'site_header': admin.site.site_header,
                       'site_title': admin.site.site_title,
                       'title': 'Export/Import Menus'})

    @check_feature_flag(FLAGS.zendesk_sync, validate_is_superuser)
    def menu_sync(self, request, id):
        menu = Menu.objects.filter(id=id).first()
        context = menu.get_sync_state()
        return render(request, 'cms/zendesk_sync.html', context)

    @check_feature_flag(FLAGS.zendesk_sync, validate_is_superuser)
    def zendesk_mapping(self, request, customization):
        from cms.controllers.zendesk import ZendeskMapper, ZendeskNotConfigured, ZendeskInvalidConfiguration
        settings_context = Context.objects.get(name='settings', asset_type=get_cloud_portal_asset().asset_type)
        settings_change_page = reverse('admin:change_page', args=(customization_obj.id, settings_context.id)) if (customization_obj := Customization.objects.filter(name=customization).first()) else ''
        try:
            mapper = ZendeskMapper(customization_name=customization, verify_auth=True)
        except (ZendeskNotConfigured, ZendeskInvalidConfiguration) as e:
            return render(request, 'cms/zendesk_mapping.html', {'items': [], 'unmapped': '', 'empty': '', 'error_message': e.message, 'settings_page': settings_change_page})

        mapper.build_struct()
        context = {
            'items': mapper.struct,
            **mapper.get_unmapped_and_empty(json_values=True)
        }
        return render(request, 'cms/zendesk_mapping.html', context)

    def menu_porting(self, request):
        form_export = None
        form_import = None
        conflicts = []
        menu_name = ''
        if request.method == 'POST':
            if 'export' in request.POST:
                form_export = MenuPortForm(request.POST, request.FILES, port_type='export')
                if form_export.is_valid():
                    menu_name = form_export.cleaned_data['menu'].name
                    task = async_menu_export.apply_async(args=[menu_name])
                    file_name = f'menu-{menu_name}.json'
                    return render(request, 'cms/menu_porting.html',
                                  {'formExport': form_export,
                                   'formImport': MenuPortForm(request.POST, request.FILES, port_type='import'),
                                   'user': request.user,
                                   'has_permission': admin.site.has_permission(request),
                                   'site_url': admin.site.site_url,
                                   'site_header': admin.site.site_header,
                                   'site_title': admin.site.site_title,
                                   'title': 'Export/Import Menus',
                                   'processing_menu': menu_name,
                                   'queue_message': 'Menu export waiting in queue...',
                                   'progress_message': 'Processing export asset/node CURRENT out of TOTAL',
                                   'complete_message': f'Menu "{menu_name}" has been successfully exported. Click the download link below if download didn\'t start automatically.',
                                   'download_message': f'Download "{file_name}"',
                                   'modal_title': 'Processing Menu Export',
                                   'task': str(task)
                                   })
            elif 'import' in request.POST:
                PACKAGE_CACHE = PackagesCache()
                form_import = MenuPortForm(request.POST, request.FILES, port_type='import')
                if form_import.is_valid():
                    task = ''
                    data = form_import.cleaned_data
                    menu = data['menu']
                    force = data['force']
                    accept_reviews = data['accept_reviews']
                    cache_key = f'{request.session.session_key}-{menu}'
                    file = request.FILES.get('file') or PACKAGE_CACHE[cache_key]
                    file = file if isinstance(file, (list, dict)) else json.load(file)
                    menu_name = file.get('name')
                    PACKAGE_CACHE[cache_key] = file
                    conflicts = structure.check_asset_conflicts(file.get('assets', []))
                    if not conflicts or force:
                        conflicts = []
                        task = async_menu_import.apply_async(args=[cache_key, menu.name, request.user.email, accept_reviews])
                    else:
                        messages.warning(request, 'Some assets contain conflicts with existing records. To force update with new values please check the "Force Update" checkbox.')
                    return render(request, 'cms/menu_porting.html',
                                  {'formExport': MenuPortForm(request.POST, request.FILES, port_type='export'),
                                   'formImport': form_import,
                                   'user': request.user,
                                   'has_permission': admin.site.has_permission(request),
                                   'site_url': admin.site.site_url,
                                   'site_header': admin.site.site_header,
                                   'site_title': admin.site.site_title,
                                   'title': 'Export/Import Menus',
                                   'processing_menu': menu.name,
                                   'queue_message': 'Menu import waiting in queue...',
                                   'progress_message': 'Processing asset/node CURRENT out of TOTAL',
                                   'complete_message': f'Menu "{menu.name}" has been successfully imported.',
                                   'download_message': '',
                                   'file_name': '',
                                   'conflicts': conflicts,
                                   'modal_title': 'Processing Menu Import',
                                   'task': str(task)
                                  })

        if not form_export:
            form_export = MenuPortForm(port_type='export')
        if not form_import:
            form_import = MenuPortForm(port_type='import')
        messages.info(request, 'Checking asset names...')
        return render(request, 'cms/menu_porting.html',
                      {'formExport': form_export,
                       'formImport': form_import,
                       'user': request.user,
                       'has_permission': admin.site.has_permission(request),
                       'site_url': admin.site.site_url,
                       'site_header': admin.site.site_header,
                       'site_title': admin.site.site_title,
                       'conflicts': conflicts,
                       'menu': menu_name,
                       'title': 'Export/Import Menus'})

    @staticmethod
    def generate_export(menu, complete_cb=None, update_progress_cb=None):
        menu_obj = menu if not isinstance(menu, str) else Menu.objects.get(name=menu)
        menu_dict = menu_obj.to_dict()
        filtered_assets = Asset.objects.filter(uuid__in=menu_dict['assets'])
        progress = 0
        total_assets = filtered_assets.count()
        assets = []

        def increment_progress():
            nonlocal progress
            if not update_progress_cb:
                return
            progress += 1
            update_progress_cb(progress, total_assets)

        for asset in filtered_assets:
            asset_dict = generate_structure.from_database(asset, True)[0]
            asset_dict['name'] = asset.name
            asset_dict['uuid'] = str(asset.uuid)
            asset_dict['customizations'] = [customization.name for customization in asset.customizations.all()]
            prepare_asset_exports(asset, asset_dict)
            assets.append(asset_dict)
            increment_progress()

        menu_dict['assets'] = assets
        content = json.dumps(menu_dict, ensure_ascii=False, indent=4, separators=(',', ': '))
        if complete_cb:
            complete_cb(f'menu-{menu_obj.name}.json', content)
        else:
            return response_attachment(content, f'menu-{menu_obj.name}.json', 'application/json')


class MenuFilter(SimpleListFilter):
    title = 'Menu'
    parameter_name = 'menu'

    def lookups(self, request, model_admin):
        return ((menu.name, menu.name) for menu in Menu.objects.all())

    def queryset(self, request, queryset):
        if self.value():
            menu = Menu.objects.filter(name__iexact=self.value()).first()
            if menu:
                node_ids = menu.all_node_ids
                return queryset.filter(id__in=node_ids)
        return queryset


@admin.register(MenuNode)
class MenuNodeAdmin(CMSAdmin):
    list_display = ('name', 'menu', 'url', 'condition', 'authentication', 'touched', 'parent_node', 'parent_menu')
    search_fields = ('name', 'asset__name')
    list_filter = (MenuFilter, 'enabled', 'authentication')
    form = MenuNodeChangeForm
    fields = ('name', 'url', 'new_window', 'icon', 'order', 'condition', 'authentication', 'is_global', 'available',
              'enabled', 'touched', 'parent_node', 'parent_menu', 'menu')
    formfield_overrides = {
        models.ManyToManyField: {'widget': FilteredSelectMultiple(verbose_name='', is_stacked=False)},
    }
    actions = ('delete_selected',)

    def menu(self, obj):
        menu = obj.get_parent()
        return format_html(f'<a href="{reverse("admin:cms_menu_change", args=(menu.id,))}">{menu.name}</a>')

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        transaction.on_commit(MENU_CACHE.clear_cache)

    def save_model(self, request, obj, form, change):
        if obj.pk:
            old_obj = MenuNode.objects.get(pk=obj.pk)
            parent = old_obj.get_parent()
            if form.cleaned_data['parent_node']:
                obj.parent_menu = None
            else:
                obj.parent_menu = parent
        return super().save_model(request, obj, form, change)


class LicenseTypeAdmin(CMSAdmin):
    list_display = ('name', 'title', 'deactivations_allowed')
    list_display_links = ('name', 'title')
    list_filter = ('deactivations_allowed',)


@admin.register(ZendeskSection)
class ZendeskSectionAdmin(CMSAdmin):
    search_fields = ['title', 'id', 'section_id']
    autocomplete_fields = ['menu_node', 'parent_section']


@admin.register(ZendeskArticle)
class ZendeskArticleAdmin(CMSAdmin):
    autocomplete_fields = ['section', 'asset', 'menu_node']


admin.site.register(LicenseType, LicenseTypeAdmin)
admin.site.register(ZendeskSite, CMSAdmin)
admin.site.register(ZendeskCategory, CMSAdmin)
admin.site.register(ZendeskArticleLabel, CMSAdmin)


@admin.register(SpecialStructure)
class SpecialStructAdmin(CMSAdmin):
    list_display = ('name',)


@admin.register(CustomClient)
class CustomClientAdmin(admin.ModelAdmin):
    autocomplete_fields = ['created_by']
    readonly_fields = ['last_modified', 'created_on']


@admin.register(Flag)
class FlagAdmin(WaffleFlagAdmin):
    pass

class ReadOnlyAPIFileInline(admin.TabularInline):
    model = ReadOnlyAPIFile


@admin.register(ReadOnlyAPI)
class ReadOnlyAPIAdmin(CMSAdmin):
    inlines = [ReadOnlyAPIFileInline]

