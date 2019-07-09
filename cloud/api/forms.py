from django import forms
from django.core.validators import EmailValidator
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.contrib.auth.models import Group
from dal import autocomplete

import base64
from api.account_backend import AccountManager
from api.models import Account
from cms.models import Customization, Product, ProductType, UserGroupsToProductPermissions, UserGroupsToProductType
from notifications import notifications_api

User = get_user_model()
product_types_help_text = "Allows this group to review the selected product_types. This field currently only affects " \
                          "a users ability to review assets."


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

    products = forms.ModelMultipleChoiceField(
        queryset=Product.objects.all(),
        required=False,
        help_text="Binds the selected permissions from above to the selected products.",
        widget=FilteredSelectMultiple('products', False)
    )

    product_types = forms.ModelMultipleChoiceField(
        queryset=ProductType.objects.all(),
        required=False,
        help_text=product_types_help_text,
        widget=FilteredSelectMultiple('product_types', False)
    )

    def __init__(self, *args, **kwargs):
        # Do the normal form initialisation.
        super(GroupAdminForm, self).__init__(*args, **kwargs)
        # If it is an existing group (saved objects have a pk).
        if self.instance.pk:
            # Populate the users field with the current Group users.
            self.fields['users'].initial = self.instance.user_set.all()
            self.fields['products'].initial = UserGroupsToProductPermissions.objects.filter(group=self.instance)\
                .values_list('product', flat=True).distinct()
            self.fields['product_types'].initial = UserGroupsToProductType.objects.filter(group=self.instance)\
                .values_list('product_type', flat=True).distinct()

    def save_m2m(self):
        # Add the users to the Group.
        self.instance.user_set.set(self.cleaned_data['users'])

        for product in self.cleaned_data['products']:
            if not UserGroupsToProductPermissions.objects.filter(group=self.instance, product=product).first():
                UserGroupsToProductPermissions.objects.create(group=self.instance, product=product)

        remove_permissions = UserGroupsToProductPermissions.objects.filter(group=self.instance).\
            exclude(product__in=self.cleaned_data['products'])
        for product_group in remove_permissions:
            product_group.delete()

        for product_type in self.cleaned_data['product_types']:
            if not UserGroupsToProductType.objects.filter(group=self.instance, product_type=product_type).first():
                UserGroupsToProductType.objects.create(group=self.instance, product_type=product_type)

        remove_product_types = UserGroupsToProductType.objects.filter(group=self.instance).\
            exclude(product_type__in=self.cleaned_data['product_types'])
        for product_type_group in remove_product_types:
            product_type_group.delete()

    def save(self, *args, **kwargs):
        # Default save
        instance = super(GroupAdminForm, self).save()
        # Save many-to-many data
        self.save_m2m()
        return instance


class UserInviteFrom(forms.Form):
    email = forms.CharField(max_length=100, validators=[EmailValidator()])
    customization = forms.ChoiceField(choices=[])
    message = forms.CharField(widget=forms.Textarea)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super(UserInviteFrom, self).__init__(*args, **kwargs)
        if self.user:
            self.fields['customization'].choices = [(customization, customization) for customization in self.user.customizations]

    @staticmethod
    def add_user(request):
        email = request.POST['email']
        customization = request.POST['customization']
        message = request.POST['message']
        if AccountManager.is_email_in_portal(email):
            messages.error(request, "User already has a cloud account!")
            return Account.objects.get(email=email).id

        messages.success(request, "User has been invited to cloud.")
        language_code = Customization.objects.get(name=customization).default_language.code
        user = Account(email=email, customization=customization, language=language_code, is_active=False)
        user.save()
        # Password in the encoded email doesnt matter its just a place holder.
        encode_email = base64.b64encode(f"password:{email}".encode('utf-8')).decode('utf-8')
        notifications_api.send(email, 'cloud_invite', {"message": message, "code": encode_email}, customization)

        return user.id
