from enum import Enum
from typing import (
    List,
    Tuple,
    TypedDict,
)
from uuid import UUID

import structlog
from django.db import transaction
from django.db.models import QuerySet

from partners.models import (
    ChannelPartner,
    ChannelPartnerRoles,
    ChannelPartnerToUser,
    CloudHost,
    CloudUser,
    Organization,
    OrganizationRoles,
    OrganizationToUser,
)


logger = structlog.get_logger(__name__)


class InternalGrantAccessResult(TypedDict):
    # NX Stuff
    nx_admin: CloudUser
    cp_admin: CloudUser
    org_admin: CloudUser
    nx_cp: ChannelPartner
    cp: ChannelPartner
    org: Organization
    # Meta Stuff
    meta_admin: CloudUser
    meta_cp_admin: CloudUser
    meta_org_admin: CloudUser
    meta_nx_cp: ChannelPartner
    meta_cp: ChannelPartner
    meta_org: Organization


class UserType(Enum):
    NX = "NX"
    META = "META"


class InternalGrantAccessService:
    """
    A class to handle granting access to internal users
    """

    @classmethod
    def process(cls, email: str, hostname: str) -> InternalGrantAccessResult:
        """
        Processes the granting of access for an internal user.
        """
        base_user: str = email.split("@")[0]
        cloud_host: CloudHost = CloudHost.objects.get(hostname=hostname)
        with transaction.atomic():
            # Create Default Things
            nx_admin, cp_admin, org_admin = cls.__get_cloud_users(base_user, UserType.NX)
            nx_cp: ChannelPartner = cls.__get_root_channel_partner(cloud_host)
            cp, org = cls.__get_or_create_org_and_partners(nx_cp, base_user, cloud_host, UserType.NX)

            cls.__apply_channel_partner_role(nx_admin, nx_cp)
            cls.__apply_channel_partner_role(cp_admin, cp)
            cls.__apply_organization_role(org_admin, org)

            # Create Meta Things
            meta_admin, meta_cp_admin, meta_org_admin = cls.__get_cloud_users(base_user, UserType.META)
            meta_nx_cp: ChannelPartner = cls.__get_meta_root_channel_partner(nx_cp)
            meta_cp, meta_org = cls.__get_or_create_org_and_partners(meta_nx_cp, base_user, cloud_host, UserType.META)

            cls.__apply_channel_partner_role(meta_admin, meta_nx_cp)
            cls.__apply_channel_partner_role(meta_cp_admin, meta_cp)
            cls.__apply_organization_role(meta_org_admin, meta_org)

            return {
                # NX Stuff
                'nx_admin': nx_admin,
                'cp_admin': cp_admin,
                'org_admin': org_admin,
                'nx_cp': nx_cp,
                'cp': cp,
                'org': org,
                # Meta Stuff
                'meta_admin': meta_admin,
                'meta_cp_admin': meta_cp_admin,
                'meta_org_admin': meta_org_admin,
                'meta_nx_cp': meta_nx_cp,
                'meta_cp': meta_cp,
                'meta_org': meta_org
            }

    @classmethod
    def __get_root_channel_partner(cls, cloud_host: CloudHost) -> ChannelPartner:
        """
        Gets the root channel partner for a given cloud host.
        """
        return ChannelPartner.objects.filter(parent_channel_partner__isnull=True, cloud_host=cloud_host).first()

    @classmethod
    def __get_meta_root_channel_partner(cls, parent_channel_partner: ChannelPartner) -> ChannelPartner:
        """
        Gets the meta root channel partner for a given parent channel.
        """
        return ChannelPartner.objects.filter(parent_channel_partner=parent_channel_partner, name="metavms").first()

    @classmethod
    def __get_or_create_org_and_partners(
            cls,
            host_root_cp: ChannelPartner,
            base_user: str,
            cloud_host: CloudHost,
            user_type: UserType
    ) -> Tuple['ChannelPartner', 'Organization']:
        """
        Gets or creates an organization and its associated channel partner for a given internal user.
        """
        channel_partner_name: str
        organization_name: str

        if user_type is UserType.NX:
            channel_partner_name = f"{base_user}'s Channel Partner"
            organization_name = f"{base_user}'s Organization"
        elif user_type is UserType.META:
            channel_partner_name = f"{base_user}'s Meta Partner"
            organization_name = f"{base_user}'s Meta Organization"
        else:
            raise ValueError(f"Unsupported user_type: {user_type}")

        # Channel Partner Stuff
        channel_partner_qs = ChannelPartner.objects.filter(
            parent_channel_partner=host_root_cp,
            name=channel_partner_name,
            cloud_host=cloud_host)

        if channel_partner_qs.count() > 1:
            logger.warning(
                "Multiple channel partners found",
                channel_partner_name=channel_partner_name,
                parent_channel_partner=host_root_cp.name,
                cloud_host=cloud_host.hostname)
            channel_partner = channel_partner_qs.first()

        elif channel_partner_qs.count() == 0:
            channel_partner = ChannelPartner.objects.create(
                parent_channel_partner=host_root_cp,
                name=channel_partner_name,
                cloud_host=cloud_host)
        else:
            channel_partner = channel_partner_qs.first()

        # Organization Stuff
        organization_qs = Organization.objects.filter(
            channel_partner=channel_partner,
            name=organization_name)
        if organization_qs.count() > 1:
            logger.warning(
                "Multiple organizations found",
                organization_name=organization_name,
                parent_channel_partner=host_root_cp.name,
                cloud_host=cloud_host.hostname)
            organization = organization_qs.first()
        elif organization_qs.count() == 0:
            organization = Organization.objects.create(
                channel_partner=channel_partner,
                name=organization_name)
        else:
            organization = organization_qs.first()

        return channel_partner, organization

    @classmethod
    def __apply_organization_role(cls, user: CloudUser, organization: Organization) -> OrganizationToUser:
        """
        Applies an organization role to a given internal user for a specific organization.
        """
        org_admin_role: List[UUID] = [OrganizationRoles.ORGANIZATION_ADMINISTRATOR]

        organization_user: OrganizationToUser = OrganizationToUser.objects.filter(
            user=user,
            organization=organization)

        if organization_user.exists():
            logger.info(
                "Found user and deleting from organization_to_user",
                email=user.email)
            organization_user.delete()

        return OrganizationToUser(
            user=user,
            organization=organization,
            roles=org_admin_role).save()

    @classmethod
    def __apply_channel_partner_role(cls, user: CloudUser, channel_partner: ChannelPartner) -> ChannelPartnerToUser:
        """
         Applies a channel partner role to a given internal user for a specific channel partner.
        """
        admin_role: List[UUID] = [ChannelPartnerRoles.ADMINISTRATOR]

        channel_partner_user: QuerySet[ChannelPartnerToUser] = ChannelPartnerToUser.objects.filter(
            user=user,
            channel_partner=channel_partner)

        if channel_partner_user.exists():
            logger.info(
                "Found user and deleting from channel_partner_to_user",
                email=user.email)
            channel_partner_user.delete()

        return ChannelPartnerToUser(
            user=user,
            channel_partner=channel_partner,
            roles=admin_role).save()

    @classmethod
    def __get_cloud_users(
            cls,
            base_user: str,
            user_type: UserType
    ) -> Tuple['CloudUser', 'CloudUser', 'CloudUser']:
        """
        Gets or creates three internal users with specific roles for a given username.
        """
        domain: str = "networkoptix.com"

        if user_type is UserType.NX:
            postfixes = {"root": "nxadmin", "cp": "cpadmin", "org": "orgadmin"}
        elif user_type is UserType.META:
            postfixes = {"root": "metaadmin", "cp": "metacpadmin", "org": "metaorgadmin"}
        else:
            raise ValueError(f"Unsupported user_type: {user_type}")

        nx_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+{postfixes.get("root")}@{domain}')
        cp_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+{postfixes.get("cp")}@{domain}')
        org_admin, _ = CloudUser.objects.get_or_create(email=f'{base_user}+{postfixes.get("org")}@{domain}')

        return nx_admin, cp_admin, org_admin
