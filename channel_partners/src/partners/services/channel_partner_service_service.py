class ChannelPartnerServiceService:

    @staticmethod
    def clone(
            channel_partner: 'ChannelPartner',
            original_service: 'ChannelPartnerService'
    ) -> 'ChannelPartnerService':
        from partners.models import ChannelPartnerService
        """
        Clone an existing ChannelPartnerService instance and create a new one with the same attributes.
        
        :param channel_partner: The ChannelPartner to which the cloned service will be assigned.
        :type channel_partner: ChannelPartner
        :param original_service: The ChannelPartnerService instance to clone.
        :type original_service: ChannelPartnerService
        :return: A new ChannelPartnerService instance with the same attributes as the original service, but assigned to the specified partner.
        :rtype: ChannelPartnerService
        """
        copy = ChannelPartnerService(
            type=original_service.type,
            created_by_channel_partner=channel_partner,
            state=original_service.state,
            name=original_service.name,
            description=original_service.description,
            parameters=original_service.parameters,
            parent_service=original_service,
            sub_type=original_service.sub_type,
            duration=original_service.duration,
            # Do not set conversion_service here; it will be set later if applicable
        )

        if original_service.conversion_service:
            try:
                # Find the cloned conversion service for this channel partner
                conversion_service_clone = ChannelPartnerService.objects.get(
                    parent_service=original_service.conversion_service,
                    created_by_channel_partner=channel_partner
                )
                copy.conversion_service = conversion_service_clone
            except ChannelPartnerService.DoesNotExist:
                # If the conversion service clone does not exist, it means we need to clone it first
                conversion_service_clone = ChannelPartnerServiceService.clone(
                    channel_partner,
                    original_service.conversion_service
                )
                copy.conversion_service = conversion_service_clone

        # Call super().save() on the model instance to bypass the custom save method
        super(ChannelPartnerService, copy).save()
        return copy
