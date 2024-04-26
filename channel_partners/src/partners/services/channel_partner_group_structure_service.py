import typing
import uuid
from enum import (
    StrEnum,
    auto,
)
from typing import (
    Any,
    Dict,
    List,
)

from django.core.cache import caches
from django.core.exceptions import PermissionDenied
from django.db.models import (
    Prefetch,
    Q,
    QuerySet,
)

from partners.models import (
    ChannelPartner,
    ChannelPartnerStates,
    ChannelPartnerToUser,
    CloudUser,
    Organization,
)
from partners.utils.cache_keys import (
    cache_key_channel_partner_descendents_structure,
    cache_key_full_channel_partner_structure,
)


class InputType(StrEnum):
    SINGLE = auto()
    MULTI = auto()


class ChannelPartnerGroupStructureService:
    CACHE_TIMEOUT = 3600

    def process_descendants(self, channel_partner: ChannelPartner, user: CloudUser) -> List[Dict[str, Any]]:

        if not channel_partner.is_member(user):
            raise PermissionDenied("Permission denied.")

        # TODO: Implmeent caching and clearing of cache in future
        # cached_data = self._get_descendants_cached_data(channel_partner.id, user_id=user.pk)
        # if cached_data:
        #     return cached_data
        # else:
        computed = self._compute(channel_partner, user)
        # self._set_descendents_cached_data(channel_partner.id, user.pk, computed)
        return computed

    def process_full_structure(self, user: CloudUser) -> Dict[str, Any]:
        # TODO: Implmeent caching and clearing of cache in future
        # cached_data = self._get_full_structure_cached_data(user_id=user.pk)
        # if cached_data:
        #     return cached_data
        # else:
        channel_partners: QuerySet[ChannelPartner] = (
            ChannelPartner.objects.filter(channelpartnertouser__user=user)
        )
        computed = self._compute_full_structure(user, channel_partners)
        # self._set_full_structure_cached_data(user_id=user.pk, data=computed)
        return computed

    def _compute(
            self,
            channel_partner: ChannelPartner,
            user: CloudUser,
            single_root: bool = True
    ) -> List[Dict[str, Any]]:

        user_roles_set: typing.Set[uuid.UUID] = self._get_user_roles_set(user)

        descendant_channel_partners: List[ChannelPartner] = self._get_decendants(channel_partner, InputType.SINGLE)
        channel_partner_mapping = {
            cp.id: self._build_cp_data(cp, [])
            for cp in descendant_channel_partners
        }
        # structured_data: Dict[uuid.UUID, Dict[str, Any]] = {}
        root_data: List[Dict[str, Any]] = []

        for cp in descendant_channel_partners:
            cp_parent: ChannelPartner = cp.parent_channel_partner

            # Check if the channel partner or its parent is in the user's roles set
            if not (cp.id in user_roles_set or (cp_parent and cp_parent.id in user_roles_set)):
                continue

            cp_organizations: QuerySet[Organization] = cp.organizations.all().order_by("name")
            organizations = [org for org in cp_organizations if org.channel_partner_id in user_roles_set]
            organizations_data = self._build_org_data(organizations)

            # cp_data: Dict[str, Any] = self._build_cp_data(cp, organizations_data)
            channel_partner_mapping[cp.id]['organizations'] = organizations_data

            # structured_data[cp.id] = cp_data

            if cp.parent_channel_partner and cp_parent.id in channel_partner_mapping:
                channel_partner_mapping[cp_parent.id]["subChannels"].append(channel_partner_mapping.get(cp.id))
            elif single_root:
                if len(root_data) == 0:
                    root_data.append(channel_partner_mapping.get(cp.id))
            else:
                root_data.append(channel_partner_mapping.get(cp.id))

        return root_data

    def _compute_full_structure(self, user: CloudUser, channel_partners: QuerySet[ChannelPartner]) -> Dict[str, Any]:
        # User Organization Initialization
        member_organization_id_set: typing.Set[uuid.UUID] = set()
        user_organizations: Dict[uuid.UUID, Organization] = {}

        for organization in user.organizations.all():
            org_id = organization.id
            user_organizations[org_id] = organization

        user_roles_set = self._get_user_roles_set(user)

        descendant_channel_partners: List[ChannelPartner] = self._get_decendants(channel_partners, InputType.MULTI)
        cp_mapping: Dict[uuid.UUID, ChannelPartner] = {cp.id: cp for cp in descendant_channel_partners}

        root_data: List[Dict[str, Any]] = []
        structured_data: Dict[uuid.UUID, Dict[str, Any]] = {}

        for cp in descendant_channel_partners:
            cp_parent: ChannelPartner = cp.parent_channel_partner

            # Check membership by examining if a partner's ID or its parent's ID is in the pre-filtered set
            if not (cp.id in user_roles_set or cp_parent.id in user_roles_set):
                continue

            member_organizations: List[Organization] = []
            if cp.id in user_roles_set:
                for organization in cp.organizations.all().order_by("name"):
                    member_organizations.append(organization)
                    member_organization_id_set.add(organization.id)

            member_organizations_data = self._build_org_data(member_organizations)
            cp_data: Dict[str, Any] = self._build_cp_data(cp, member_organizations_data)
            structured_data[cp.id] = cp_data

            if cp.parent_channel_partner and cp_parent.id in cp_mapping and cp_parent.id in structured_data:
                structured_data[cp_parent.id]["subChannels"].append(cp_data)
            else:
                root_data.append(cp_data)

        for org_id in member_organization_id_set:
            if org_id in user_organizations:
                del user_organizations[org_id]

        non_member_organizations_data = self._build_org_data(list(user_organizations.values()))
        root_data = self._sort_channel_partners(root_data)
        return {
            "channelPartners": root_data,
            "organizations": non_member_organizations_data
        }

    def _get_user_roles_set(self, user: CloudUser) -> typing.Set[uuid.UUID]:
        # Pre-fetch user roles related to channel partners
        user_roles: List[uuid.UUID] = (
            ChannelPartnerToUser.objects
            .filter(user=user)
            .values_list('channel_partner_id', flat=True))
        return set(user_roles)

    def _build_cp_data(self, channel_partner: ChannelPartner, org_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "id": str(channel_partner.id),
            "name": channel_partner.name,
            "effectiveState": ChannelPartnerStates.STATE_TEXTS[channel_partner.effective_state],
            "subChannels": [],
            "organizations": org_data,
        }

    def _build_org_data(self, orgs: List[Organization]) -> List[Dict[str, Any]]:
        result = []
        for org in orgs:
            result.append({
                "id": org.id,
                "name": org.name,
                "effectiveState": org.effective_state,
            })
        return result

    def _get_decendants(
            self,
            channel_partner: typing.Union[ChannelPartner, QuerySet[ChannelPartner]],
            input_type: InputType
    ) -> List[ChannelPartner]:
        if input_type == InputType.MULTI:
            # Get Channel Partner IDs from passed in variable
            channel_partners_ids = [cp.id for cp in channel_partner]

            descendants: QuerySet[ChannelPartner] = (
                ChannelPartner.objects
                .filter(
                    Q(parent_channel_partner__id__in=channel_partners_ids) |
                    Q(id__in=channel_partners_ids)))
        else:
            descendants: QuerySet[ChannelPartner] = (
                ChannelPartner.objects
                .filter(
                    Q(path__contains=[channel_partner.id]) |
                    Q(id=channel_partner.id))
                .order_by('name'))

        descendants = descendants.prefetch_related(
            Prefetch('organizations', queryset=Organization.objects.all().order_by('name')))

        return list(descendants)

    def _sort_channel_partners(self, channel_partners: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Recursively sorts channel partners and their subchannels by name.

        :param channel_partners: A list of channel partner dictionaries.
        :return: A sorted list of channel partner dictionaries.
        """
        for cp in channel_partners:
            if 'subChannels' in cp and cp['subChannels']:
                cp['subChannels'] = self._sort_channel_partners(cp['subChannels'])

        # Sort the current level of channel partners by name
        return sorted(channel_partners, key=lambda x: x['name'])

    def _get_full_structure_cached_data(self, user_id: uuid.UUID) -> Dict[str, Any]:
        cache_key: str = cache_key_full_channel_partner_structure(user_id)
        return caches['default'].get(cache_key)

    def _set_full_structure_cached_data(self, user_id: str | uuid.UUID, data: Dict[str, Any]) -> None:
        cache_key: str = cache_key_full_channel_partner_structure(user_id)
        caches['default'].set(cache_key, data, timeout=self.CACHE_TIMEOUT)

    def _get_descendants_cached_data(self, channel_partner_id: str | uuid.UUID, user_id: str | uuid.UUID):
        cache_key: str = cache_key_channel_partner_descendents_structure(channel_partner_id, user_id)
        return caches['default'].get(cache_key)

    def _set_descendents_cached_data(
            self,
            channel_partner_id: str | uuid.UUID,
            user_id: str | uuid.UUID,
            data: List[Dict[str, Any]]
    ) -> None:
        cache_key: str = cache_key_channel_partner_descendents_structure(channel_partner_id, user_id)
        caches['default'].set(cache_key, data, timeout=self.CACHE_TIMEOUT)

    @staticmethod
    def clear_full_channel_structure_cache(user_id: uuid.UUID):
        cache_key: str = cache_key_full_channel_partner_structure(user_id)
        caches['default'].delete(cache_key)

    @staticmethod
    def clear_descendants_channel_structure_cache(channel_partner_id: str | uuid.UUID, user_id: str | uuid.UUID):
        cache_key: str = cache_key_channel_partner_descendents_structure(channel_partner_id, user_id)
        caches['default'].delete(cache_key)
