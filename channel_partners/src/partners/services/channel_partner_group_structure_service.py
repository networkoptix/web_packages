import uuid
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
    CloudUser,
    Organization,
)
from partners.serializers import OrganizationDataSerializer
from partners.utils.cache_keys import cache_key_channel_partner_structure


class ChannelPartnerGroupStructureService:
    CACHE_TIMEOUT = 3600  # Seconds | [1 Hour]

    def process(self, channel_partner: ChannelPartner, user: CloudUser) -> List[Dict[str, Any]]:
        # Check if the user has permission to view service reports for the root channel partner
        if not channel_partner.is_member(user):
            raise PermissionDenied("Permission denied.")
        # Removed caching due to this discussion
        # https://networkoptix.slack.com/archives/C06CM3R02CU/p1712694051369009
        computed = self._compute(channel_partner, user)
        return computed

    @staticmethod
    def _compute(channel_partner: ChannelPartner, user: CloudUser, single_root: bool = True) -> List[Dict[str, Any]]:
        descendants: QuerySet[ChannelPartner] = (
            ChannelPartner.objects
            .filter(Q(path__contains=[channel_partner.id]) | Q(id=channel_partner.id))
            .order_by("created_ts"))

        descendants = descendants.prefetch_related(
            Prefetch('organizations', queryset=Organization.objects.all()))

        descendant_channel_partners: List[ChannelPartner] = list(descendants)
        channel_partner_mapping: Dict[uuid.UUID, ChannelPartner] = {cp.id: cp for cp in descendant_channel_partners}

        structured_data: Dict[uuid.UUID, Dict[str, Any]] = {}
        root_data: List[Dict[str, Any]] = []

        for cp in descendant_channel_partners:
            cp_parent: ChannelPartner = cp.parent_channel_partner
            # Check if the user has permission to view service reports for this channel partner
            if not (cp.is_member(user) or cp_parent.is_member(user)):
                continue

            # Filter organizations based on the user's permission to view their parent channel partner's service reports
            organizations = [org for org in cp.organizations.all() if org.channel_partner.is_member(user)]
            organizations_data = OrganizationDataSerializer(organizations, many=True).data

            cp_data: Dict[str, Any] = {
                "id": str(cp.id),
                "name": cp.name,
                "effectiveState": ChannelPartnerStates.STATE_TEXTS[cp.effective_state],
                "subChannels": [],
                "organizations": organizations_data,
            }

            structured_data[cp.id] = cp_data

            if cp.parent_channel_partner and cp_parent.id in channel_partner_mapping and cp_parent.id in structured_data:
                structured_data[cp_parent.id]["subChannels"].append(cp_data)
            elif single_root:
                if len(root_data) == 0:
                    root_data.append(cp_data)
            else:
                root_data.append(cp_data)

        return root_data

    def _get_cached_data(self, channel_partner_id: str | uuid.UUID, user_id: str | uuid.UUID):
        cache_key: str = cache_key_channel_partner_structure(channel_partner_id, user_id)
        return caches['default'].get(cache_key)

    def _set_cached_data(
            self,
            channel_partner_id: str | uuid.UUID,
            user_id: str | uuid.UUID,
            data: List[Dict[str, Any]]
    ) -> None:
        cache_key: str = cache_key_channel_partner_structure(channel_partner_id, user_id)
        caches['default'].set(cache_key, data, timeout=self.CACHE_TIMEOUT)
