from django import forms
from django.contrib.admin.widgets import FilteredSelectMultiple
from django.contrib.auth import get_user_model
from dal import autocomplete

# Forms use some models from cms, maybe move to main app
from cms.models import AssetType, Customization, UserGroupsToAssetPermissions
from notifications.models import CloudNotification, PushSubscription

User = get_user_model()


class CloudNotificationAdminForm(forms.ModelForm):
    class Meta:
        model = CloudNotification
        exclude = []

    customizations = forms.ModelMultipleChoiceField(
        queryset=Customization.objects.values_list('name', flat=True),
        required=False,
        widget=FilteredSelectMultiple('customizations', False)
    )
    test_users = forms.ModelMultipleChoiceField(
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

    def __init__(self, *args, **kwargs):
        # Do the normal form initialisation.
        self.user = kwargs.pop('user', None)
        super(CloudNotificationAdminForm, self).__init__(*args, **kwargs)  # 'send_cloud_notification'

        if self.instance.pk and not self.instance.sent_date:
            groups = self.user.groups.filter(permissions__codename__contains="send_cloud_notification")
            asset_groups = UserGroupsToAssetPermissions.objects.\
                filter(group__in=groups, asset__asset_type__type=AssetType.ASSET_TYPES.cloud_portal).distinct()

            customizations = []
            for asset_group in asset_groups:
                asset_customizations = asset_group.asset.customizations
                if len(asset_customizations.all()) > 0:
                    customizations.append(asset_customizations.first().name)

            self.fields['customizations'].queryset = Customization.objects.filter(name__in=customizations)\
                .values_list('name', flat=True)
            self.initial['customizations'] = self.instance.customizations.values_list('name', flat=True)


class PushSubscriptionForm(forms.ModelForm):
    class Meta:
        model = PushSubscription
        exclude = []
        widgets = {
            'account': autocomplete.ModelSelect2(
                url='account-autocomplete',
                attrs={'data-placeholder': 'Email ...', 'data-minimum-input-length': 2}
            ),
        }
