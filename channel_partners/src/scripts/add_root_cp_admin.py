# Script to add a root channel partner admin user
# Accepts email as an argument

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudUser,
)


def run(email):
    cp = ChannelPartner.objects.filter(parent_channel_partner=None).first()
    if not cp:
        print("Root channel partner not found. Please make sure the app service has started at least once.")
        return
    user = CloudUser.objects.get_or_create(email=email)[0]
    ChannelPartnerToUser.objects.get_or_create(user=user, channel_partner=cp, roles=[ChannelPartnerRoles.ADMINISTRATOR])
    print(f"Added user {email} as a root channel partner admin")
