import hashlib
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Union,
)

import structlog
from django.contrib.auth.models import AnonymousUser

from partners.models import (
    CloudSystemId,
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

# Constants
VALIDATION_HASH_KEY = '**validation_hash'

# Types
AuthEntity = Union[CloudUser, CloudSystemId, AnonymousUser]


# ==================== #
class DependentCache:
    """
    Class for defining a dependent cache.
    """
    name: str
    key_params: list[str]
    dependencies: list[CacheDependency]
    validate_auth_entity: bool
    protocol_version: int

    def __init__(
            self,
            name: str,  # <- Remove
            key_params: List[str],
            dependencies: List[CacheDependency],
            validate_auth: bool = True,
            protocol_version: int = 1  # Not currently used
    ) -> None:
        # Validate the input
        self._check_for_duplicate_key_params(key_params)
        self._check_for_duplicate_dependencies(dependencies)
        # Set the attributes
        self.name = name
        self.key_params = key_params
        self.dependencies = dependencies
        self.validate_auth_entity = validate_auth
        self.protocol_version = protocol_version

    # ==================== #
    # Main Processing methods
    # ==================== #
    def set(
            self,
            keys: Dict[str, Any],
            validation_sources: Dict[str, Any],
            data: Dict[str, Any],
            auth_entity: Optional[AuthEntity] = None
    ) -> None:
        # Validate the input
        self._validate_key_params_against_keys(keys)
        if self.validate_auth_entity and not auth_entity:
            raise ValueError("An AuthEntity must be provided when validate_user is True")
        if VALIDATION_HASH_KEY in data:
            raise ValueError("Data cannot contain **validation_hash")

        # Set the data in the cache
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(keys)

            # Calculate the validation hash and add it to the data
            dependency_strings = self._generate_dependency_keys(self.dependencies, validation_sources)

            if self.validate_auth_entity:
                auth_dependency = self._get_authentication_dependency(auth_entity)
                dependency_strings.append(auth_dependency)

            # Add the validation hash and etag to the data
            validation_hash = hashlib.md5(str(dependency_strings).encode()).hexdigest()

            data = {**data, VALIDATION_HASH_KEY: validation_hash}

            CacheService.set_cache_fields(cache_key, data)
        except Exception as e:
            logger.error(
                "Error setting cache",
                auth_entity_id=getattr(auth_entity, 'id', None),
                error_message=str(e),
                exc_info=True)

    def validate_and_retrieve(
            self,
            keys: Dict[str, Any],
            validation_sources: Dict[str, Any],
            data_fields: List[str],
            auth_entity: Optional[AuthEntity] = None
    ) -> Any:

        # Validate the input
        for key, value in keys.items():
            if not isinstance(key, str):
                raise ValueError(f"Key {key} is not a string")
        if self.validate_auth_entity and not auth_entity:
            raise ValueError("An AuthEntity must be provided when validate_user is True")
        if VALIDATION_HASH_KEY in data_fields:
            raise ValueError("Data fields cannot contain **validation_hash")

        # Retrieve the data from the cache
        try:
            # Generate cache key
            cache_key = self._generate_cache_key(keys)

            # Retrieve the data from the cache
            fields_to_get = data_fields + [VALIDATION_HASH_KEY]
            cached_data = CacheService.get_cache_fields(cache_key, fields_to_get)

            if cached_data is not None:
                logger.debug("Found in cache", cache_key=cache_key)

                # Check if the validation hash matches
                dependency_strings = self._generate_dependency_keys(self.dependencies, validation_sources)

                if self.validate_auth_entity:
                    auth_dependency = self._get_authentication_dependency(auth_entity)
                    dependency_strings.append(auth_dependency)

                current_validation_hash = hashlib.md5(str(dependency_strings).encode()).hexdigest()
                cached_validation_hash = cached_data.pop(VALIDATION_HASH_KEY, None)

                if current_validation_hash != cached_validation_hash:
                    logger.debug("Validation hash mismatch -- clearing cache", cache_key=cache_key)
                    CacheService.clear_cache(cache_key)
                    return None
                else:
                    logger.debug("Cache hit & Validation match", cache_key=cache_key)

                result = {}
                for field in data_fields:
                    if cached_data and field in cached_data:
                        result[field] = cached_data[field]
                    else:
                        result[field] = Empty
                return result
            else:
                logger.debug("Cache miss", cache_key=cache_key)
                return None
        except Exception as e:
            logger.error(
                "Error validating and retrieving cache",
                auth_entity_id=getattr(auth_entity, 'id', None),
                error_message=str(e),
                exc_info=True)
            return None

    @staticmethod
    def get_auth_model_name(auth_entity: AuthEntity) -> str:
        return auth_entity.__class__.__name__

    # ==================== #
    # Dependency methods
    # ==================== #
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
    # Utility methods
    # ==================== #
    def _generate_cache_key(self, keys: Dict[str, Any]) -> str:
        key_parts = [f'{k}:{v}' for k, v in keys.items()]
        return f'dependent_cache:{self.name}:' + ':'.join(key_parts)

    def _get_authentication_dependency(self, auth_entity: Optional[AuthEntity] = None) -> Optional[str]:
        # Generate the authentication dependency
        if isinstance(auth_entity, CloudUser):
            version_key = VersionKey(model=CloudUser, id=str(auth_entity.id))
            version = CacheService.get_version(version_key)
            return f'user__version:{version}'
        elif isinstance(auth_entity, CloudSystemId):
            version_key = VersionKey(model=CloudSystemId, id=str(auth_entity.system_id))
            version = CacheService.get_version(version_key)
            return f'system__version:{version}'
        elif isinstance(auth_entity, AnonymousUser):
            return None
        else:
            logger.error("Unsupported auth entity type", auth_entity_type=type(auth_entity).__name__)
            raise ValueError(f"Unsupported auth entity type: {auth_entity}")

    # ==================== #
    # Validation methods
    # ==================== #
    def _validate_key_params_against_keys(self, keys: Dict[str, Any]) -> None:
        for key_param in self.key_params:
            if "*" in key_param:
                continue
            if key_param not in keys:
                raise ValueError(f"Key param {key_param} not found in keys")

    @staticmethod
    def _check_for_duplicate_key_params(key_params: List[str]) -> None:
        if len(key_params) != len(set(key_params)):
            raise ValueError("Duplicate values found in key_params")

    @staticmethod
    def _check_for_duplicate_dependencies(dependencies: List[CacheDependency]) -> None:
        if len(dependencies) != len(set(dependencies)):
            raise ValueError("Duplicate values found in dependencies")
