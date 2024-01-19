from time import time

from django.core.cache import caches
from django.utils.functional import cached_property

from conftest import RequestFactory
from partners.models import (
    ChannelPartner,
    CloudSystemId,
    CloudUser,
    Organization,
)
from partners.serializers import (
    ChannelPartnerSerializer,
    CloudSystemSerializer,
    OrganizationSerializer,
)
from tools.access_matrix import (
    AccessMatrixDict,
    UserAccessMatrix,
)


def clean_cache():
    caches['local'].delete("channel_partner_roles")
    caches['local'].delete("organization_roles")
    caches['local'].delete("access_matrix_channelpartner")


def cp_queryset():
    return ChannelPartner.objects.all()


def org_queryset():
    return Organization.objects.all()


def sys_queryset():
    return CloudSystemId.objects.all().select_related('organization')


def user():
    return CloudUser.objects.filter(email='kapanovich@networkoptix.com').first()


class UserAMDict(UserAccessMatrix):
    matrix_class = AccessMatrixDict


class ChannelPartnerSerializerOnDict(ChannelPartnerSerializer):

    @cached_property
    def user_access_matrix(self):
        return UserAMDict(cloud_user=self.request_user, content_type=self._content_type)


def cp_serializer():
    request = RequestFactory(cloud_host='1111').get('/')
    request.user = user()
    return ChannelPartnerSerializer(cp_queryset(), many=True, context={'request': request})


def org_serializer():
    request = RequestFactory(cloud_host='1111').get('/')
    request.user = user()
    return OrganizationSerializer(org_queryset(), many=True, context={'request': request})


def sys_serializer():
    request = RequestFactory(cloud_host='1111').get('/')
    request.user = user()
    return CloudSystemSerializer(sys_queryset(), many=True, context={'request': request})


def benchmark(rounds=2, func=None):
    clean_cache()
    # warmup
    func()
    times = []
    ts = time()
    for _ in range(rounds):
        round_times = {}
        ti = time()
        ser = func()
        round_times["init"] = time() - ti
        td = time()
        data = ser.data
        round_times["data"] = time() - td
    print(f"{rounds} rounds time {func.__name__}: {time() - ts}, Instances: {len(data)}")


def run(rounds=2):
    benchmark(rounds=int(rounds), func=cp_serializer)
    benchmark(rounds=int(rounds), func=org_serializer)
    benchmark(rounds=int(rounds), func=sys_serializer)
