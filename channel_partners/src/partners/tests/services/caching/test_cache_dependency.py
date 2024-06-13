import uuid

from partners.models import (
    ChannelPartner,
    Organization,
)
from partners.services.caching.cache_enums import (
    CachedDependencyFieldTypeEnum,
    TargetTypeEnum,
)
from partners.services.caching.dependent_cache import CacheDependency
from partners.utils.cache_keys import get_version_cache_key


class TestCacheDependency:

    def test_eq(self):
        # Setup
        model = ChannelPartner
        field = CachedDependencyFieldTypeEnum.VERSION
        source = 'name'
        target = TargetTypeEnum.SELF

        dependency1 = CacheDependency(model=model, field=field, source=source, target=target)
        dependency2 = CacheDependency(model=model, field=field, source=source, target=target)

        # Exercise and Verify
        assert dependency1 == dependency2

    def test_hash(self):
        # Setup
        model = ChannelPartner
        field = CachedDependencyFieldTypeEnum.VERSION
        source = 'name'
        target = TargetTypeEnum.SELF

        dependency1 = CacheDependency(model=model, field=field, source=source, target=target)
        dependency2 = CacheDependency(model=model, field=field, source=source, target=target)

        # Exercise and Verify
        assert hash(dependency1) == hash(dependency2)

    def test_cache_key_channel_partner(self):
        # Setup
        model = ChannelPartner
        field = CachedDependencyFieldTypeEnum.VERSION
        source = 'name'
        target = TargetTypeEnum.SELF
        instance_id = uuid.uuid4()

        dependency = CacheDependency(model=model, field=field, source=source, target=target)

        # Exercise
        actual = dependency.cache_key(instance_id)
        expected = {'model': model, 'id': str(instance_id)}

        # Verify
        assert actual == expected

    def test_cache_key_organization(self):
        # Setup
        model = Organization
        field = CachedDependencyFieldTypeEnum.VERSION
        source = 'organization'
        target = TargetTypeEnum.SELF
        instance_id = uuid.uuid4()

        dependency = CacheDependency(model=model, field=field, source=source, target=target)

        # Exercise
        actual = dependency.cache_key(instance_id)
        expected = {'model': model, 'id': str(instance_id)}

        # Verify
        assert actual == expected

    def test_version_key(self):
        # Setup
        model = ChannelPartner
        field = CachedDependencyFieldTypeEnum.VERSION
        source = 'name'
        target = TargetTypeEnum.SELF
        instance_id = uuid.uuid4()

        dependency = CacheDependency(model=model, field=field, source=source, target=target)

        # Exercise
        actual = dependency.version_key(instance_id)
        expected = get_version_cache_key(model, str(instance_id), field)

        # Verify
        assert actual == expected
