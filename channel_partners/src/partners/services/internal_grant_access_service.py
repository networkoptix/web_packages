from typing import (
    Dict,
    Iterable,
    List,
)

import structlog
from django.conf import settings
from django.db import transaction
from nx_ireg.helpers import get_customizations

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudUser,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)


logger = structlog.get_logger(__name__)

class CustomizationUsers:
    def __init__(self, customization: str, channel_partner: ChannelPartner, base_email: str):
        self.customization = customization
        self.cloud_host = channel_partner.cloud_host.hostname
        self.base_email = base_email
        self.email_name, self.email_domain = base_email.split('@')
        self.customization_partner = channel_partner
        self.sub_channel_partner: ChannelPartner | None = None
        self.organization: Organization | None = None
        self.users: List[ChannelPartnerToUser|OrganizationToUser] = []

    def customization_level_email(self):
        return f'{self.email_name}+{self.customization}admin@{self.email_domain}'.lower()

    def cp_level_email(self):
        return f'{self.email_name}+{self.customization}cpadmin@{self.email_domain}'.lower()

    def org_level_email(self):
        return f'{self.email_name}+{self.customization}orgadmin@{self.email_domain}'.lower()

    @staticmethod
    def create_channel_partner_role(email: str, channel_partner: ChannelPartner) -> ChannelPartnerToUser:
        user, user_created = CloudUser.objects.get_or_create(email=email)
        if user_created:
            relation = ChannelPartnerToUser.objects.create(
                user=user, channel_partner=channel_partner, roles=[ChannelPartnerRoles.ADMINISTRATOR])

        else:
            if not (relation := ChannelPartnerToUser.objects.filter(user=user, channel_partner=channel_partner).first()):
                relation = ChannelPartnerToUser(user=user, channel_partner=channel_partner)
            relation.roles = [ChannelPartnerRoles.ADMINISTRATOR]
            relation.save()
        return relation

    @staticmethod
    def create_organization_role(email: str, organization: Organization) -> OrganizationToUser:
        user, user_created = CloudUser.objects.get_or_create(email=email)
        if user_created:
            relation = OrganizationToUser.objects.create(
                user=user, organization=organization, roles=[OrganizationRoles.ORGANIZATION_ADMINISTRATOR])
        else:
            if not (relation := OrganizationToUser.objects.filter(user=user, organization=organization).first()):
                relation = OrganizationToUser(user=user, organization=organization)
            relation.roles = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]
            relation.save()
        return relation

    def get_sub_channel_partner(self) -> ChannelPartner:
        channel_partner_name = f"{self.email_name}'s {self.customization.capitalize()} Channel Partner"

        self.sub_channel_partner = ChannelPartner.objects.filter(
            name=channel_partner_name, parent_channel_partner=self.customization_partner
        ).first()
        if not self.sub_channel_partner:
            self.sub_channel_partner = ChannelPartner.objects.create(
                name=channel_partner_name, parent_channel_partner=self.customization_partner
            )
        return self.sub_channel_partner

    def get_organization(self) -> Organization:
        organization_name = f"{self.email_name}'s {self.customization.capitalize()} Organization"
        self.organization = Organization.objects.filter(
            name=organization_name, channel_partner=self.sub_channel_partner
        ).first()
        if not self.organization:
            self.organization = Organization.objects.create(
                name=organization_name, channel_partner=self.sub_channel_partner
            )
        return self.organization

    def create(self):
        self.get_sub_channel_partner()
        self.get_organization()

        self.users.append(self.create_channel_partner_role(
            self.customization_level_email(), self.customization_partner))

        self.users.append(self.create_channel_partner_role(
            self.cp_level_email(), self.sub_channel_partner))

        self.users.append(self.create_organization_role(
            self.org_level_email(), self.organization))


class InternalGrantAccessService:

    def __init__(self):
        self.root_partner = ChannelPartner.objects.filter(parent_channel_partner__isnull=True).first()
        if self.root_partner:
            self.customizations = self.get_customizations(self.root_partner)
        else:
            self.customizations = {}

    @classmethod
    def get_customizations(cls, root: ChannelPartner = None) -> Dict[str, str]:
        if settings.IS_PRIVATE_CLOUD:
            try:
                root_cp = root or ChannelPartner.objects.get(parent_channel_partner__isnull=True)
                customizations = {'default': root_cp.cloud_host.hostname}
            except ChannelPartner.DoesNotExist:
                customizations = {}
        else:
            try:
                customizations = dict(get_customizations(settings.INSTANCE_NAME))
            except Exception as e:
                logger.error(f"Cannot get customizations from ireg.",
                             exception=str(e))
                customizations = {}

        return customizations

    @classmethod
    def get_customization_partners(cls, customization_names: Iterable[str]) -> Dict[str, ChannelPartner]:
        customization_names = set(customization_names)
        customization_names.discard('default')
        channel_partners = ChannelPartner.objects.filter(name__in=customization_names, path__len=1).order_by('name')
        return {cp.name: cp for cp in channel_partners}

    def new_process(
            self,
            base_email,
    ) -> List[CustomizationUsers]:

        if not self.customizations:
            return []
        customization_partners = {
            'default': self.root_partner,
        }
        customization_partners.update(**self.get_customization_partners(self.customizations.keys()))
        customizations_users = []
        with transaction.atomic():
            for customization, partner in customization_partners.items():
                branch = CustomizationUsers(customization, partner, base_email)
                branch.create()
                customizations_users.append(branch)
        return customizations_users

