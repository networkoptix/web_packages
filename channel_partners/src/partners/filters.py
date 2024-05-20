from django_filters import FilterSet
from django_filters import rest_framework as filters


class UserFilter(FilterSet):
    lastModified__gte = filters.DateTimeFilter(field_name='last_modified', lookup_expr='gte')
    lastModified__lte = filters.DateTimeFilter(field_name='last_modified', lookup_expr='lte')
    email = filters.CharFilter(field_name='user__email', lookup_expr='icontains')
    ordering = filters.OrderingFilter(
        fields=[
            ('created_ts', 'created'),
            ('user__email', 'email'),
        ],
    )

class ChannelParrtnerUserFilter(FilterSet):
    lastModified__gte = filters.DateTimeFilter(field_name='last_modified', lookup_expr='gte')
    lastModified__lte = filters.DateTimeFilter(field_name='last_modified', lookup_expr='lte')
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



