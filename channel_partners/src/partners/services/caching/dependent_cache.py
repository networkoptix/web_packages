import hashlib
from typing import (
    Any,
    Dict,
    List,
    Optional,
)

import structlog

from partners.models import (
    CloudUser,
    Empty,
)
from partners.services.cache_service import (
    CacheService,
    VersionKey,
    VersionKeyAndType,
)
from partners.services.caching.cache_dependency import CacheDependency
from partners.services.caching.cache_enums import TargetTypeEnum


logger = structlog.getLogger()


class DependentCache:
    """
    Class for defining a dependent cache.
    """

    def __init__(
            self,
            name: str,  # <- Remove
            key_params: List[str],
            dependencies: List[CacheDependency],
            validate_user: bool = True,
            protocol_version: int = 1
    ) -> None:
        # Validate the input
        self._check_for_duplicate_key_params(key_params)
        self._check_for_duplicate_dependencies(dependencies)
        # Set the attributes
        self.name = name
        self.key_params = key_params
        self.dependencies = dependencies
        self.validate_user = validate_user
        self.protocol_version = protocol_version

    def set(
            self,
            keys: Dict[str, Any],
            data: Dict[str, Any],
            user: CloudUser = None
    ) -> None:
        # Validate the input
        if self.validate_user and not user:
            raise ValueError("User must be provided when validate_user is True")
        if "**validation_hash" in data:
            raise ValueError("Data cannot contain **validation_hash")

        # Set the data in the cache
        try:
            # Generate cache key
            key_parts = [f'{k}:{v}' for k, v in keys.items()]
            cache_key = f'dependent_cache:{self.name}:' + ':'.join(key_parts)

            # Calculate the validation hash and add it to the data
            dependency_strings = self._generate_dependency_keys(self.dependencies, keys)

            if self.validate_user:
                version_key = VersionKey(model=CloudUser, id=str(user.id))
                user_version = CacheService.get_version(version_key)
                dependency_strings.append(f'user__version:{user_version}')

            validation_hash = hashlib.md5(str(dependency_strings).encode()).hexdigest()
            data = {**data, '**validation_hash': validation_hash}

            # Set the data in the cache
            CacheService.set_cache_fields(cache_key, data)
        except Exception as e:
            if user:
                logger.error("Error setting cache", user=user.id, error=str(e))
            else:
                logger.error("Error setting cache", error=str(e))

    def validate_and_retrieve(
            self,
            keys: Dict[str, Any],
            validation_sources: Dict[str, Any],
            data_fields: List[str],
            user: Optional[CloudUser] = None
    ) -> Any:

        # Validate the input
        for key, value in keys.items():
            if not isinstance(key, str):
                raise ValueError(f"Key {key} is not a string")
        if self.validate_user and not user:
            raise ValueError("User must be provided when validate_user is True")
        if "**validation_hash" in data_fields:
            raise ValueError("Data fields cannot contain **validation_hash")

        # Retrieve the data from the cache
        try:
            # Generate the cache key
            key_parts = [f'{k}:{v}' for k, v in keys.items()]
            cache_key = f'dependent_cache:{self.name}:' + ':'.join(key_parts)

            # Retrieve the data from the cache
            fields_to_get = data_fields + ['**validation_hash']
            cached_data = CacheService.get_cache_fields(cache_key, fields_to_get)

            if cached_data:
                logger.debug("Cache hit", cache_key=cache_key)

                # Check if the validation hash matches
                dependency_strings = self._generate_dependency_keys(self.dependencies, keys)

                if self.validate_user:
                    version_key = VersionKey(model=CloudUser, id=str(user.id))
                    user_version = CacheService.get_version(version_key)
                    dependency_strings.append(f'user__version:{user_version}')

                current_validation_hash = hashlib.md5(str(dependency_strings).encode()).hexdigest()
                cached_validation_hash = cached_data.pop('**validation_hash', None)

                if current_validation_hash != cached_validation_hash:
                    logger.debug("Validation hash mismatch -- clearing cache", cache_key=cache_key)
                    CacheService.clear_cache(cache_key)
                    return None

                result = {}
                for field in data_fields:
                    if cached_data and field in cached_data:
                        result[field] = cached_data[field]
                    else:
                        result[field] = Empty()
                return result
            else:
                logger.debug("Cache miss", cache_key=cache_key)
                return None
        except Exception as e:
            if user:
                logger.error("Error validating and retrieving cache", user=user.id, error=str(e))
            else:
                logger.error("Error validating and retrieving cache", error=str(e))
            return None

    def _generate_dependency_keys(
            self,
            dependencies: List[CacheDependency],
            keys: Dict[str, Any]
    ) -> List[str]:
        version_keys: List[VersionKeyAndType] = []
        path_keys: List[VersionKey] = []

        # Collect keys for SELF, PARENT, and ANCESTOR targets
        for dependency in dependencies:
            instance_id = keys[dependency.source]
            if dependency.target == TargetTypeEnum.SELF:
                version_keys.append(dependency.cache_key_typed(instance_id))
            else:
                path_keys.append(dependency.cache_key(instance_id))

        # Batch retrieve path information
        path_versions = CacheService.get_cached_paths(path_keys)

        # Collect version keys for PARENT and ANCESTOR targets
        for dependency in dependencies:
            instance_id = keys[dependency.source]
            if dependency.target == TargetTypeEnum.PARENT:
                parent_key = dependency.get_parent_key(instance_id, path_versions)
                version_keys.append(parent_key)
            elif dependency.target == TargetTypeEnum.ANCESTOR:
                ancestor_keys = dependency.get_ancestor_keys(instance_id, path_versions)
                version_keys.extend(ancestor_keys)

        # Batch retrieve versions
        versions = CacheService.get_all_version_types(version_keys)

        # Generate dependency strings
        dependency_strings = []
        for dependency in dependencies:
            instance_id = keys[dependency.source]
            if dependency.target == TargetTypeEnum.SELF:
                dependency_key = dependency.process_target_self(instance_id, versions)
            elif dependency.target == TargetTypeEnum.PARENT:
                dependency_key = dependency.process_target_parent(instance_id, path_versions, versions)
            elif dependency.target == TargetTypeEnum.ANCESTOR:
                dependency_key = dependency.process_target_ancestor(instance_id, path_versions, versions)
            else:
                raise ValueError(f"Unsupported target type: {dependency.target}")
            if dependency_key:
                dependency_strings.append(dependency_key)

        return dependency_strings

    # ==================== #
    # Validation methods
    # ==================== #
    @staticmethod
    def _check_for_duplicate_key_params(key_params: List[str]) -> None:
        if len(key_params) != len(set(key_params)):
            raise ValueError("Duplicate values found in key_params")

    @staticmethod
    def _check_for_duplicate_dependencies(dependencies: List[CacheDependency]) -> None:
        if len(dependencies) != len(set(dependencies)):
            raise ValueError("Duplicate values found in dependencies")
