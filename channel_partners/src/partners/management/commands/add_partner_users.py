import sys
from uuid import UUID

from django.conf import settings
from django.core.management import BaseCommand
from django.core.validators import validate_email

from channel_partners.settings import EnvironmentEnum
from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudUser,
)
from tools.helpers import cast_uuid


EMAIL_HOST = "networkoptix.com"


class Command(BaseCommand):
    help = "Adds administrators to ChannelPartner"

    def add_arguments(self, parser):
        parser.add_argument("--emails", type=str, nargs='+', required=True, help="List of emails to add")
        parser.add_argument("--partner", type=str, required=True, help="ChannelPartner name or id")

    def handle(self, *args, **options):
        if settings.INSTANCE_NAME == EnvironmentEnum.prod:
            self.stdout.write(self.style.ERROR("This command cannot be run on prod!"))
            sys.exit(1)
        emails = options['emails']
        partner_lookup = options['partner']
        if not (channel_partner := ChannelPartner.objects.filter(name=partner_lookup).first()):
            pk = cast_uuid(partner_lookup)
            if isinstance(pk, UUID):
                channel_partner = ChannelPartner.objects.filter(pk=pk).first()
        if not channel_partner:
            self.stdout.write(self.style.ERROR(f"ChannelPartner not found by lookup string: {partner_lookup}!"))
        self.stdout.write("Creating users...")
        for email in emails:
            email_base = email.split('@')[0]
            email = f"{email_base}@{EMAIL_HOST}"
            try:
                validate_email(email)
            except:
                self.stdout.write(self.style.ERROR(f"Email is not valid: {email}"))
                continue
            user, _ = CloudUser.objects.get_or_create(email=email)
            relation, _ = ChannelPartnerToUser.objects.get_or_create(channel_partner=channel_partner, user=user)
            relation.roles = [ChannelPartnerRoles.ADMINISTRATOR]
            relation.save()
            self.stdout.write(f'{channel_partner.id}:{channel_partner.name}:{user.email}')
        self.stdout.write(self.style.SUCCESS("Done!"))
