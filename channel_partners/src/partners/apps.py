from django.apps import AppConfig
from django.db.models.signals import (
    post_delete,
    post_save,
)


def get_receivers():
    from partners.models import (
        ChannelPartner,
        ChannelPartnerService,
        ChannelPartnerServiceRecord,
        ChannelPartnerToUser,
        CloudSystemId,
        CloudUser,
        Organization,
        OrganizationToUser,
        ServiceToOrganizationProperties,
        ServiceToSubChannelProperties,
        ServiceUsage,
        SystemGroup,
    )
    from partners.receivers.channel_partner_receiver import (
        on_channel_partner_saved,
    )
    from partners.receivers.channel_partner_service_receiver import (
        on_channel_partner_service_deleted,
        on_channel_partner_service_saved,
    )
    from partners.receivers.channel_partner_service_record_receiver import (
        on_channel_partner_service_record_change,
        on_channel_partner_service_record_deleted,
    )
    from partners.receivers.channel_partner_to_user_receiver import (
        on_channel_partner_to_user_deleted,
        on_channel_partner_to_user_saved,
    )
    from partners.receivers.cloud_user_receiver import (
        on_cloud_user_deleted,
        on_cloud_user_saved,
    )
    from partners.receivers.organization_receiver import on_organization_saved
    from partners.receivers.organization_to_user_receiver import (
        on_organization_to_user_deleted,
        on_organization_to_user_saved,
    )
    from partners.receivers.service_to_organization_properties import (
        on_service_to_organization_properties_saved,
    )
    from partners.receivers.service_to_sub_channel_properties import (
        on_service_to_sub_channel_properties_saved,
    )
    from partners.receivers.service_usage_receiver import (
        on_service_usage_saved,
    )
    from partners.receivers.system_group_receiver import (
        on_system_group_deleted,
        on_system_group_saved,
    )

    return {
        CloudUser: {
            "post_save": on_cloud_user_saved,
            "post_delete": on_cloud_user_deleted,
        },
        ChannelPartner: {
            "post_save": on_channel_partner_saved,
        },
        Organization: {
            "post_save": on_organization_saved,
        },
        CloudSystemId: {
            # Not being used here. Using direct, non-signal implementation
            # Still placed in receivers for reference
            # "cloud_system_post_save": on_cloud_system_saved,
        },
        SystemGroup: {
            "post_save": on_system_group_saved,
            "post_delete": on_system_group_deleted,
        },
        ChannelPartnerToUser: {
            "post_save": on_channel_partner_to_user_saved,
            "post_delete": on_channel_partner_to_user_deleted,
        },
        OrganizationToUser: {
            "post_save": on_organization_to_user_saved,
            "post_delete": on_organization_to_user_deleted,
        },
        ChannelPartnerServiceRecord: {
            "post_save": on_channel_partner_service_record_change,
            "post_delete": on_channel_partner_service_record_deleted,
        },
        ChannelPartnerService: {
            "post_save": on_channel_partner_service_saved,
            "post_delete": on_channel_partner_service_deleted,
        },
        ServiceToOrganizationProperties: {
            "post_save": on_service_to_organization_properties_saved,
        },
        ServiceToSubChannelProperties: {
            "post_save": on_service_to_sub_channel_properties_saved,
        },
        ServiceUsage: {
            "post_save": on_service_usage_saved,
        },
    }


class PartnersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'partners'

    def ready(self):
        # Get list of receivers to then connect the signals
        connections = get_receivers()
        # Connect the signals
        for model, signals in connections.items():
            if signals.get("post_save"):
                post_save.connect(signals["post_save"], sender=model)
            if signals.get("post_delete"):
                post_delete.connect(signals["post_delete"], sender=model)
