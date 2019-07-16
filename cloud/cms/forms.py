import json
from django import forms
from django.core.validators import RegexValidator
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.template.loader import render_to_string
from .models import *
from api.models import Account

from dal import autocomplete

from cloud import settings

BYTES_TO_MEGABYTES = 1048576.0


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


def get_languages_list():
    def modify_default_language(language):
        is_default = ""
        if language[0] == default_language_code:
            is_default = " - default"
        return language[0], "{} - {}{}".format(language[0], language[1], is_default)

    customization = Customization.objects.get(name=settings.CUSTOMIZATION)
    default_language_code = customization.default_language.code
    return map(modify_default_language, customization.languages.values_list('code', 'name'))


def generate_branding_variables(datastructure):
    cloud_portal = Product.objects.get(customizations__name=settings.CUSTOMIZATION,
                                       product_type__type=ProductType.PRODUCT_TYPES.cloud_portal)
    branding_context = Context.objects.get(name='branding', product_type__type=ProductType.PRODUCT_TYPES.cloud_portal)

    brands = [
        (ds, ds.find_actual_value(product=cloud_portal))
        for ds in branding_context.datastructure_set.all()
        if 'shortcut' in ds.meta_settings
    ]

    return render_to_string(
        'cms/widgets/branding_variables.html', context={'brands': brands, 'datastructure': datastructure}
    )


class CustomContextForm(forms.Form):
    language = forms.ChoiceField(
        widget=forms.Select, label="Language")

    def __init__(self, *args, **kwargs):
        super(CustomContextForm, self).__init__(*args, **kwargs)  # 'send_cloud_notification'
        self.fields['language'].choices = get_languages_list()

    def remove_language(self):
        super(CustomContextForm, self)
        self.fields.pop('language')

    def add_fields(self, product, context, language, user):
        data_structures = context.datastructure_set.all()

        if len(data_structures) < 1:
            return

        if not context.translatable:
            self.remove_language()

        is_published = product.version_id() > 0
        can_edit_advanced = user.is_superuser or user.has_perm('cms.edit_advanced')

        for data_structure in data_structures:
            ds_label = data_structure.label if data_structure.label else data_structure.name

            ds_description = data_structure.description

            if data_structure.meta_settings:
                ds_description += convert_meta_to_description(data_structure.meta_settings)
                if 'brand_vars' in data_structure.meta_settings and data_structure.meta_settings['brand_vars']:
                    ds_description += generate_branding_variables(data_structure)

            if data_structure.type == DataStructure.DATA_TYPES.guid:
                ds_description += "<br>GUID format is '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXX}' using hexadecimal " \
                                  "characters (0-9, a-f, A-F)"

            ds_language = language
            if not data_structure.translatable:
                if context.translatable:
                    ds_description += "<br>This record is the same for every language."
                ds_language = None

            record_value = data_structure.find_actual_value(product, ds_language, draft=True)

            widget_type = forms.TextInput(attrs={'size': 80, 'placeholder': data_structure.default})

            # If the data_structure is protected and published require users to have the edit advanced permission
            disabled = not can_edit_advanced and (data_structure.protected and is_published or data_structure.advanced)

            if data_structure.type in [DataStructure.DATA_TYPES.long_text,
                                       DataStructure.DATA_TYPES.object,
                                       DataStructure.DATA_TYPES.array]:
                widget_type = forms.Textarea(attrs={'placeholder': data_structure.default})

            if data_structure.type == DataStructure.DATA_TYPES.html:
                widget_type = forms.Textarea(
                    attrs={'cols': 120, 'rows': 25, 'class': 'tinymce'})

            if data_structure.type == DataStructure.DATA_TYPES.image:
                if not record_value and not DataStructure.DATA_TYPES.external_image:
                    record_value = data_structure.default
                self.fields[data_structure.name] = forms.ImageField(label=ds_label,
                                                                    help_text=ds_description,
                                                                    initial=record_value,
                                                                    required=False,
                                                                    disabled=disabled)
                if data_structure.meta_settings and 'size' in data_structure.meta_settings:
                    file_size = data_structure.meta_settings['size'] * BYTES_TO_MEGABYTES
                    self.fields[data_structure.name].widget.attrs['size'] = file_size
                continue

            elif data_structure.type in [DataStructure.DATA_TYPES.file,
                                         DataStructure.DATA_TYPES.external_file,
                                         DataStructure.DATA_TYPES.external_image]:
                if not record_value and not data_structure.optional:
                    record_value = data_structure.default
                self.fields[data_structure.name] = forms.FileField(label=ds_label,
                                                                   help_text=ds_description,
                                                                   initial=record_value,
                                                                   required=False,
                                                                   disabled=disabled)

                if data_structure.meta_settings and 'size' in data_structure.meta_settings:
                    file_size = data_structure.meta_settings['size'] * BYTES_TO_MEGABYTES
                    self.fields[data_structure.name].widget.attrs['size'] = file_size
                continue

            elif data_structure.type == DataStructure.DATA_TYPES.select:
                queryset = data_structure.meta_settings['options'] if 'options' in data_structure.meta_settings else []
                queryset = [(choice, choice) for choice in queryset]
                if 'multi' in data_structure.meta_settings and data_structure.meta_settings['multi']:
                    if record_value:
                        record_value = json.loads(record_value)
                    self.fields[data_structure.name] = forms.MultipleChoiceField(label=ds_label,
                                                                                 help_text=ds_description,
                                                                                 initial=record_value,
                                                                                 choices=queryset,
                                                                                 required=False,
                                                                                 disabled=disabled,
                                                                                 widget=forms.CheckboxSelectMultiple(attrs={'class': 'nodots'}))
                else:
                    self.fields[data_structure.name] = forms.ChoiceField(label=ds_label,
                                                                         help_text=ds_description,
                                                                         initial=record_value,
                                                                         choices=queryset,
                                                                         required=False,
                                                                         disabled=disabled)
                continue

            elif data_structure.type == DataStructure.DATA_TYPES.check_box:
                # Off value for check box is empty string
                record_value = 'on' if record_value else ''
                self.fields[data_structure.name] = forms.BooleanField(label=ds_label,
                                                                      help_text=ds_description,
                                                                      initial=record_value,
                                                                      required=False,
                                                                      disabled=disabled)
                continue

            validator = RegexValidator('')
            if data_structure.type == DataStructure.DATA_TYPES.text and 'regex' in data_structure.meta_settings:
                validator = RegexValidator(data_structure.meta_settings['regex'])

            self.fields[data_structure.name] = forms.CharField(required=False,
                                                               label=ds_label,
                                                               help_text=ds_description,
                                                               initial=record_value,
                                                               widget=widget_type,
                                                               disabled=disabled,
                                                               validators=[validator])


class ProductSettingsForm(forms.Form):
    file = forms.FileField(
        label="File",
        help_text="Archive with static files and images for content or structure.json file.",
        required=True
    )

    action = forms.ChoiceField(
        widget=forms.RadioSelect,
        required=True,
        choices=(
            ('generate_json', 'Generate structure template based on archive'),
            ('merge_with_db', 'Generate structure using archive and db'),
            ('update_structure',
             'Update CMS structure and default values based on archive with structure.json and product_type template'),
            ('update_content', 'Upload content files for product')
        )
    )


class ProductForm(forms.ModelForm):
    publish_all_customizations = forms.BooleanField(required=False, label='Publish to all Customizations', initial=True)

    class Meta:
        model = Product
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
        super(ProductForm, self).__init__(*args, **kwargs)
        self.publish_all = False
        if self.instance.product_type and self.instance.product_type.single_customization:
            # used for removing customizations that are already in use from the multiple choice field,
            if 'customizations' in [field.name for field in self.visible_fields()]:
                product_type_customizations = self.instance.product_type.get_customizations(self.instance)\
                    .exclude(customizations__name=self.instance.customizations.first())
                self.fields['customizations'].queryset = Customization.objects.all(). \
                    exclude(name__in=product_type_customizations)

        if self.user and not self.user.is_superuser and not self.instance.pk:
            self.fields['product_type'].queryset = ProductType.objects.exclude(advanced=True)
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
        product_type = cleaned_data.get('product_type')

        if self.instance.pk:
            if not customizations:
                customizations = self.instance.customizations.all()
            if not product_type:
                product_type = self.instance.product_type

        if ('publish_all_customizations' in cleaned_data and cleaned_data['publish_all_customizations']
                or self.publish_all) and not product_type.single_customization:
            cleaned_data['customizations'] = Customization.objects.all()
        else:
            num_customizations = len(customizations)

            if product_type.single_customization:
                if num_customizations > 1:
                    raise forms.ValidationError(f"Too many customizations selected for "
                                                f"{ProductType.PRODUCT_TYPES[product_type.type]}.")
                if customizations.filter(name__in=product_type.get_customizations(self.instance)).exists():
                    raise forms.ValidationError(f"Customization is already used for a "
                                                f"{ProductType.PRODUCT_TYPES[product_type.type]} product.")

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

        self.fields['parent'].queryset = Customization.objects.exclude(id=self.instance.id) \
            .exclude(id__in=self.instance.get_children_ids(self.instance))

    def clean_parent(self):
        data = self.cleaned_data['parent']
        if data and not Customization.objects.exclude(id__in=self.instance.get_children_ids(self.instance)). \
                exclude(id=self.instance.id).filter(id=data.id).exists():
            raise ValueError('Invalid customization was selected')
        return data
