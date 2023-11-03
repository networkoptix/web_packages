from django_filters import FilterSet
from django_filters import rest_framework as filters


class UserFilter(FilterSet):
    # channel_partner_id = filters.CharFilter(field_name='channel_partner_id', lookup_expr='icontains')
    # channel_partner_name = filters.CharFilter(field_name='channel_partner__name', lookup_expr='icontains')
    email = filters.CharFilter(field_name='user__email', lookup_expr='icontains')
    ordering = filters.OrderingFilter(
        fields=[
            ('created_ts', 'created'),
            ('user__email', 'email'),
        ],
    )


class CreatedTsFilter(FilterSet):
    ordering = filters.OrderingFilter(
        fields=[
            ('created_ts', 'created'),
        ]
    )


class CreatedTsAndNameFilter(FilterSet):
    name = filters.CharFilter(field_name='name', lookup_expr='icontains')
    ordering = filters.OrderingFilter(
        fields=[
            ('created_ts', 'created'),
            ('name', 'name'),
        ]
    )


class CreatedTsAndIdAndNameFilter(CreatedTsAndNameFilter):
    # search id by exact match only
    id = filters.CharFilter(field_name='id')


class ChannelPartnerFilter(CreatedTsAndIdAndNameFilter):
    pass


class OrganizationFilter(CreatedTsAndIdAndNameFilter):
    pass


class ExternalId(FilterSet):
    custom_id = filters.CharFilter(field_name='custom_id', lookup_expr='icontains')
    ordering = filters.OrderingFilter(
        fields=[
            ('created_ts', 'created'),
            ('custom_id', 'custom_id'),
        ]
    )



