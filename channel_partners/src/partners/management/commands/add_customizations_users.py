import sys

from django.conf import settings
from django.core.management import BaseCommand
from django.core.validators import validate_email
from django.utils.text import slugify
from nx_ireg.registry import IReg

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudUser,
)


EMAIL_HOST = "networkoptix.com"


def get_base_email_name(email):
    return email.split('@')[0]


def get_email(email_base, suffix):
    return f"{email_base}+{suffix}admin@{EMAIL_HOST}"


class Command(BaseCommand):
    help = "Adds administrators to all customizations"

    def add_arguments(self, parser):
        parser.add_argument("--emails", type=str, nargs='+', required=True, help="List of emails to add")
        parser.add_argument("--include_root", action='store_true', default=False, help="Include root ChannelPartner")

    def add_administrators(self, channel_partner, emails, name=None):
        for email in emails:
            email_base = get_base_email_name(email)
            email = get_email(email_base, name or slugify(channel_partner.name))
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

    def handle(self, *args, **options):
        if settings.INSTANCE_NAME == settings.EnvironmentEnum.prod:
            self.stdout.write(self.style.ERROR("This command cannot be run on prod!"))
            sys.exit(1)
        try:
            root = ChannelPartner.objects.get(parent_channel_partner__isnull=True)
        except ChannelPartner.DoesNotExist:
            self.stdout.write(self.style.ERROR("No root ChannelPartner found!"))
            sys.exit(1)
        emails = options['emails']
        ireg = IReg(settings.INSTANCE_NAME)
        partners_names = [name for name, _ in ireg.get_other_customizations()]
        self.stdout.write(f"Found customizations: {partners_names}")
        customizations = ChannelPartner.objects.filter(name__in=partners_names, parent_channel_partner=root)
        if not customizations:
            self.stdout.write(self.style.ERROR("No customizations found!"))
            sys.exit(1)
        for partner in customizations:
            self.stdout.write(f"Adding administrators to {partner.name}")
            self.add_administrators(partner, emails)
        if options['include_root']:
            self.stdout.write(f"Adding administrators to {root.name}")
            self.add_administrators(root, emails, name="default")
        self.stdout.write(self.style.SUCCESS("Done!"))
