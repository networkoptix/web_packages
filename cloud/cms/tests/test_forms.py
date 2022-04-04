from bs4 import BeautifulSoup
from uuid import uuid4
from dal_select2.widgets import ModelSelect2, ModelSelect2Multiple
from django.db.models.query import QuerySet
from django.forms.fields import *
from django.forms.models import ModelChoiceField, ModelMultipleChoiceField
from django.forms.widgets import CheckboxInput, HiddenInput, PasswordInput, RadioSelect, Select, TextInput, Textarea
from django.contrib.admin import site
from cms.forms import *
from cms.models import *
from conftest import generate_uuids
from mock import patch
from cms.controllers.modify_db import GUID_REGEXP
from model_bakery import baker

import pytest

class TestHelperFunctions:

    def test_convert_meta_to_description(self):
        meta = {
            'char_limit': 100,
            'format': ['100', '200'],
            'width': 300,
            'width_le': 400,
            'width_ge': 50,
            'height': 500,
            'height_le': 700,
            'height_ge': 30,
            'size': 200000
        }

        description = convert_meta_to_description(meta)
        assert "<br>Character limit: 100" in description
        # Test that lists are handled
        assert "<br>Format:  100, 200" in description
        assert "<br>Width: 300px" in description
        assert "<br>Width: not greater than 400p" in description
        assert "<br>Width: not less than 50px" in description
        assert "<br>Height: 500px" in description
        assert "<br>Height: not greater than 700px" in description
        assert "<br>Height: not less than 30px" in description
        assert "br>Size limit: 0.19 MB" in description

    def test_get_languages_list(self, db):
        test_language = baker.make("Language", name='test_language', code='TL')
        customization = Customization.objects.get(name=settings.CUSTOMIZATION)
        customization.languages.add(test_language)
        customization.default_language = test_language
        customization.save()

        languages = get_languages_list()
        assert tuple(languages) == (('TL', 'TL - test_language - default'),)

    def test_get_branding_shortcuts(self, db):
        brands, hidden_brands = get_branding_shortcuts()
        # Not sure if these will change so the first value is being checked only
        assert brands[0][0]['name'] == '%CLOUD_NAME%'
        assert hidden_brands[0][0]['name'] == '%SKIN%'

    @patch('cms.models.DataStructure.find_actual_values')
    def test_get_restricted_keywords(self, mock_cms_models, mocker, db):
        branding_context = Context.objects.get(name='branding', asset_type=get_cloud_portal_asset().asset_type)
        restricted_ds = branding_context.datastructure_set.filter(name='Restricted').first()
        mock_cms_models.return_value = {restricted_ds: ['item1', 'item2']}

        restricted_words = get_restricted_keywords()
        assert restricted_words == ['item1', 'item2']

    def test_generate_branding_variables(self, db):
        datastructure = baker.make("DataStructure", name='Test DS')
        branding_variables = generate_branding_variables(datastructure)
        # Check that it is html
        assert list(filter(lambda html_snippet: not isinstance(html_snippet, str), BeautifulSoup(branding_variables, "html.parser").contents))


    @pytest.fixture()
    def setup_custom_context_form_helper(self, db):
        self.asset = baker.make(Asset)
        self.context = baker.make(Context)
        self.language = baker.make(Language)

    def test_datastructure_is_disabled_if_cannot_edit_advanced(self, mocker, db, setup_custom_context_form_helper):
        mocker.patch('cms.models.Asset.version_id', return_value=2)
        ds = baker.make('datastructure', protected=True)
        assert datastructure_is_disabled(ds, self.asset, self.context, self.language, False)

        mocker.patch('cms.models.Asset.version_id', return_value=0)
        ds.advanced = True
        ds.save()
        assert datastructure_is_disabled(ds, self.asset, self.context, self.language, False)

    @pytest.fixture()
    def setup_generate_description(self, db):
        self.ds_desc = str(uuid4())
        self.ds = baker.make(DataStructure, description=self.ds_desc)

    def test_generate_description(self, setup_generate_description):
        assert generate_description(self.ds, None, None) == self.ds_desc

    def test_generate_description_guid(self, setup_generate_description):
        self.ds.type = DataStructure.DATA_TYPES.guid
        self.ds.save()

        assert GUID_DESCRIPTION in generate_description(self.ds, None, None)

    def test_generate_description_with_meta_settings(self, setup_generate_description, mocker):
        mock_strs = generate_uuids(2)
        branding_shortcuts, hidden_branding_shortcuts = generate_uuids(2)
        mocker.patch('cms.forms.convert_meta_to_description', return_value=mock_strs[0])
        mock_generate_branding_variables = mocker.patch('cms.forms.generate_branding_variables', return_value=mock_strs[1])
        self.ds.meta_settings = { 'brand_vars': True }
        self.ds.save()

        desc = generate_description(self.ds, branding_shortcuts, hidden_branding_shortcuts)
        for str in mock_strs:
            assert str in desc

        mock_generate_branding_variables.assert_called_once_with(self.ds, branding_shortcuts, hidden_branding_shortcuts)

    def test_get_widget(self, db, mocker):
        placeholder = str(uuid4())
        ds = baker.make(DataStructure, placeholder=placeholder)

        widget = get_widget(ds)
        assert isinstance(widget, forms.TextInput)
        assert widget.attrs['size'] == 80
        assert widget.attrs['placeholder'] == placeholder

        ds.type = DataStructure.DATA_TYPES.object
        ds.save()
        assert isinstance(get_widget(ds), forms.Textarea)

        ds.type = DataStructure.DATA_TYPES.array
        ds.save()
        assert isinstance(get_widget(ds), forms.Textarea)

        ds.type = DataStructure.DATA_TYPES.html
        ds.save()
        widget = get_widget(ds)
        assert isinstance(widget, forms.Textarea)
        assert widget.attrs == {'cols': 120, 'rows': 25, 'class': 'tinymce', 'placeholder': placeholder}

        ds.type = DataStructure.DATA_TYPES.long_text
        ds.save()
        widget = get_widget(ds)
        assert isinstance(widget, forms.Textarea)
        assert widget.attrs['placeholder'] == placeholder

        ds.type = DataStructure.DATA_TYPES.multiselect
        ds.save()
        widget = get_widget(ds)
        assert isinstance(widget, forms.CheckboxSelectMultiple)
        assert widget.attrs['class'] == 'nodots'

        mocker.patch('cms.models.DataStructure.get_foreign_key_config', return_value=(DataStructure, {}))
        ds.type = DataStructure.DATA_TYPES.foreign_key
        ds.save()
        widget = get_widget(ds)
        assert isinstance(widget, ForeignKeyRawIdWidget)
        assert widget.admin_site == site

    def test_get_record_value(self, db, mocker):
        mock_value = { 'val1': str(uuid4()), 'val2': str(uuid4()) }
        mocker.patch('cms.models.DataStructure.find_actual_value', return_value = mock_value)

        ds = baker.make(DataStructure)
        record_value = get_record_value(ds, None, None)
        assert record_value == mock_value

    def test_get_record_value_images_and_files_uses_placeholders(self, db, mocker):
        mocker.patch('cms.models.DataStructure.find_actual_value', return_value = {})
        placeholder, default = generate_uuids(2)
        ds = baker.make(DataStructure, type=DataStructure.DATA_TYPES.image, default=default)
        assert get_record_value(ds, None, None) == default
        ds.placeholder = placeholder
        ds.save()
        # Placeholder takes precendence over default
        assert get_record_value(ds, None, None) == placeholder

        ds.type = DataStructure.DATA_TYPES.file
        ds.save()
        assert get_record_value(ds, None, None) == placeholder

    def test_get_record_value_select_and_multiselect(self, db, mocker):
        label1, label2 = generate_uuids(2)
        mock_value = [
            { 'label': label1 },
            { 'label': label2 }
        ]
        mocker.patch('cms.models.DataStructure.find_actual_value', return_value = list(mock_value))

        # Test Select
        ds = baker.make(DataStructure, type=DataStructure.DATA_TYPES.select)
        record_value = get_record_value(ds, None, None)
        assert record_value[0] == label1
        assert record_value[1] == label2

        # Test Multiselect
        ds.type = DataStructure.DATA_TYPES.multiselect
        ds.save()
        record_value = get_record_value(ds, None, None)
        assert record_value[0] == label1
        assert record_value[1] == label2

    def test_get_record_value_check_box(self, db, mocker):
        ds = baker.make(DataStructure, type=DataStructure.DATA_TYPES.check_box)

        # check_box with no found actual_value
        assert get_record_value(ds, None, None) == ''

        mocker.patch('cms.models.DataStructure.find_actual_value', return_value = str(uuid4()))
        assert get_record_value(ds, None, None) == 'on'

class TestCustomContextForm:
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model):
        self.user = django_user_model(email='useremail@test.com')
        self.user.save()
        self.asset = baker.make("Asset", name='test_asset')
        self.context = baker.make("Context", name='test_context')
        self.language = baker.make("Language", name='testlanguage', code='TL')

    @pytest.fixture()
    def mock_init_helpers(self, mocker):
        self.mocked_language_choices = [('L1', 'Language 1'), ('L2', 'Language 2')]
        self.mocked_branding_shortcuts = ['item1', 'item2']
        self.mocked_hidden_branding_shortcuts = ['item3', 'item4']
        mocker.patch('cms.forms.get_languages_list', return_value=self.mocked_language_choices)
        mocker.patch('cms.forms.get_branding_shortcuts', return_value = [self.mocked_branding_shortcuts, self.mocked_hidden_branding_shortcuts])

    @pytest.fixture()
    def init_form(self):
        self.form = CustomContextForm(initial={'language': self.language, 'context': self.context.id},  order = None)

    @pytest.fixture()
    def create_datastructures(self, mocker):
        baker.make("DataStructure",
                    name="textType",
                    context=self.context,
                    label='label1',
                    optional=False,
                    description='textType description',
                    meta_settings={'char_limit': 200, 'regex': '^[a-zA-Z0-9_.+-]' },
                    placeholder='ds1 placeholder', type=0)

        baker.make("DataStructure",
                name="imageType",
                context=self.context,
                label='image field',
                description='i am an image field',
                meta_settings={'size': 4000000 },
                # Image
                type=1)

        baker.make("DataStructure",
                    name="HTMLType",
                    context=self.context,
                    placeholder='ds5 placeholder',
                    # HTML
                    type=2)

        baker.make("DataStructure",
                    name="longTextType",
                    context=self.context,
                    label='long_text field',
                    description='i am a long_text field',
                    placeholder='long_text placeholder',
                    # Long Text
                    type=3)

        baker.make("DataStructure",
                    name="fileType",
                    context=self.context,
                    label='file field',
                    description='i am a file field',
                    meta_settings={'size': 4000000 },
                    # File
                    type=4)

        baker.make("DataStructure",
                    name="GUIDType",
                    context=self.context,
                    description='guid description',
                    translatable=False,
                    # GUID type
                    type=5
                    )

        baker.make("DataStructure",
                    name="selectType",
                    context=self.context,
                    label='select field',
                    description='i am a select field',
                    meta_settings={'options': [{'label': 'option1'}] },
                    # Select
                    type=6)

        baker.make("DataStructure",
                    name="checkboxType",
                    context=self.context,
                    label='checkbox field',
                    description='i am a checkbox field',
                    # Checkbox
                    type=9)

        baker.make("DataStructure",
                    name="objectType",
                    context=self.context,
                    # Object
                    type=10)

        baker.make("DataStructure",
                    name="arrayType",
                    context=self.context,
                    label='label3',
                    protected=True,
                    advanced=True,
                    # Array
                    type=11,)

        baker.make("DataStructure",
                    name="multiselectType",
                    context=self.context,
                    label='multiselect field',
                    description='i am a multiselect field',
                    meta_settings={'options': ['option1', 'option2'] },
                    # MultiSelect
                    type=12)

        mocker.patch('cms.models.DataStructure.get_foreign_key_config', return_value=(DataStructure, {}))
        baker.make("DataStructure",
                    name="foreignKeyType",
                    context=self.context,
                    label='foreignKey field',
                    description='i am a foreignKey field',
                    # ForeignKey
                    type=14)

    def test_form_init(self, mock_init_helpers, init_form):
        assert self.form.fieldsets == {}
        assert self.form.fields['language'].choices == self.mocked_language_choices
        assert self.form.branding_shortcuts == self.mocked_branding_shortcuts
        assert self.form.hidden_branding_shortcuts == self.mocked_hidden_branding_shortcuts

    def test_remove_language(self, init_form):
        assert self.form.fields['language']
        self.form.remove_language()
        with pytest.raises(KeyError):
            self.form.fields['language']

    def test_add_fields_no_data_structures(self, init_form):
        self.form.add_fields(self.asset, self.context, self.language, self.user)
        # The function returns early because no data structures are available for the context
        assert self.form.fieldsets == {}

    def test_add_fields(self, create_datastructures, init_form):
        self.form.add_fields(self.asset, self.context, self.language, self.user)

        # Text Field
        text_field = self.form.fields['textType']
        assert text_field.label == 'label1'
        assert '<br>Character limit: 200' in text_field.help_text
        # default widget
        assert isinstance(text_field.widget, TextInput)
        assert text_field.widget.attrs['placeholder'] == 'ds1 placeholder'
        assert text_field.validators[0].regex == re.compile('^[a-zA-Z0-9_.+-]$')
        assert text_field.required == True
        # Char limit in meta_settings properly assigns to maxlength
        assert text_field.widget.attrs['maxlength'] == 200

        # Image field
        image_field = self.form.fields['imageType']
        assert isinstance(image_field, ImageField)
        assert image_field.label == 'image field'
        assert 'i am an image field' in image_field.help_text
        # Meta settings on image field
        assert int(image_field.widget.attrs['size']) == 3995074

        # File type field
        file_field = self.form.fields['fileType']
        assert isinstance(file_field, FileField)
        assert file_field.label == 'file field'
        assert 'i am a file field' in file_field.help_text
        # Meta settings on file field
        assert int(file_field.widget.attrs['size']) == 3995074

        # GUID field
        guid_field = self.form.fields['GUIDType']
        assert guid_field.label == 'GUIDType'    # No label, default to name
        assert ("<br>GUID format is '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}' using hexadecimal characters (0-9, a-f, A-F)<br>This record is the same for every language.<br>Regex pattern: \{[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}\}$"
                in guid_field.help_text)
        # If data structure is not translatable but context is, something is added to the description.
        assert '<br>This record is the same for every language.' in guid_field.help_text
        # The GUID field is disabled because datastructure is not translatable and language is not set to the default language
        assert guid_field.disabled
        assert guid_field.widget.attrs['pattern'] == GUID_REGEXP
        pattern_description = f'Regex pattern: {GUID_REGEXP}'
        assert guid_field.widget.attrs['title'] == pattern_description
        assert pattern_description in guid_field.help_text

        # Select field
        select_field = self.form.fields['selectType']
        assert isinstance(select_field, ChoiceField)
        assert select_field.label == 'select field'
        assert 'i am a select field' in select_field.help_text
        assert tuple(select_field.choices) == (('option1', 'option1'),)
        assert select_field.required == False
        assert select_field.disabled == False

        # Checkbox field
        checkbox_field = self.form.fields['checkboxType']
        assert isinstance(checkbox_field, BooleanField)
        assert checkbox_field.disabled == False
        assert checkbox_field.help_text == 'i am a checkbox field'
        assert checkbox_field.label == 'checkbox field'
        assert checkbox_field.disabled == False

        # Array and object field
        array_field = self.form.fields['arrayType']
        object_field = self.form.fields['objectType']
        # Array field is disabled because user can not 'edit advanced' while the datastructure is set to protected and advanced.
        assert array_field.disabled
        assert isinstance(array_field.widget, Textarea)
        assert isinstance(object_field.widget, Textarea)

        # MultiSelect field
        multiselect_field = self.form.fields['multiselectType']
        assert isinstance(multiselect_field, MultipleChoiceField)
        assert multiselect_field.label == 'multiselect field'
        assert 'i am a multiselect field' in multiselect_field.help_text
        assert tuple(multiselect_field.choices) == (('option1', 'option1'), ('option2', 'option2'))
        assert multiselect_field.required == False
        assert multiselect_field.disabled == False
        assert multiselect_field.widget.attrs == {'class': 'nodots'}

        # Foreign Key Field
        foreign_key_field = self.form.fields['foreignKeyType']
        assert foreign_key_field.label == 'foreignKey field'
        assert foreign_key_field.help_text == 'i am a foreignKey field'
        assert foreign_key_field.required == False
        assert foreign_key_field.disabled == False
        assert isinstance(foreign_key_field.widget, ForeignKeyRawIdWidget)

class TestAssetSettingsForm:
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)
        self.asset_form = AssetSettingsForm()
        self.asset_type_form = AssetSettingsForm(target_class=AssetType)
        self.forms = self.asset_form, self.asset_type_form

    def test_file(self):
        for form in self.forms:
            field = form.fields['file']
            assert field
            assert field.required == False
            assert field.label == "File"
            assert isinstance(field, FileField)

    def test_action(self):
        forms_and_actions = (
            (self.asset_form, AssetSettingsForm.ASSET_ACTIONS),
            (self.asset_type_form, AssetSettingsForm.ASSET_TYPE_ACTIONS)
        )
        for form, actions in forms_and_actions:
            field = form.fields['action']
            assert field
            assert field.required == True
            assert field.choices == list(actions)
            assert isinstance(field.widget, RadioSelect)
            assert isinstance(field, ChoiceField)

    def test_force(self):
        for form in self.forms:
            field = form.fields['force']
            assert field
            assert field.required == False
            assert field.label == "Force Update"
            assert isinstance(field, BooleanField)

    def test_normal_user_no_publish_choice(self):
        import_assets_from_json_publish = [choice for choice in self.asset_type_form.fields['action'].choices if choice[0] == 'import_assets_from_json_publish']
        assert not len(import_assets_from_json_publish)

    def test_superuser_has_publish_choice(self):
        self.user.is_superuser = True
        form = AssetSettingsForm(user = self.user, target_class=AssetType)
        import_assets_from_json_publish = [choice for choice in form.fields['action'].choices if choice[0] == 'import_assets_from_json_publish']
        assert len(import_assets_from_json_publish)

    def test_form_has_errors_from_omitted_fields(self):
        form = AssetSettingsForm(data = {})
        assert form.errors

    def test_no_form_errors_from_required_fields(self):
        form = AssetSettingsForm(data = {'action': 'generate_json'}, target_class=AssetType)
        assert not form.errors



class TestAssetForm:
    @pytest.fixture(autouse=True)
    def setup_user(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)
        self.user.save()
        django_user_model(email='seconduser@test.com').save()

    @pytest.fixture()
    def new_asset_form(self):
        self.form = AssetForm(user = self.user)

    @pytest.fixture()
    def new_asset_form_is_superuser(self):
        self.user.is_superuser = True
        self.user.save()
        self.form = AssetForm(user = self.user)


    @pytest.fixture()
    def single_customization_asset_form(self, customization_factory):
        # sets up an asset form with single_customization set to True
        self.asset_type = baker.make("AssetType", make_m2m=True, name="new_asset_type", type=0)
        self.asset = baker.make("Asset", make_m2m=True, name="asset1", asset_type=self.asset_type)
        related_customization = customization_factory(name="related_customization")

        test_asset = baker.make("Asset", name="asset2", asset_type=self.asset_type)
        test_asset.customizations.add(customization_factory(name="testcust1"))
        test_asset.save()

        self.asset.customizations.add(related_customization)
        self.asset.asset_type.single_customization = True
        self.asset.save()
        self.form = AssetForm(instance = self.asset)

    @pytest.fixture()
    def valid_asset_form(self, customization_factory):
        self.user.is_superuser = True
        self.user.save()
        # A unique primary group is required
        self.group_model = baker.make("Group", name="test-group")
        self.asset_type = baker.make("AssetType", name="new_asset_type", type=0)
        self.customization_one = customization_factory('testcust')
        self.form = AssetForm(data={'name': 'test-asset',
                                    'created_by': self.user.id,
                                    'asset_type': self.asset_type.id,
                                    'preview_status': 0,
                                    'primary_group': self.group_model.id,
                                    'protected': True,
                                    'publish_all_customizations': True,
                                     }, user = self.user)

    def test_model(self, new_asset_form):
        assert self.form.Meta.model == Asset

    def test_name(self, new_asset_form):
        field = self.form.fields['name']
        assert field
        assert isinstance(field, CharField)

    def test_created_by(self, new_asset_form):
        field = self.form.fields['created_by']
        assert field
        assert isinstance(field.widget, Select)
        assert isinstance(field, ModelChoiceField)

    def test_created_by_is_superuser(self, new_asset_form_is_superuser):
        field = self.form.fields['created_by']
        assert isinstance(field.widget, ModelSelect2)
        assert field.widget.url == reverse('account-autocomplete')
        assert field.widget.attrs['data-placeholder'] == 'Email ...'
        assert field.widget.attrs['data-minimum-input-length'] == 2

    def test_customizations(self, new_asset_form):
        field = self.form.fields['customizations']
        assert field
        assert isinstance(field.widget, HiddenInput)
        assert isinstance(field, ModelMultipleChoiceField)

    def test_customizations_widget_is_superuser(self, new_asset_form_is_superuser):
        field = self.form.fields['customizations']
        assert isinstance(field.widget, FilteredSelectMultiple)
        assert field.widget.is_stacked == False

    def test_asset_type(self, new_asset_form):
        field = self.form.fields['asset_type']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_preview_status(self, new_asset_form):
        field = self.form.fields['preview_status']
        assert field
        assert isinstance(field, TypedChoiceField)

    def test_primary_group(self, new_asset_form):
        field = self.form.fields['primary_group']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_protected(self, new_asset_form):
        field = self.form.fields['protected']
        assert field
        assert isinstance(field, BooleanField)

    def test_publish_all_customizations(self, new_asset_form):
        field = self.form.fields['publish_all_customizations']
        assert field
        assert field.required == False
        assert field.label == 'Publish to all Customizations'
        assert isinstance(field.widget, HiddenInput)
        assert isinstance(field, BooleanField)

    def test_publish_all_customizations_is_superuser(self, new_asset_form_is_superuser):
        field = self.form.fields['publish_all_customizations']
        assert isinstance(field.widget, CheckboxInput)

    def test_menu(self, new_asset_form, menu_factory):
        menu_factory("menu1")
        menu_factory("menu2")

        field = self.form.fields['menu']
        assert field
        assert field.label == 'Parent Menu'
        assert field.required == False
        assert field.queryset.count() == Menu.objects.all().count()
        assert isinstance(field, ModelChoiceField)

    def test_customizations_does_not_include_in_use_customization(self, single_customization_asset_form):
        assert self.form.fields['customizations'].queryset.count() == 2
        assert self.form.fields['customizations'].queryset.filter(name='testcust1').count() == 0

    def test_new_form_non_superuser(self, new_asset_form):
        # Advanced asset_types are hidden for non-superusers
        assert self.form.fields['asset_type'].queryset.filter(advanced=True).count() == 0
        # Non-superusers can only select themselves as the created_by user, so the count is always 1
        assert self.form.fields['created_by'].queryset.count() == 1

    def test_new_form_is_superuser(self, new_asset_form_is_superuser):
        assert self.form.fields['asset_type'].queryset.filter(advanced=True).count() != 0
        assert self.form.fields['created_by'].queryset.count() != 1

    def test_clean_throws_validation_error_too_many_customizations(self, valid_asset_form, customization_factory):
        # Should throw a validation error if single_customization is true and you try to submit with multiple customizations
        self.asset_type.single_customization = True
        self.asset_type.save()
        self.form.data['publish_all_customizations'] = False
        second_customization = customization_factory("cust2")
        # More than one customization selected
        self.form.data['customizations'] = [str(self.customization_one.id), str(second_customization.id)]
        # .is_valid() has to be called before clean to generate cleaned_data
        self.form.is_valid()

        with pytest.raises(ValidationError, match='Too many customizations selected for Cloud Portal.'):
            self.form.clean()

    def test_clean_throws_validation_error_customization_in_use(self, valid_asset_form, customization_factory):
        self.asset_type.single_customization = True
        self.asset_type.save()
        mock_asset = baker.make("Asset", name="asset1", asset_type = self.asset_type)
        mock_customization = customization_factory('test_customization')
        mock_asset.customizations.add(mock_customization)
        mock_asset.save()
        # publish_all_customization is false and mock_customization is selected
        self.form = AssetForm(data={'name': 'test-asset',
                                    'created_by': self.user.id,
                                    'asset_type': self.asset_type.id,
                                    'preview_status': 0,
                                    'primary_group': self.group_model.id,
                                    'protected': True,
                                    'customizations': [mock_customization],
                                    'publish_all_customizations': False,
                                     }, user = self.user)
        self.form.is_valid()
        with pytest.raises(ValidationError, match='Customization is already used for a Cloud Portal asset.'):
            self.form.clean()

    def test_clean_throws_uniqueness_conflict_error(self, mocker, valid_asset_form):
        class MockErrorField:
            name = 'test_name'
        mocker.patch('cms.forms.are_asset_datarecords_unique', return_value=[False, MockErrorField])

        self.form.is_valid()
        with pytest.raises(ValidationError, match='Cannot apply customizations because there is a uniqueness conflict on the test_name field'):
            self.form.clean()

    def test_publish_all_customizations_submit(self, valid_asset_form):
        # Test that the publish_all_customizations option properly selects all customizations
        # Also tests that clean can be valid without errors, it is called as part of self.form.save
        self.form.save()
        assert Asset.objects.filter(name="test-asset").first().customizations.count() == Customization.objects.all().count()

class TestCustomizationForm:
    @pytest.fixture(autouse=True)
    def setup_user(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)

    @pytest.fixture()
    def new_customization_form(self, customization_factory):
        self.form = CustomizationForm()
        customization_factory(name ="cust1")
        customization_factory(name="cust2")

    @pytest.fixture()
    def existing_customization_form(self, customization_factory):
        customization_factory(name='cust2')
        customization_factory(name='cust3')
        self.child_customization = customization_factory(name='child')
        self.form_customization = customization_factory(name='test_customization')
        self.child_customization.parent = self.form_customization
        self.child_customization.save()
        self.extra_customization = customization_factory(name='cust4')
        self.form = CustomizationForm(instance = self.form_customization,
                                      data={
                                            'parent': self.extra_customization.id,
                                            'default_language': 1,
                                            'languages': [1],
                                            'name': 'new_name'
                                            })

    def test_model(self, new_customization_form):
        assert self.form.Meta.model == Customization

    def test_name(self, new_customization_form):
        field = self.form.fields['name']
        assert field
        assert isinstance(field, CharField)

    def test_default_language(self, new_customization_form):
        field = self.form.fields['default_language']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_languages(self, new_customization_form):
        field = self.form.fields['languages']
        assert field
        assert isinstance(field.widget, FilteredSelectMultiple)
        assert isinstance(field, ModelMultipleChoiceField)

    def test_host(self, new_customization_form):
        field = self.form.fields['host']
        assert field
        assert isinstance(field, CharField)

    def test_parent(self, new_customization_form):
        field = self.form.fields['parent']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_trust_parent(self, new_customization_form):
        field = self.form.fields['trust_parent']
        assert field
        assert isinstance(field, BooleanField)

    def test_new_customization_parent_queryset_inlcudes_all_customizations(self, new_customization_form):
        assert Customization.objects.all().count() == len(self.form.fields['parent'].choices) - 1
                                                         # Minus 1 to account for default choice, which is blank


    def test_does_not_include_itself_as_parent_choice(self, existing_customization_form):
        self_customization = None
        for item in self.form.fields['parent'].choices:
            if(item[0] == self.form_customization.id):
                self_customization = item
        assert not self_customization

    def test_does_not_include_child_as_parent_choice(self, existing_customization_form):
        child_customization = None
        for item in self.form.fields['parent'].choices:
            if(item[0] == self.child_customization.id):
                child_customization = item
        assert not child_customization

    def test_invalid_customization(self, existing_customization_form):
        # extra_customization is selected as the parent,
        # and it becomes a child of the form customization, which is an invalid selection
        self.extra_customization.parent = self.form_customization
        self.extra_customization.save()

        with pytest.raises(ValueError, match='Invalid customization was selected'):
            # clean_parent is run here
            self.form.save()

    def test_customization_form_submits(self, existing_customization_form):
        # clean_parent is run here
        self.form.save()

class TestLanguageForm:
    @pytest.fixture(autouse=True)
    def setup_user(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)

    @pytest.fixture()
    def create_new_language(self, language_factory):
        self.new_language = language_factory(name='dothraki', code='DO')
        self.new_language.save()
        self.form = LanguageForm(instance = self.new_language)

    @pytest.fixture()
    def use_existing_language(self, customization_factory):
        self.existing_language = Language.objects.all().last()
        baker.make('Customization', name="test_customization", default_language = self.existing_language, languages = [self.existing_language])
        self.form = LanguageForm(instance = self.existing_language, data = {'name': self.existing_language.name, 'code':self.existing_language.code})
        self.form.data['customizations'] = self.form.fields['customizations'].initial

    def test_model(self, create_new_language):
        assert self.form.Meta.model == Language

    def test_customizations(self, create_new_language):
        field = self.form.fields['customizations']
        assert field
        assert isinstance(field.widget, FilteredSelectMultiple)
        assert field.queryset.count() == Customization.objects.all().count()
        assert isinstance(field, ModelMultipleChoiceField)

    def test_name(self, create_new_language):
        field = self.form.fields['name']
        assert field
        assert isinstance(field, CharField)

    def test_code(self, create_new_language):
        field = self.form.fields['code']
        assert field
        assert isinstance(field, CharField)

    def test_initial_customizations_value_with_new_language(self, create_new_language):
        initial_customizations_value = self.form.fields['customizations'].initial
        assert isinstance(initial_customizations_value, QuerySet)
        assert initial_customizations_value.count() == 0

    def test_initial_customizations_value_with_existing_language(self, use_existing_language):
        initial_customizations_value = self.form.fields['customizations'].initial
        assert isinstance(initial_customizations_value, QuerySet)
        assert initial_customizations_value.count()

    def test_language_form_submits(self, use_existing_language):
        self.form.save()

class TestContributorAgreementForm:
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)
        self.contributor_agreement = baker.prepare('ContributorAgreement', user = self.user)
        self.form = ContributorAgreementForm(instance = self.contributor_agreement)

    def test_model(self):
        assert self.form.Meta.model == ContributorAgreement

    def test_user(self):
        field = self.form.fields['user']
        assert field
        assert isinstance(field.widget, ModelSelect2)
        assert field.widget.url == reverse('account-autocomplete')
        assert isinstance(field, ModelChoiceField)

    def test_accepted_agreement(self):
        field = self.form.fields['accepted_agreement']
        assert field
        assert isinstance(field, ModelChoiceField)

class TestMenuChangeForm:
    @pytest.fixture(autouse=True)
    def setup_user(self, django_user_model, customization_factory):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)
        self.user.save()

        self.menu = baker.make("Menu")
        # MenuAdmin in admin.py adds user_customizations and current_customization as properties to the form
        # so that is being mocked here
        customization_factory('test_customization')
        menu_change_form = MenuChangeForm
        menu_change_form.user_customizations = Customization.objects.all()
        menu_change_form.current_customization = 'all'
        self.form = menu_change_form(instance = self.menu)

    def test_model(self):
        assert self.form.Meta.model == Menu

    def test_name(self):
        field = self.form.fields['name']
        assert field
        assert isinstance(field, CharField)

    def test_depth(self):
        field = self.form.fields['depth']
        assert field
        assert isinstance(field, IntegerField)

    def test_base_url(self):
        field = self.form.fields['base_url']
        assert field
        assert isinstance(field, CharField)

    def test_url(self):
        field = self.form.fields['url']
        assert field
        assert isinstance(field, CharField)

    def test_type(self):
        field = self.form.fields['type']
        assert field
        assert isinstance(field, TypedChoiceField)

    def test_allow_porting(self):
        field = self.form.fields['allow_porting']
        assert field
        assert isinstance(field, BooleanField)

    def test_zendesk_sync_enabled(self):
        field = self.form.fields['zendesk_sync_enabled']
        assert field
        assert isinstance(field, ModelMultipleChoiceField)

    def test_title(self):
        field = self.form.fields['title']
        assert field
        assert isinstance(field, CharField)

    def test_short_description(self):
        field = self.form.fields['short_description']
        assert field
        assert isinstance(field, CharField)

    def test_admin_config(self):
        field = self.form.fields['admin_config']
        assert field
        assert isinstance(field.widget, Textarea)
        assert isinstance(field, CharField)

    def test_enabled(self):
        field = self.form.fields['enabled']
        assert field
        assert isinstance(field, BooleanField)

    def test_customization_view(self):
        field = self.form.fields['customization_view']
        assert field
        assert field.required == False
        assert isinstance(field, ChoiceField)

    def test_customization_view_on_init(self):
        field = self.form.fields['customization_view']
        customization_choices = (('all', 'All'),) + tuple((name, name) for name in self.form.user_customizations)
        assert field.choices == list(customization_choices)
        assert self.form.initial['customization_view'] == 'all'

    def test_clean_admin_config(self):
        admin_config_string = '{"header": ["name", "url", "enabled", "order", "preview"], "details": ["asset", "icon", "authentication"], "advanced": ["related_assets", "next_item", "subtitle", "condition", "permissions", "new_window", "is_global"]}'
        self.form.cleaned_data = {
                                  'admin_config': admin_config_string
                                 }
        # Works without errors
        assert self.form.clean_admin_config() == admin_config_string

    def test_clean_admin_config_raises_invalid_json_error(self):
        admin_config_string = '{"header :name, url , enabled , order ,  preview ]}'
        self.form.cleaned_data = {
                                  'admin_config': admin_config_string
                                 }
        with pytest.raises(ValidationError, match='Invalid JSON format'):
            self.form.clean_admin_config()

    def test_clean_admin_config_raises_invalid_value_error(self):
        admin_config_string = '{"header": ["name", "invalid_entry"]}'
        self.form.cleaned_data = {
                                  'admin_config': admin_config_string
                                 }
        with pytest.raises(ValidationError, match='Invalid values for property "header": '):
            self.form.clean_admin_config()

    def test_clean_admin_config_raises_invalid_value_type_error(self):
        # This is invalid because the value, name, is not a list
        admin_config_string = '{"header": "name"}'
        self.form.cleaned_data = {
                                  'admin_config': admin_config_string
                                 }
        with pytest.raises(ValidationError, match='Invalid value type on property "header": name'):
            self.form.clean_admin_config()

class MenuNodeFieldTests:
    def test_model(self, init_form):
        assert self.form.Meta.model == MenuNode

    def test_name(self, init_form):
        field = self.form.fields['name']
        assert field
        assert isinstance(field, CharField)

    def test_url(self, init_form):
        field = self.form.fields['url']
        assert field
        assert isinstance(field, CharField)

    def test_new_window(self, init_form):
        field = self.form.fields['new_window']
        assert field
        assert isinstance(field, BooleanField)

    def test_icon(self, init_form):
        field = self.form.fields['icon']
        assert field
        assert isinstance(field, CharField)

    def test_order(self, init_form):
        field = self.form.fields['order']
        assert field
        assert isinstance(field, IntegerField)

    def test_condition(self, init_form):
        field = self.form.fields['condition']
        assert field
        assert isinstance(field, CharField)

    def test_authentication(self, init_form):
        field = self.form.fields['authentication']
        assert field
        assert isinstance(field, TypedChoiceField)

    def test_is_global(self, init_form):
        field = self.form.fields['is_global']
        assert field
        assert isinstance(field, BooleanField)

    def test_enabled(self, init_form):
        field = self.form.fields['enabled']
        assert field
        assert isinstance(field, ModelMultipleChoiceField)

class TestMenuNodeChangeForm(MenuNodeFieldTests):
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)


    @pytest.fixture()
    def existing_menu_node_form(self):
        self.menu = baker.make("Menu")
        self.parent_node = baker.make("MenuNode", parent_menu = self.menu)
        self.menunode = baker.make("MenuNode", parent_node = self.parent_node)
        self.form = MenuNodeChangeForm(instance = self.menunode)

    @pytest.fixture()
    def init_form(self):
        self.form = MenuNodeChangeForm()

    @pytest.fixture()
    def init_form_with_instance(self):
         self.form = MenuNodeChangeForm(instance = self.menunode)

    def test_touched(self, init_form):
        field = self.form.fields['touched']
        assert field
        assert isinstance(field, BooleanField)

    def test_parent_node(self, init_form):
        field = self.form.fields['parent_node']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_parent_menu(self, init_form):
        field = self.form.fields['parent_menu']
        assert field
        assert isinstance(field, ModelChoiceField)

    def test_menu(self, init_form):
        field = self.form.fields['menu']
        assert field
        assert isinstance(field.widget, HiddenInput)
        assert field.queryset.count() == Menu.objects.all().count()
        assert isinstance(field, ModelChoiceField)

    def test_creating_new_menu_node_field_settings(self, init_form):
        parent_node = self.form.fields['parent_node']
        parent_menu = self.form.fields['parent_menu']
        menu = self.form.fields['menu']

        assert isinstance(parent_node.widget, HiddenInput)
        assert parent_node.queryset.count() == 0
        assert parent_node.required == False
        assert menu.required == False
        assert parent_menu.required == True

    def test_existing_menu_node_field_settings(self, existing_menu_node_form, init_form_with_instance):
        menu = self.form.fields['menu']
        parent_node = self.form.fields['parent_node']
        parent_menu = self.form.fields['parent_menu']

        assert menu.required == True
        assert menu.initial == self.menu
        assert parent_node.queryset.first() == self.parent_node
        assert isinstance(parent_menu.widget, HiddenInput)

    @pytest.fixture()
    def setup_clean_enabled(self, customization_factory):
        customization_factory('test1')
        customization_factory('test2')
        self.enabled_query = Customization.objects.filter(name='test1')
        self.available_query = Customization.objects.all()
        self.form.cleaned_data = { 'enabled': self.enabled_query, 'available': self.available_query, 'is_global': False}

    def test_clean_enabled(self, existing_menu_node_form, init_form_with_instance, setup_clean_enabled):
        assert self.form.clean_enabled() == self.enabled_query

    def test_clean_enabled_raises_validation_error(self, existing_menu_node_form, init_form_with_instance, setup_clean_enabled):
        available_query = Customization.objects.filter(name='test2')
        self.form.cleaned_data['available'] = available_query
        with pytest.raises(ValidationError, match='Cannot enable customizations for which the node is not available. Please make sure available customizations are set first'):
            self.form.clean_enabled()


class TestMenuNodeInlineForm(MenuNodeFieldTests):
    @pytest.fixture(autouse=True)
    def setup(self, customization_factory, django_user_model):
        self.email = 'user_email@test.com'
        self.user = django_user_model(email=self.email)
        self.menu_node_inline_form = MenuNodeInlineForm

        #  Default values, good enough for basic testing of the fields
        self.menu_node_inline_form.current_customization = 'all'
        self.menu_node_inline_form.user_customizations = []
        self.menu_node_inline_form.custom_preview = ''
        self.current_customization = customization_factory('current_customization')


    @pytest.fixture()
    def generate_valid_form(self, customization_factory):
        # Some dummy customizations to populate the db
        cust1 = customization_factory('test1')
        cust2 = customization_factory('test2')

        # Create a valid asset
        self.asset = baker.make('Asset', name='test_asset')
        self.asset.customizations.add(self.current_customization)
        self.asset.save()

        # Make a valid menunode
        self.menu = baker.make("Menu", name='testmenu')
        self.menunode = baker.make("MenuNode", asset = self.asset, parent_menu = self.menu)

        self.menu_node_inline_form.user_customizations = [self.current_customization, cust1, cust2]

    @pytest.fixture()
    def set_current_customization(self):
         self.menu_node_inline_form.current_customization = self.current_customization

    @pytest.fixture()
    def init_form(self):
        self.form = self.menu_node_inline_form()

    @pytest.fixture()
    def init_form_with_instance(self):
        self.form = self.menu_node_inline_form(instance = self.menunode)

    def test_subtitle(self, init_form):
        field = self.form.fields['subtitle']
        assert field
        assert isinstance(field, CharField)

    def test_related_assets(self, init_form):
        field = self.form.fields['related_assets']
        assert field
        # Set in __init__
        assert field.help_text == 'Use to add related articles for knowledgebase pages'
        assert isinstance(field.widget, ModelSelect2Multiple)
        assert field.widget.url == reverse('asset_autocomplete')
        assert field.widget.attrs == {
                                'data-placeholder': 'Select related articles',
                                'data-minimum-input-length': 2
                              }
        assert isinstance(field, ModelMultipleChoiceField)

    def test_enabled_widget(self, init_form):
        widget = self.form.fields['enabled'].widget
        assert widget.options == {
                                  'includeSelectAllOption': True,
                                  'maxHeight': 300,
                                  'selectAllText': 'All',
                                  'selectAllNumber': True,
                                  'enableFiltering': True,
                                  'nonSelectedText': 'Disabled',
                                  'allSelectedText': 'All enabled',
                                  'selectAllJustVisible': True
                                 }
        assert widget.field_name == 'enabled'
        assert isinstance(widget, BootstrapMultiSelect)

    def test_permissions(self, init_form):
        field = self.form.fields['permissions']
        assert field
        # Set in __init__
        assert field.help_text == 'Choose which permissions are required to see this menu item'
        # This property holds a lambda function
        assert callable(field.label_from_instance)
        assert isinstance(field.widget, ModelSelect2Multiple)
        assert field.widget.url == reverse('permission-autocomplete')
        assert field.widget.attrs == {
                                        'data-placeholder': 'None required',
                                        'data-minimum-input-length': 2
                                      }
        assert isinstance(field, ModelMultipleChoiceField)

    def test_asset(self, init_form):
        field = self.form.fields['asset']
        assert field
        assert field.widget.url == reverse('asset_autocomplete')
        assert field.widget.attrs == {
                                      'data-placeholder': 'Select article',
                                      'data-minimum-input-length': 2
                                     }
        # This is set in __init__
        assert field.widget.can_add_related == True
        # This property holds a lambda function
        assert callable(field.widget.get_related_url)
        assert isinstance(field.widget, ModelSelect2)
        assert isinstance(field, ModelChoiceField)

    def test_init_with_all_customizations_enabled(self, generate_valid_form, init_form):
        enabled = self.form.fields['enabled']
        assert list(enabled.queryset) == list(Customization.objects.filter(name__in=self.form.user_customizations).order_by('name'))
        assert enabled.widget.can_add_related == False
        assert enabled.help_text == 'Choose which customizations this menu item should be enabled in'

    def test_init_with_one_customization_enabled(self, generate_valid_form, set_current_customization, init_form):
        enabled = self.form.fields['enabled']
        assert enabled.required == False
        assert self.form.initial['enabled'] == False

    def test_init_with_one_customization_enabled_with_valid_asset_instance(self, generate_valid_form, set_current_customization, init_form_with_instance):
        enabled = self.form.fields['enabled']
        assert enabled.required == False
        assert self.form.initial['enabled'] == True


    # Everything below is testing the clean function
    @pytest.fixture()
    def setup_clean_test(self, customization_factory):
        # This helps with properly differentiating the different clean scenarios that need to be tested
        self.unrelated_customization = customization_factory('unrelated_customization')
        self.asset.customizations.remove(self.unrelated_customization)
        self.asset.save()
        self.data = data = {
            'asset': self.asset.id,
            'name': 'menunodename',
            'parent_menu': self.menu.id,
            'menu': self.menu.id,
            'authentication': 1,
            'order': 1
        }

    def init_form_and_validate(self, data):
        self.form = self.menu_node_inline_form(instance = self.menunode, data=data)
        # Generates cleaned_data to prevent an error
        self.form.is_valid()
        return self.form.clean()

    def test_clean_all_customizations(self, customization_factory, generate_valid_form, setup_clean_test):
        # Test with self.current_customization = all
        cleaned_data = self.init_form_and_validate(self.data)
        assert set(cleaned_data['enabled']) == set(self.asset.customizations.all())

    def test_clean_single_current_customization(self, generate_valid_form, setup_clean_test):
        # Test with self.current_customization = unrelated_customization
        self.menu_node_inline_form.current_customization = self.unrelated_customization
        cleaned_data = self.init_form_and_validate(self.data)
        assert set(cleaned_data['enabled']) == set([self.current_customization, self.unrelated_customization])

    def test_clean_no_asset(self, generate_valid_form, setup_clean_test):
        self.data['asset'] = None
        cleaned_data = self.init_form_and_validate(self.data)
        assert set(cleaned_data['enabled']) == set()

    def test_clean_no_asset_with_enabled_customization(self, generate_valid_form, setup_clean_test):
        # Same test as above but now the menunode has an already enabled customization that should get selected
        self.menunode.enabled.add(self.current_customization)
        self.menunode.save()
        self.data['asset'] = None
        cleaned_data = self.init_form_and_validate(self.data)
        assert set(cleaned_data['enabled']) == set([self.current_customization])

    def test_clean_no_asset_and_no_instance(self, generate_valid_form, setup_clean_test):
        self.menunode = None
        self.menu_node_inline_form.current_customization = 'all'
        self.data['asset'] = self.asset.id
        cleaned_data = self.init_form_and_validate(self.data)
        assert set(cleaned_data['enabled']) == set(self.asset.customizations.all())

class TestMenuPortForm:
    @pytest.fixture(autouse=True)
    def init_form(self, django_user_model):
        self.user = django_user_model(email = 'testuser@email.com')
        baker.make('Menu', allow_porting=True)
        baker.make('Menu')
        self.form = MenuPortForm(port_type='import')


    def test_menu(self):
        field = self.form.fields['menu']
        assert field
        assert set(field.queryset) == set(Menu.objects.filter(allow_porting=True))
        assert callable(field.label_from_instance)
        assert isinstance(field, ModelChoiceField)

    def test_file(self):
        field = self.form.fields['file']
        assert field
        assert field.required == False
        assert isinstance(field, FileField)

    def test_force(self):
        field = self.form.fields['force']
        assert field
        assert isinstance(field, BooleanField)
        assert field.label == 'Force Update'
        assert field.help_text == 'Updates existing records with values from JSON when conflicts exist.'
        assert field.required == False

    def test_accept_reviews(self):
        field = self.form.fields['accept_reviews']
        assert field
        assert field.required == False
        assert field.help_text == 'Auto accept reviews for all customizations'
        assert field.label == 'Auto Accept'
        assert isinstance(field, BooleanField)

class TestZendeskImportForm:
    @pytest.fixture(autouse=True)
    def setup(self, django_user_model):
        self.user = django_user_model(email = 'testuser@email.com')
        self.porting_menu = baker.make('Menu', allow_porting=True)
        baker.make('Menu')

    @pytest.fixture()
    def init_form(self):
        self.form = ZendeskImportForm()

    @pytest.fixture()
    def init_form_importing(self):
        self.form = ZendeskImportForm(['import'])


    def test_menu(self, init_form):
        field = self.form.fields['menu']
        assert field
        assert set(field.queryset) == set(Menu.objects.filter(allow_porting=True))
        assert isinstance(field, ModelChoiceField)

    def test_domain(self, init_form):
        field = self.form.fields['domain']
        assert field
        assert field.required == False
        assert isinstance(field, CharField)

    def test_zendesk_category_name(self, init_form):
        field = self.form.fields['zendesk_category_name']
        assert field
        assert field.required == False
        assert isinstance(field, CharField)

    def test_api_token(self, init_form):
        field = self.form.fields['api_token']
        assert field
        assert field.required == False
        assert isinstance(field, CharField)

    def test_zendesk_email(self, init_form):
        field = self.form.fields['zendesk_email']
        assert field
        assert field.required == False
        assert isinstance(field, CharField)

    def test_zendesk_password(self, init_form):
        field = self.form.fields['zendesk_password']
        assert field
        assert field.required == False
        assert isinstance(field.widget, PasswordInput)
        assert isinstance(field, CharField)

    def test_importing_is_false(self, init_form):
        assert self.form.importing == False

    def test_importing_is_true(self, init_form_importing):
        assert self.form.importing == True

    def test_clean_is_valid(self):
        data = {
            'domain': 'testdomain',
            'zendesk_category_name': 'testcategoryname',
            'menu': self.porting_menu.id,
            'import': True
        }
        self.form = ZendeskImportForm(data)
        # No Errors
        self.form.is_valid()
        self.form.clean()

    def test_clean_throws_no_domain_error(self):
        data = {
            'zendesk_category_name': 'testcategoryname',
            'menu': self.porting_menu.id,
            'import': True
        }
        self.form = ZendeskImportForm(data)
        self.form.is_valid()
        with pytest.raises(ValidationError, match='Domain required if importing'):
            self.form.clean()

    def test_clean_throws_no_zendesk_category_error(self):
        data = {
            'domain': 'testdomain',
            'menu': self.porting_menu.id,
            'import': True
        }
        self.form = ZendeskImportForm(data)
        self.form.is_valid()
        with pytest.raises(ValidationError, match='Zendesk Category Name required if importing'):
            self.form.clean()

    def test_clean_does_not_throw_domain_or_zendesk_errors_if_importing_is_false(self):
        data = {
            'menu': self.porting_menu.id,
        }
        self.form = ZendeskImportForm(data)
        assert self.form.importing == False
        self.form.is_valid()
        self.form.clean()
