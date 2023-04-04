import base64

from django import forms
from django.conf import settings
from django.core.validators import EmailValidator
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.contrib.auth.models import Group
from django.urls import reverse
from dal import autocomplete

from api.account_backend import AccountManager
from api.models import Account
from cms.models import (
    Customization, Asset, AssetType, UserGroupsToAssetPermissions, UserGroupsToAssetType)
from notifications import notifications_api

User = get_user_model()
assets_help_text = "Grants group permissions to the selected assets.<br>" \
                   "If the chosen asset is a cloud portal, permissions for the portal's customization are " \
                   "granted.<br>" \
                   "Example: The user can review any assets which have the same customization as their portal."

asset_types_help_text = "Allows this group to review the selected asset_types. This field only affects " \
                        "a users ability to review assets unless \"All assets\" is selected above."

all_assets_help_text = "If enabled, all permissions above are also applied to ALL assets of selected types below."


class AccountAdminForm(forms.ModelForm):
    class Meta:
        model = Account
        exclude = []
        widgets = {
            'groups': FilteredSelectMultiple('groups', False)
        }


# Create ModelForm based on the Group model.
class GroupAdminForm(forms.ModelForm):
    class Meta:
        model = Group
        exclude = []

    # Add the users field.
    users = forms.ModelMultipleChoiceField(
        queryset=User.objects.all(),
        required=False,
        # Use the pretty 'filter_horizontal widget'.
        widget=autocomplete.ModelSelect2Multiple(url='account-autocomplete',
                                                 attrs={
                                                     # Set some placeholder
                                                     'data-placeholder': 'Email ...',
                                                     # Only trigger autocompletion after 2 characters have been typed
                                                     'data-minimum-input-length': 2
                                                 })
                                            )

    assets = forms.ModelMultipleChoiceField(
        queryset=Asset.objects.all(),
        required=False,
        help_text=assets_help_text,
        widget=FilteredSelectMultiple('assets', False)
    )

    all_assets = forms.BooleanField(required=False, help_text=all_assets_help_text)

    asset_types = forms.ModelMultipleChoiceField(
        queryset=AssetType.objects.all(),
        required=False,
        help_text=asset_types_help_text,
        widget=FilteredSelectMultiple('asset_types', False)
    )

    def __init__(self, *args, **kwargs):
        # Do the normal form initialisation.
        super(GroupAdminForm, self).__init__(*args, **kwargs)
        # If it is an existing group (saved objects have a pk).
        if self.instance.pk:
            # Populate the users field with the current Group users.
            self.fields['users'].initial = self.instance.user_set.all()
            self.fields['assets'].initial = UserGroupsToAssetPermissions.objects.filter(group=self.instance)\
                .values_list('asset', flat=True).distinct()
            self.fields['asset_types'].initial = UserGroupsToAssetType.objects.filter(group=self.instance)\
                .values_list('asset_type', flat=True).distinct()
            self.fields['users'].help_text = f'<a href="{reverse("admin:invite")}?group_id={self.instance.id}" target="_blank" class="addLink">+ Invite to this group</a>'
            self.fields['all_assets'].initial = self.instance.options.all_assets

    def save_m2m(self):
        # Add the users to the Group.
        self.instance.user_set.set(self.cleaned_data['users'])

        for asset in self.cleaned_data['assets']:
            UserGroupsToAssetPermissions.objects.get_or_create(group=self.instance, asset=asset)

        UserGroupsToAssetPermissions.objects.filter(group=self.instance).\
            exclude(asset__in=self.cleaned_data['assets']).delete()

        for asset_type in self.cleaned_data['asset_types']:
            UserGroupsToAssetType.objects.get_or_create(group=self.instance, asset_type=asset_type)

        UserGroupsToAssetType.objects.filter(group=self.instance).\
            exclude(asset_type__in=self.cleaned_data['asset_types']).delete()

    def save(self, *args, **kwargs):
        # Default save
        instance = super(GroupAdminForm, self).save()

        instance.options.all_assets = self.cleaned_data['all_assets']
        instance.options.save()

        # Save many-to-many data
        self.save_m2m()
        return instance


class UserInviteFrom(forms.Form):
    email = forms.CharField(max_length=100, validators=[EmailValidator()])
    customization = forms.ChoiceField(choices=[])
    message = forms.CharField(widget=forms.Textarea)

    def __init__(self, *args, request, **kwargs):
        self.user = kwargs.pop('user', None)
        self.request = request
        super(UserInviteFrom, self).__init__(*args, **kwargs)
        self.fields['customization'].initial = request.CUSTOMIZATION
        if self.user:
            self.fields['customization'].choices = [
                (customization, customization) for customization in self.user.customizations
            ]

    @staticmethod
    def add_user(request, group=None):
        email = request.POST['email']
        customization = request.CUSTOMIZATION
        message = request.POST['message']
        user = User.objects.filter(email=email).first()
        if user:
            if group is None:
                messages.error(request, "User already has a cloud account!")
            elif group.user_set.filter(email=user.email).exists():
                messages.error(request, f'User already in "{group.name}" group.')
            else:
                group.user_set.add(user)
                messages.success(request, f'User successfully added to "{group.name}" group.')
            return user.id

        messages.success(request, "User has been invited to cloud.")
        language_code = Customization.objects.get(name=customization).default_language.code
        user = Account(email=email, customization=customization, language=language_code, is_active=False)
        user.save()
        if group:
            group.user_set.add(user)
        # Password in the encoded email doesnt matter its just a place holder.
        encode_email = base64.b64encode(f"password:{email}".encode('utf-8')).decode('utf-8')
        notifications_api.send(email, 'cloud_invite', {"message": message, "code": encode_email}, customization=customization)

        return user.id
