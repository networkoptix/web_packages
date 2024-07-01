import sys
from uuid import UUID

from django.conf import settings
from django.core.management import BaseCommand
from django.core.validators import validate_email

from channel_partners.settings import EnvironmentEnum
from partners.models import (
    CloudUser,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)
from tools.helpers import cast_uuid


EMAIL_HOST = "networkoptix.com"


class Command(BaseCommand):
    help = "Adds administrators to organization"

    def add_arguments(self, parser):
        parser.add_argument("--emails", type=str, nargs='+', required=True, help="List of emails to add")
        parser.add_argument("--organization", type=str, required=True, help="Organization name or id")

    def handle(self, *args, **options):
        if settings.INSTANCE_NAME == EnvironmentEnum.prod:
            self.stdout.write(self.style.ERROR("This command cannot be run on prod!"))
            sys.exit(1)
        emails = options['emails']
        organization_lookup = options['organization']
        if not (organization := Organization.objects.filter(name=organization_lookup).first()):
            pk = cast_uuid(organization_lookup)
            if isinstance(pk, UUID):
                organization = Organization.objects.filter(pk=pk).first()
        if not organization:
            self.stdout.write(self.style.ERROR(f"Organization not found by lookup string: {organization_lookup}!"))
            sys.exit(1)
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
            relation, _ = OrganizationToUser.objects.get_or_create(organization=organization, user=user)
            relation.roles = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
            relation.save()
            self.stdout.write(f'{organization.pk}:{organization.name}:{user.email}')
        self.stdout.write(self.style.SUCCESS("Done!"))
