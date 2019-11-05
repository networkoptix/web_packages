from django import forms
from django.contrib.admin.widgets import FilteredSelectMultiple

from .models import CloudNotification, PushSubscription
from cms.models import Customization, UserGroupsToAssetPermissions

from dal import autocomplete


class CloudNotificationAdminForm(forms.ModelForm):
    class Meta:
        model = CloudNotification
        exclude = []

    customizations = forms.ModelMultipleChoiceField(
        queryset=Customization.objects.values_list('name', flat=True),
        required=False,
        widget=FilteredSelectMultiple('customizations', False)
    )

    def __init__(self, *args, **kwargs):
        # Do the normal form initialisation.
        self.user = kwargs.pop('user', None)
        super(CloudNotificationAdminForm, self).__init__(*args, **kwargs)  # 'send_cloud_notification'

        if self.instance.pk and not self.instance.sent_date:
            groups = self.user.groups.filter(permissions__codename__contains="send_cloud_notification")
            asset_groups = UserGroupsToAssetPermissions.objects.filter(group__in=groups).distinct()
            customizations = [asset_group.asset.customizations.first().name for asset_group in asset_groups]
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
