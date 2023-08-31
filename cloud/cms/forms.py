from json.decoder import JSONDecodeError
from django import forms
from django.db.models import Q
from django.core.validators import RegexValidator
from django.contrib.admin import site
from django.contrib.admin.widgets import FilteredSelectMultiple, ForeignKeyRawIdWidget
from django.db.models import When, Case, QuerySet, ForeignKey, SET_NULL
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.safestring import mark_safe
from dal import autocomplete
from itertools import chain
from urllib.parse import quote

from api.models import Account
from cms.models import *
from cms.controllers.modify_db import are_asset_datarecords_unique, GUID_REGEXP
from cms.controllers.special_structures import SpecialStructures
from cms.widgets import BootstrapMultiSelect


BYTES_TO_MEGABYTES = 1048576.0
GUID_DESCRIPTION = "<br>GUID format is '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}' using hexadecimal " \
                                "characters (0-9, a-f, A-F)"


def convert_meta_to_description(meta):
    meta_to_plain = {
        "char_limit": "Character limit: %s",
        "format": "Format:  %s",
        "width": "Width: %spx",
        "width_le": "Width: not greater than %spx",
        "width_ge": "Width: not less than %spx",
        "height": "Height: %spx",
        "height_le": "Height: not greater than %spx",
        "height_ge": "Height: not less than %spx",
        "size": "Size limit: %s MB",
    }
    converted_msg = ""
    if 'size' in meta:
        meta['size'] = round(meta['size'] / BYTES_TO_MEGABYTES, 2)
    for meta_item in meta_to_plain:
        if meta_item in meta:
            value = meta[meta_item]

            if isinstance(value, list):
                value = ", ".join(value)
            converted_msg += "<br>" + meta_to_plain[meta_item] % value

    return converted_msg


def get_languages_list(*, customization=None, request=None):
    def modify_default_language(language):
        is_default = ""
        if language[0] == default_language_code:
            is_default = " - default"
        return language[0], f"{language[0]} - {language[1]}{is_default}"

    customization = Customization.objects.get(name=customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get()))
    default_language_code = customization.default_language.code
    return map(modify_default_language, customization.languages.values_list('code', 'name'))


def get_branding_shortcuts(customization=None, request=None):
    # Todo. Can it be called without customization?
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    cloud_portal = Asset.objects.get(customizations__name=customization,
                                     asset_type=get_cloud_portal_asset(customization=customization).asset_type)
    branding_context_structures = branding_context.datastructure_set.all() if (
        branding_context := Context.objects.filter(
            name='branding', asset_type=get_cloud_portal_asset(customization=customization).asset_type).first()
    ) else []
    brand_structures = [ds for ds in branding_context_structures if 'shortcut' in ds.meta_settings]
    hidden_branding_structures = [ds for ds in DataStructure.objects.filter(
        context__asset_type__type=AssetType.ASSET_TYPES.cloud_portal,
        context__hidden=False, context__is_global=True, name__startswith='%', context__name__in=['settings', 'branding'],
        type__in=[DataStructure.DATA_TYPES.text, DataStructure.DATA_TYPES.html, DataStructure.DATA_TYPES.select]
    ) if 'shortcut' not in ds.meta_settings]
    vals = DataStructure.find_actual_values(brand_structures + hidden_branding_structures, asset=cloud_portal)
    special_structures = SpecialStructures()

    mapper = createMapper(cloud_portal, vals, special_structures)

    brands = mapper(brand_structures, lambda structure: structure['shortcut'])
    hidden_brands = mapper(hidden_branding_structures, lambda structure: not structure['shortcut'] and not structure['hidden'])

    return brands, hidden_brands

def get_restricted_keywords(*, customization=None, request=None):
    '''Returns list of keywords that should be restricted from use in assets
    '''
    customization = customization or getattr(request, 'CUSTOMIZATION', customization_ctx.get())
    cloud_portal = Asset.objects.get(customizations__name=customization,
                                     asset_type=get_cloud_portal_asset(customization=customization).asset_type)
    branding_context = Context.objects.get(name='branding', asset_type=get_cloud_portal_asset(customization=customization).asset_type)
    restricted_struct = list(branding_context.datastructure_set.filter(name="Restricted"))
    vals = DataStructure.find_actual_values(restricted_struct, asset=cloud_portal)


    def get_restricted(vals):
        return list(chain(*[vals[ds] for ds in restricted_struct]))


    restricted = get_restricted(vals)

    if customization != 'default':
        default_cloud_portal = Asset.objects.get(customizations__name='default',
                                     asset_type=get_cloud_portal_asset(customization='default').asset_type)
        default_vals = DataStructure.find_actual_values(restricted_struct, asset=default_cloud_portal)
        restricted += get_restricted(default_vals)

    return restricted

def createMapper(cloud_portal, vals, special_structures):
    def mapper(structures_to_map, special_structure_filter):
        mapped = [
            ({'name': ds.name, 'label': ds.label, 'description': ds.description}, vals[ds])
            for ds in structures_to_map
        ]
        if special_structure_filter:
            mapped.extend([(
                {'name': name, 'label': structure['label'], 'description': structure['description']},
                structure['function'](cloud_portal))
                for name, structure in special_structures.function_dict.items() if special_structure_filter(structure)
            ])
        return mapped
    return mapper


def generate_branding_variables(datastructure, branding_shortcuts=None, hidden_branding_shortcuts=None, *, customization=None, request=None):
    if not (branding_shortcuts and hidden_branding_shortcuts):
        branding_shortcuts, hidden_branding_shortcuts = get_branding_shortcuts(customization=customization, request=request)
    return render_to_string(
        'cms/widgets/branding_variables.html',
        context={'brands': branding_shortcuts, 'hidden_brands': hidden_branding_shortcuts, 'datastructure': datastructure}
    )


# CustomContextForm helpers
def datastructure_is_disabled(datastructure, asset, context, language, can_edit_advanced):
    is_published = asset.version_id() > 0
    # If the data_structure is protected and published require users to have the edit advanced permission
    disabled = not can_edit_advanced and (datastructure.protected and is_published or datastructure.advanced)
    # Disable if datastructure is translatable and language is not default
    return disabled or (not datastructure.translatable and language != asset.default_language
                            and context.translatable)

def generate_description(datastructure, branding_shortcuts, hidden_branding_shortcuts, *, customization=None, request=None):
    ds_description = datastructure.description

    if datastructure.meta_settings:
            ds_description += convert_meta_to_description(datastructure.meta_settings)
            if 'brand_vars' in datastructure.meta_settings and datastructure.meta_settings['brand_vars']:
                ds_description += generate_branding_variables(datastructure, branding_shortcuts, hidden_branding_shortcuts,customization=customization, request=request)

    if datastructure.type == DataStructure.DATA_TYPES.guid:
            ds_description += GUID_DESCRIPTION

    return ds_description

def get_widget(datastructure: DataStructure):
    type = datastructure.type
    if type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array]:
        return forms.Textarea()
    if type == DataStructure.DATA_TYPES.html:
        return forms.Textarea(
                attrs={'cols': 120, 'rows': 25, 'class': 'tinymce', 'placeholder': datastructure.placeholder})
    if type == DataStructure.DATA_TYPES.long_text:
        return forms.Textarea(attrs={'placeholder': datastructure.placeholder})
    if type == DataStructure.DATA_TYPES.multiselect:
        return forms.CheckboxSelectMultiple(attrs={'class': 'nodots'})
    if type == DataStructure.DATA_TYPES.foreign_key:
        foreign_model, filters = datastructure.get_foreign_key_config()
        temp_field = ForeignKey(foreign_model, on_delete=SET_NULL)
        temp_field.model = Context
        temp_field.remote_field.limit_choices_to = filters
        return ForeignKeyRawIdWidget(rel=temp_field.remote_field, admin_site=site)

    return forms.TextInput(attrs={'size': 80, 'placeholder': datastructure.placeholder})


def get_record_value(datastructure, asset, language):
    record_value = datastructure.find_actual_value(asset, language, draft=True)
    if datastructure.type in [DataStructure.DATA_TYPES.object, DataStructure.DATA_TYPES.array]:
        if record_value == "":
            record_value = {} if datastructure.type is DataStructure.DATA_TYPES.object else []
        else:
            record_value = json.dumps(record_value, indent=4, separators=(',', ': '))

    if datastructure.has_image_field or datastructure.has_file_field:
        record_value = record_value or datastructure.placeholder or datastructure.default

    if datastructure.type in [DataStructure.DATA_TYPES.select, DataStructure.DATA_TYPES.multiselect]:
        for i in range(len(record_value)):
                if type(record_value[i]) == dict:
                    record_value[i] = record_value[i]['label']

    if datastructure.type == DataStructure.DATA_TYPES.check_box:
        record_value = 'on' if record_value else ''

    return record_value

def get_choices(datastructure):
    options = datastructure.meta_settings.get('options', [])
    choices = []
    for choice in options:
        if type(choice) == dict:
            choices.append((choice['label'], choice['label']))
        else:
            choices.append((choice, choice))
    return choices

class CustomContextForm(forms.Form):
    language = forms.ChoiceField(
        widget=forms.Select, label="Language")

    def __init__(self, *args, request, **kwargs):
        self.order = kwargs.pop('order', None)
        self.request = request
        super(CustomContextForm, self).__init__(*args, **kwargs)  # 'send_cloud_notification'
        self.fields['language'].choices = get_languages_list(request=self.request)
        self.fieldsets = {}
        self.branding_shortcuts, self.hidden_branding_shortcuts = get_branding_shortcuts(request=request)

    def remove_language(self):
        super(CustomContextForm, self)
        self.fields.pop('language')

    def add_fields(self, asset, context, language, user):
        can_edit_advanced = UserGroupsToAssetPermissions.check_edit_advanced(user, asset)
        data_structures: QuerySet[DataStructure] = context.datastructure_set.all()
        fieldsets = {None: []}
        if self.order:
            data_structures = data_structures.order_by(Case(
                When(**{self.order: ''}, then='name'),
                default=self.order
            ))

        if len(data_structures) < 1:
            return

        if not context.translatable:
            self.remove_language()
        cur_version = asset.version_id()
        data_records = DataStructure.find_actual_values(
            data_structures, asset=asset, language=language, draft=True, as_records=True)
        for ds in data_structures:
            label = ds.label if ds.label else ds.name
            description = generate_description(
                ds, self.branding_shortcuts, self.hidden_branding_shortcuts, request=self.request)
            ds_language = language
            if not ds.translatable:
                if context.translatable:
                    description += "<br>This record is the same for every language."
                ds_language = None
            if isinstance(data_records.get(ds), DataRecord):
                if data_records.get(ds).version_id is None:
                    description += '<br><span class="label label-warning">DRAFT</span>'
                elif data_records.get(ds).version_id > cur_version:
                    description += '<br><span class="label label-warning">PENDING</span>'
                elif data_records.get(ds).version_id and \
                        not data_records.get(ds).version.assetcustomizationreview_set.exists():
                    description += '<br><span class="label label-warning">PENDING. NO REVIEW</span>'


            record_value = get_record_value(ds, asset, ds_language)
            disabled = datastructure_is_disabled(ds, asset, context, language, can_edit_advanced)
            widget_type = get_widget(ds)

            self.__generate_form_field(ds, label, description, record_value, widget_type, disabled)

        if self.fields.get('language', None):
            fieldsets[None].append('language')

        for data_structure in data_structures:
            if data_structure.name in self.fields:
                fieldset = data_structure.fieldset or None
                if fieldset in fieldsets:
                    fieldsets[fieldset].append(data_structure.name)
                else:
                    fieldsets[fieldset] = [data_structure.name]

        if not fieldsets[None]:
            del fieldsets[None]

        self.fieldsets = fieldsets

    def __generate_form_field(self, ds: DataStructure, label, description, record_value, widget, disabled):
        if ds.has_image_field or ds.has_file_field:
            field = forms.ImageField if ds.has_image_field else forms.FileField
            self.fields[ds.name] = field(label=label,
                                         help_text=description,
                                         initial=record_value,
                                         required=False,
                                         disabled=disabled)
            if ds.meta_settings and 'size' in ds.meta_settings:
                    file_size = ds.meta_settings['size'] * BYTES_TO_MEGABYTES
                    self.fields[ds.name].widget.attrs['size'] = file_size
            return

        if ds.type in [DataStructure.DATA_TYPES.select, DataStructure.DATA_TYPES.multiselect]:
            choices = get_choices(ds)
            field = forms.MultipleChoiceField if ds.type == DataStructure.DATA_TYPES.multiselect else forms.ChoiceField
            field_widget = widget if ds.type == DataStructure.DATA_TYPES.multiselect else None
            self.fields[ds.name] = field(label=label,
                                         help_text=description,
                                         initial=record_value,
                                         choices=choices,
                                         required=False,
                                         disabled=disabled,
                                         widget=field_widget)
            return

        if ds.type == DataStructure.DATA_TYPES.check_box:
            self.fields[ds.name] = forms.BooleanField(label=label,
                                                      help_text=description,
                                                      initial=record_value,
                                                      required=False,
                                                      disabled=disabled)
            return

        if ds.type == DataStructure.DATA_TYPES.foreign_key:
            foreign_model, filters = ds.get_foreign_key_config()
            self.fields[ds.name] = forms.ModelChoiceField(
                label=label,
                help_text=description,
                initial=record_value,
                required=False,
                disabled=disabled,
                queryset=foreign_model.objects.filter(**filters),
                widget=widget
            )
            return

        validator = RegexValidator('')
        pattern = None
        char_limit = None
        if ds.type in [DataStructure.DATA_TYPES.text, DataStructure.DATA_TYPES.long_text]:
            if 'regex' in ds.meta_settings:
                pattern = ds.meta_settings['regex']
                if not pattern.endswith('$'):
                    pattern = f'{pattern}$'
                validator = RegexValidator(pattern)
            if 'char_limit' in ds.meta_settings:
                char_limit = ds.meta_settings['char_limit']
        elif ds.type == DataStructure.DATA_TYPES.guid:
            pattern = GUID_REGEXP

        self.fields[ds.name] = forms.CharField(required=not ds.optional,
                                                            label=label,
                                                            help_text=description,
                                                            initial=record_value,
                                                            widget=widget,
                                                            disabled=disabled,
                                                            validators=[validator])
        if pattern:
            self.fields[ds.name].widget.attrs['pattern'] = pattern
            pattern_description = f'Regex pattern: {pattern}'
            self.fields[ds.name].widget.attrs['title'] = pattern_description
            self.fields[ds.name].help_text += f'<br>{pattern_description}'
        if char_limit:
            self.fields[ds.name].widget.attrs['maxlength'] = char_limit

class AssetSettingsForm(forms.Form):
    file = forms.FileField(
        label="File",
        help_text="Archive with static files and images for content or structure.json file.",
        required=True
    )

    ASSET_ACTIONS = (
            ('merge_with_db', mark_safe('Generate structure using archive and db<br>'
                              '<span class="radio-hint">Upload a zip archive to generate a structure.json file that uses values of the asset from the db and archive<br>'
                              'If a value doesn\'t exist in the db it takes the value from the zip archive.</span>')),
            ('update_content', mark_safe('Upload content files for this asset<br>'
                                         '<span class="radio-hint">Upload a zip archive to update content such as images for the asset.</span>')),
            ('update_asset_by_json', mark_safe('Update data records for this asset from a json file<br>'
                                               '<span class="radio-hint">Upload a structure.json to update the data records for the current asset</span>'))
    )

    ASSET_TYPE_ACTIONS = (
            ('generate_json', mark_safe('Generate structure template based on archive<br>'
                                        '<span class="radio-hint">Upload a zip archive to generate a structure.json file from the archive</em>')),
            ('update_structure',
             mark_safe(
                 'Update CMS structure and default values based on archive with structure.json and asset_type template, '
                 'or upload just the structure.json<br>'
                 '<span class="radio-hint">If you upload only structure.json it will only modify the structure of the asset_type.<br>'
                 'If you upload an archive with the structure.json in the base directory it will update contexts and datastructure in the asset_type.</span>')),
            ('import_assets_from_json', mark_safe('Create assets and update data records for existing assets from a json file<br>'
                                                  '<span class="radio-hint">Upload a structure.json to import new assets or update the data records for existing assets</span>')),
    )

    action = forms.ChoiceField(
        widget=forms.RadioSelect,
        required=True,
        choices=[]
    )

    force = forms.BooleanField(
        label="Force Update",
        help_text="Updates existing records with values from JSON when conflicts exist.",
        required=False
    )

    def __init__(self, *args, **kwargs):
        is_asset = kwargs.pop('target_class', Asset) is Asset
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        self.fields['action'].choices = AssetSettingsForm.ASSET_ACTIONS if is_asset else AssetSettingsForm.ASSET_TYPE_ACTIONS

        if user and user.is_superuser and not is_asset:
            self.fields['action'].choices += ('import_assets_from_json_publish',
                                              mark_safe('Create assets and update data records for existing assets from a json file and publish/accept reviews<br>'
                                                        '<span class="radio-hint">Upload a structure.json to import new assets or update the data records for existing assets. Also submits and accepts reviews</span>')),


def is_valid_hostname(hostname):
    if len(hostname) > 255:
        return False
    if hostname[-1] == ".":
        hostname = hostname[:-1]
    allowed = re.compile("(?!-)[A-Z\d-]{1,63}(?<!-)$", re.IGNORECASE)
    return all(allowed.match(x) for x in hostname.split("."))


class AssetForm(forms.ModelForm):
    publish_all_customizations = forms.BooleanField(required=False, label='Publish to all Customizations', initial=True)
    menu = forms.ModelChoiceField(queryset=Menu.objects.all(), label='Parent Menu', required=False)

    class Meta:
        model = Asset
        exclude = []
        widgets = {
            'created_by': autocomplete.ModelSelect2(url='account-autocomplete',
                                                    attrs={
                                                        # Set some placeholder
                                                        'data-placeholder': 'Email ...',
                                                        # Only trigger autocomplete after 2 characters have been typed
                                                        'data-minimum-input-length': 2
                                                    }),
            'customizations': FilteredSelectMultiple('customizations', False)
        }

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        # Do the normal form initialisation.
        super(AssetForm, self).__init__(*args, **kwargs)
        self.publish_all = False
        if self.instance.asset_type and self.instance.asset_type.single_customization:
            # used for removing customizations that are already in use from the multiple choice field,
            if 'customizations' in [field.name for field in self.visible_fields()]:
                asset_type_customizations = self.instance.asset_type.get_customizations(self.instance)\
                    .exclude(customizations__name=self.instance.customizations.first())
                self.fields['customizations'].queryset = Customization.objects.all(). \
                    exclude(name__in=asset_type_customizations)

        if self.user and not self.user.is_superuser and not self.instance.pk:
            self.fields['asset_type'].queryset = AssetType.objects.exclude(advanced=True)
            self.fields['created_by'] = forms.ModelChoiceField(
                queryset=Account.objects.filter(id=self.user.id), empty_label=None
            )
            self.fields['customizations'].queryset = Customization.objects.filter(name__in=self.user.customizations)
            if self.fields['customizations'].queryset.count() == 0:
                self.publish_all = True
                self.fields['customizations'].widget = forms.HiddenInput()
                self.fields['publish_all_customizations'].widget = forms.HiddenInput()

    def clean(self):
        cleaned_data = super().clean()
        customizations = cleaned_data.get('customizations')
        asset_type = cleaned_data.get('asset_type')
        if self.instance.pk:
            if not customizations:
                customizations = self.instance.customizations.all()
            if not asset_type:
                asset_type = self.instance.asset_type

        if ('publish_all_customizations' in cleaned_data and cleaned_data['publish_all_customizations']
                or self.publish_all) and not asset_type.single_customization:
            cleaned_data['customizations'] = Customization.objects.all()
        else:
            num_customizations = len(customizations)
            if asset_type.single_customization:
                if num_customizations > 1:
                    raise forms.ValidationError(f"Too many customizations selected for "
                                                f"{AssetType.ASSET_TYPES[asset_type.type]}.")
                if customizations.filter(name__in=asset_type.get_customizations(self.instance)).exists():
                    raise forms.ValidationError(f"Customization is already used for a "
                                                f"{AssetType.ASSET_TYPES[asset_type.type]} asset.")

        unique, error_field = are_asset_datarecords_unique(self.instance, customizations)
        if not unique:
            raise forms.ValidationError(f'Cannot apply customizations because there is a uniqueness conflict '
                                        f'on the {error_field.name} field')

        return cleaned_data


class CustomizationForm(forms.ModelForm):
    class Meta:
        model = Customization
        exclude = []
        widgets = {
            'languages': FilteredSelectMultiple('languages', False)
        }

    def __init__(self, *args, **kwargs):
        super(CustomizationForm, self).__init__(*args, **kwargs)

        if self.instance.pk:
            self.fields['parent'].queryset = Customization.objects.exclude(id=self.instance.id) \
                .exclude(id__in=self.instance.get_children_ids(self.instance))

    def clean_parent(self):
        data = self.cleaned_data['parent']
        if data and not Customization.objects.exclude(id__in=self.instance.get_children_ids(self.instance)). \
                exclude(id=self.instance.id).filter(id=data.id).exists():
            raise ValueError('Invalid customization was selected')
        return data

    def clean_additional_hosts(self):
        data = self.cleaned_data['additional_hosts']
        if not data:
            return data
        if not isinstance(data, list):
            raise ValidationError(f"Value must be a valid json array. Got {type(data): {data}.}")
        cleaned = [host.strip().lower() for host in data]
        if len(cleaned) != len(data):
            raise ValidationError(f"Not a valid array of strings: '{data}'.")
        invalid = [host for host in cleaned if not is_valid_hostname(host)]
        if invalid:
            raise ValidationError(f"Some hosts are invalid: {', '.join(invalid)}.")
        return cleaned


class LanguageForm(forms.ModelForm):
    customizations = forms.ModelMultipleChoiceField(
        queryset=Customization.objects.all(),
        widget=FilteredSelectMultiple('customizations', False)
    )

    class Meta:
        model = Language
        exclude = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields['customizations'].initial = self.instance.customization_set.all()


class ContributorAgreementForm(forms.ModelForm):
    class Meta:
        model = ContributorAgreement
        exclude = []
        widgets = {
            'user': autocomplete.ModelSelect2(url='account-autocomplete',
                                              attrs={
                                                  # Set some placeholder
                                                  'data-placeholder': 'Email ...',
                                                  # Only trigger autocomplete after 2 characters have been typed
                                                  'data-minimum-input-length': 2
                                              })
        }


class MenuChangeForm(forms.ModelForm):
    customization_view = forms.ChoiceField(required=False, help_text='Make sure to save any changes before changing the view')
    admin_config = forms.CharField(widget=forms.Textarea,
        help_text='Configures which fields to display on inline menu nodes. Should be a dict with properties, header, details, and advanced. Each contains an array of fields to show.')
    class Meta:
        model = Menu
        exclude = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            customization_choices = tuple((name, name) for name in self.user_customizations)
            if len(self.user_customizations) > 1:
                customization_choices = (('all', 'All'),) + customization_choices
            self.fields['customization_view'].choices = customization_choices
            self.initial['customization_view'] = self.current_customization.name if self.current_customization != 'all' else 'all'

    def clean_admin_config(self):
        config = self.cleaned_data['admin_config']
        updated_config = {'header': [], 'details': [], 'advanced': []}
        invalid_config = 'Invalid config structure:'
        valid_fields = [field.name for field in MenuNode._meta.fields] + ['enabled', 'related_assets', 'permissions', 'preview', 'zendesk_record', 'is_global']
        validation_errors = []
        try:
            parsed_config = json.loads(config)
            for key in dict.keys(updated_config):
                field_value = parsed_config.get(key, [])
                is_list = isinstance(field_value, list)
                non_strings = list(filter(lambda val: not isinstance(val, str), field_value))
                if is_list and not len(non_strings):
                    invalid_values = list(filter(lambda field_name: field_name not in valid_fields, field_value))
                    if len(invalid_values):
                        for value in invalid_values:
                            validation_errors += [f'Invalid values for property "{key}": {invalid_values}']

                    updated_config[key] = field_value
                else:
                    if invalid_config not in validation_errors:
                        validation_errors += [invalid_config]
                    validation_errors += [f'Invalid value type on property "{key}": {field_value}']
        except JSONDecodeError:
            validation_errors += ['Invalid JSON format']

        if validation_errors:
            raise ValidationError(validation_errors)
        return json.dumps(updated_config)


class MenuNodeChangeForm(forms.ModelForm):
    menu = forms.ModelChoiceField(queryset=Menu.objects.all(), required=True, widget=forms.HiddenInput)

    class Meta:
        widgets = {
            'parent_node': autocomplete.ModelSelect2(
                url='menu_node_autocomplete', attrs={
                    'data-placeholder': 'Choose node or leave blank for root',
                    'data-minimum-input-length': 2
                },
                forward=['menu']
            ),
        },
        model = MenuNode
        exclude = []

    class Media:
        js = ('js/menuNode.js',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        parent = self.instance.get_parent()
        if parent is not None:
            self.fields['menu'].initial = parent
            node_ids = parent.all_node_ids
            self.fields['parent_node'].queryset = MenuNode.objects.filter(id__in=node_ids)
            self.fields['parent_menu'] = forms.ModelChoiceField(queryset=Menu.objects.all(), widget=forms.HiddenInput, required=False)
        else:
            # if parent is none, that means we are creating a new MenuNode.
            # In this case, hide the parent_node field and let the user choose a menu to attach the node to with parent_menu field
            # menu.required is set to false for creating a new node to avoid a validation error, it will be overwritten on submit by the value of parent_menu
            self.fields['parent_menu'].required = True
            self.fields['menu'].required = False
            self.fields['parent_node'] = forms.ModelChoiceField(queryset=MenuNode.objects.none(), widget=forms.HiddenInput, required=False)

    def clean_enabled(self):
        enabled = self.cleaned_data['enabled']
        available = self.cleaned_data['available']
        is_global = self.cleaned_data['is_global']
        available_ids = available.values_list('id', flat=True)
        if not is_global:
            if enabled.filter(~Q(id__in=available_ids)):
                raise ValidationError('Cannot enable customizations for which the node is not available. Please make sure available customizations are set first')
        return enabled


class MenuNodeInlineForm(forms.ModelForm):
    class Meta:
        model = MenuNode
        exclude = []
        widgets = {
            'enabled': BootstrapMultiSelect(field_name='enabled', options={
                'includeSelectAllOption': True,
                'maxHeight': 300,
                'selectAllText': 'All',
                'selectAllNumber': True,
                'enableFiltering': True,
                'nonSelectedText': 'Disabled',
                'allSelectedText': 'All enabled',
                'selectAllJustVisible': True,
            }),
            'permissions': autocomplete.ModelSelect2Multiple(
                url='permission-autocomplete', attrs={
                    'data-placeholder': 'None required',
                    'data-minimum-input-length': 2
                }
            ),
            'related_assets': autocomplete.ModelSelect2Multiple(
                url='asset_autocomplete', attrs={
                    'data-placeholder': 'Select related articles',
                    'data-minimum-input-length': 2
                }
            ),
            'asset': autocomplete.ModelSelect2(
                url='asset_autocomplete', attrs={
                    'data-placeholder': 'Select article',
                    'data-minimum-input-length': 2
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        parent_menu = self.instance.get_parent()
        custom_preview_url = parent_menu and quote(parent_menu.node_preview_url)
        self.fields['asset'].widget.can_add_related = True
        self.fields['asset'].widget.get_related_url = lambda *_: (
            reverse('admin:pages_custom_preview', kwargs={'asset_id': '__fk__', 'custom_preview': custom_preview_url}) if custom_preview_url
            else reverse('admin:pages', kwargs={'asset_id': '__fk__'}))
        if self.current_customization == 'all':
            self.fields['enabled'].queryset = Customization.objects.filter(name__in=self.user_customizations).order_by('name')
            self.fields['enabled'].widget.can_add_related = False
            self.fields['enabled'].help_text = 'Choose which customizations this menu item should be enabled in'
            if self.instance.asset:
                self.initial['enabled'] = self.instance.asset.customizations.all() & self.fields['enabled'].queryset
        else:
            enabled = False
            if self.instance.asset:
                enabled = self.instance.asset.customizations.filter(
                    id=self.current_customization.id
                ).exists()
            elif self.instance.pk and self.instance.enabled.filter(id=self.current_customization.id):
                enabled = True
            self.fields['enabled'] = forms.BooleanField(required=False)
            self.initial['enabled'] = enabled
        if 'permissions' in self.fields:
            self.fields['permissions'].label_from_instance = lambda obj: obj.name
            self.fields['permissions'].help_text = 'Choose which permissions are required to see this menu item'
        if 'related_assets' in self.fields:
            self.fields['related_assets'].help_text = 'Use to add related articles for knowledgebase pages'

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get('asset', None):
            old_enabled = set(cleaned_data['asset'].customizations.all().values_list('name', flat=True))
        elif self.instance.pk:
            old_enabled = set(self.instance.enabled.all().values_list('name', flat=True))
        else:
            old_enabled = set()

        if self.current_customization == 'all':
            val = set(cleaned_data['enabled'].values_list('name', flat=True))
            possible_customizations = set(self.user_customizations)
        else:
            val = {self.current_customization.name} if cleaned_data['enabled'] else set()
            possible_customizations = {self.current_customization.name}

        new_enabled = old_enabled.difference(possible_customizations)

        new_enabled = new_enabled.union(set(val))
        new_enabled = Customization.objects.filter(name__in=new_enabled)
        cleaned_data['enabled'] = new_enabled
        return cleaned_data


class MenuPortForm(forms.Form):
    menu = forms.ModelChoiceField(
        queryset=Menu.objects.filter(allow_porting=True),
        help_text='Enable "Allow porting" on a menu for it to be available here.'
    )

    def __init__(self, *args, **kwargs):
        port_type = kwargs.pop('port_type', 'export')
        super().__init__(*args, **kwargs)
        self.fields['menu'].label_from_instance = lambda obj: obj.name
        if port_type == 'import':
            self.fields['file'] = forms.FileField(required=False)
            self.fields['force'] = forms.BooleanField(
                label="Force Update",
                help_text="Updates existing records with values from JSON when conflicts exist.",
                required=False
            )
            self.fields['accept_reviews'] = forms.BooleanField(
                label="Auto Accept",
                help_text="Auto accept reviews for all customizations",
                required=False
            )


class ZendeskImportForm(forms.Form):
    menu = forms.ModelChoiceField(
        queryset=Menu.objects.filter(allow_porting=True),
        help_text='Enable "Allow porting" on a menu for it to be available here.'
    )
    domain = forms.CharField(required=False, help_text='Ex: support.networkoptix.com')
    zendesk_category_name = forms.CharField(required=False, help_text='Ex: Develop with Nx Meta')
    api_token = forms.CharField(required=False, help_text='Credentials are optional if zendesk is public')
    zendesk_email = forms.CharField(required=False)
    zendesk_password = forms.CharField(required=False, widget=forms.PasswordInput)

    def __init__(self, *args, **kwargs):
        if args and 'import' in args[0]:
            self.importing = True
        else:
            self.importing = False
        super().__init__(*args, **kwargs)

    def clean(self):
        data = super().clean()
        if self.importing:
            if not data['domain']:
                raise ValidationError('Domain required if importing')

            if not data['zendesk_category_name']:
                raise ValidationError('Zendesk Category Name required if importing')
        return data


class QASettingsForm(forms.Form):
    session_age = forms.IntegerField(help_text=f'Lifetime of new authenticated sessions in seconds. Default: {settings._AUTHENTICATED_SESSION_COOKIE_AGE} (1 month)', initial=settings._AUTHENTICATED_SESSION_COOKIE_AGE)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            cache_val = caches['testing'].get(name)
            field.initial = cache_val if cache_val is not None else field.initial

    def update_cache(self):
        for name, val in self.cleaned_data.items():
            caches['testing'].set(name, val)
