import hashlib
from collections import defaultdict
from typing import (
    Any,
    Dict,
    List,
    Literal,
    Optional,
    Tuple,
    Type,
    TypedDict,
    Union,
)
from uuid import UUID

import redis.exceptions
import structlog
from django.core.cache import caches
from django.db import (
    models,
    transaction,
)
from django.db.models import QuerySet

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from channel_partners.mixins.path_cache_mixin import PathCacheMixin
from channel_partners.mixins.version_mixin import VersionMixin
from channel_partners.utils import validate_model
from partners.models import (
    CloudSystemId,
    SystemGroup,
)
from partners.services.caching.cache_enums import CachedFieldChoiceEnum
from partners.utils.cache_keys import get_version_cache_key
from tools.helpers import Singleton


cache = caches["dependent_cache"]


# Data Structures (DTOs)
class VersionKey(TypedDict):
    model: Type[models.Model]
    id: str


class VersionKeyAndType(TypedDict):
    model: Type[models.Model]
    id: str
    version_type: CachedFieldChoiceEnum


class VersionValue(TypedDict):
    model: Type[models.Model]
    id: str
    value: int


class DependentCachedData(TypedDict):
    validation_hash: str
    etag: Optional[str]
    data: Union[Dict[str, Any], List[Dict[str, Any]]]


# End Data Structures (DTOs)


logger = structlog.getLogger()


def validate_version_type(keys: List[VersionKeyAndType]) -> None:
    version_type_to_mixin = {
        CachedFieldChoiceEnum.VERSION: VersionMixin,
        CachedFieldChoiceEnum.DESCENDANT_VERSION: DescendantVersionMixin,
        CachedFieldChoiceEnum.PATH_VERSION: PathCacheMixin,
    }

    for key in keys:
        model: Type[models.Model] = key['model']
        version_type: CachedFieldChoiceEnum = key['version_type']
        mixin = version_type_to_mixin.get(version_type)
        if mixin is not None:
            validate_model(model, mixin)
        else:
            raise ValueError(f"Invalid version type: {version_type}")


def get_set_versions_in_cache_script() -> Tuple[str, str]:
    script_name = "set_versions_in_cache_script"
    script = """
                    local start_time = tonumber(ARGV[1])
                    local time_parts = redis.call('TIME')
                    local current_time = tonumber(time_parts[1] .. string.format("%06d", time_parts[2]))
                
                    local keys_to_check = {}
                    local values_to_set = {}
                    local successful_keys = {}
                    local unsuccessful_keys = {}
                
                    for i = 2, #ARGV, 2 do
                        local key_to_set = ARGV[i]
                        local value_to_set = ARGV[i + 1]
                        table.insert(keys_to_check, key_to_set .. ':time')
                        table.insert(values_to_set, {key_to_set, value_to_set})
                    end
                
                    local stored_times = redis.call('MGET', unpack(keys_to_check))
                
                    for i = 1, #values_to_set do
                        local key_to_set = values_to_set[i][1]
                        local value_to_set = values_to_set[i][2]
                        local key_to_check = keys_to_check[i]
                        local stored_time = stored_times[i]
                
                        if value_to_set == '' or not stored_time or start_time > tonumber(stored_time) then
                            redis.call('SET', key_to_set, value_to_set)
                            redis.call('SET', key_to_check, current_time)
                            table.insert(successful_keys, key_to_set)
                        else
                            table.insert(unsuccessful_keys, key_to_set)
                        end
                    end
                
                    return {successful_keys, unsuccessful_keys}
                    """
    return script_name, script


class CacheScriptService(metaclass=Singleton):
    def __init__(self):
        self._registered_scripts: Dict[str, str] = {}
        # Store original script texts
        self._script_texts: Dict[str, str] = {}
        self.register(*get_set_versions_in_cache_script())

    def register(self, script_name: str, script: str) -> None:
        sha1 = hashlib.sha1(script.encode()).hexdigest()
        exists = cache.script_exists(sha1)[0]
        if not exists:
            sha1 = cache.script_load(script)
            logger.info("Redis Lua script loaded", name=script_name, sha1=sha1)
        else:
            logger.info("Redis Lua script already exists", name=script_name, sha1=sha1)
        self._registered_scripts[script_name] = sha1
        # Store the original script text for potential re-registration
        self._script_texts[script_name] = script

    def get_script(self, script_name: str) -> str:
        if script_name not in self._registered_scripts:
            logger.error("Redis Lua script not found", name=script_name)
            raise ValueError(f"Redis Lua script [{script_name}] not found")
        return self._registered_scripts[script_name]

    def execute(self, script_name: str, args: List[Any]) -> Any:
        try:
            script_sha1 = self.get_script(script_name)
            return cache.evalsha(script_sha1, 0, *args)
        except redis.exceptions.ResponseError as e:
            if "NOSCRIPT" in str(e):
                logger.info(f"Script {script_name} not found, re-registering and retrying.")
                # Re-register the script
                self.register(script_name, self._script_texts[script_name])
                # Get the new SHA1 hash
                script_sha1 = self.get_script(script_name)
                # Retry execution
                return cache.evalsha(script_sha1, 0, *args)
            else:
                raise


class CacheService:
    """
    A service class for handling cache operations.
    """

    @staticmethod
    def timestamp() -> int:
        time_parts = cache.time()
        return int(f"{time_parts[0]}{time_parts[1]:06d}")

    @staticmethod
    def keys() -> List[str]:
        return cache.keys("*")

    def ttl(self, key: str) -> int:
        return cache.ttl(key)

    # Regular cache operations
    @staticmethod
    def get_cache_fields(cache_key: str, fields: List[str]) -> Union[Dict[str, Any], None]:
        """
        Retrieves cache fields for a given cache key. If specific fields are provided, only those fields are retrieved.
        If no fields are provided, all fields are retrieved. If no fields are found, returns None.
        """
        result = cache.hgetall(cache_key) if not fields else cache.hmget(cache_key, *fields)
        return None if result == {} else result

    @staticmethod
    def set_cache_fields(cache_key: str, fields: Dict) -> None:
        cache.hmset(cache_key, fields)

    @staticmethod
    def clear_cache(cache_key: str) -> None:
        cache.delete(cache_key)

    @staticmethod
    def set(timestamp: int, cache_key: str, value: Any) -> None:
        CacheService._set_versions_in_cache_lua(timestamp, {cache_key: value})

    @staticmethod
    def set_many(timestamp: int, data: Dict[str, Any]) -> None:
        CacheService._set_versions_in_cache_lua(timestamp, data)

    # End regular cache operations
    @staticmethod
    def get_all_version_types(keys: List[VersionKeyAndType]) -> Dict[str, Any]:
        return CacheService.get_items_of_multiple_types(keys)

    @staticmethod
    def get_versions(keys: List[VersionKey]) -> Dict[str, int]:
        """
        Fetches versions for a list of keys from cache. If a key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type(keys, "version", VersionMixin)

    @staticmethod
    def get_version(key: VersionKey) -> Dict[str, int]:
        """
        Fetches version for a key from cache. If a key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type([key], "version", VersionMixin)

    @staticmethod
    def get_descendant_versions(keys: List[VersionKey]) -> Dict[str, int]:
        """
        Fetches descendant versions for a list of keys from cache. If key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type(keys, "descendant_version", DescendantVersionMixin)

    @staticmethod
    def get_descendant_version(key: VersionKey) -> Dict[str, int]:
        """
        Fetches descendant version for a key from cache. If key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type([key], "descendant_version", DescendantVersionMixin)

    @staticmethod
    def get_cached_paths(keys: List[VersionKey]) -> Dict[str, List[List[str]]]:
        """
        Fetches path versions for a list of keys from cache. If a key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type(keys, "path", PathCacheMixin)

    @staticmethod
    def get_cached_path(key: VersionKey) -> Dict[str, List[List[str]]]:
        """
        Fetches path version for a key from cache. If key is not found in cache, fetches it from the database.
        """
        return CacheService._get_items_of_single_type([key], "path", PathCacheMixin)

    @staticmethod
    def bulk_increment(
            ids: List[Union[str, UUID]],
            model: Type[models.Model],
            version_type: Literal["version", "descendant_version"],
            mixin_to_check: Type[Union[VersionMixin, DescendantVersionMixin]]
    ) -> None:
        """
        Increments the version for a list of instances in bulk.
        """
        # Validate the model
        validate_model(model, mixin_to_check)

        # Bulk update instances
        if version_type == "version":
            VersionMixin.increment_version_bulk(model, ids)
        else:
            model.increment_descendant_version_bulk(ids)

    @staticmethod
    def get_items_of_multiple_types(keys: List[VersionKeyAndType]) -> Dict[str, Any]:
        # Validate the model for each key
        validate_version_type(keys)

        # Generate cache keys
        cache_keys = []
        for key in keys:
            cache_keys.append(get_version_cache_key(
                key['model'],
                key['id'],
                key['version_type']))
        # Get items from cache
        cached_items = cache.get_many(cache_keys)

        # Identify keys missing in cache
        missing_keys = [
            key
            for key, cache_key in zip(keys, cache_keys)
            if cache_key not in cached_items
        ]

        if missing_keys:
            missing_objects = CacheService._get_missing_from_database_set_in_cache_multiple_types(missing_keys)
            cached_items.update(missing_objects)
        return cached_items

    @staticmethod
    def _get_items_of_single_type(
            keys: List[VersionKey],
            version_type: Literal["version", "descendant_version", "path"],
            mixin_to_check: Type[Union[VersionMixin, DescendantVersionMixin, PathCacheMixin]]
    ) -> Dict[str, Any]:
        """
        Helper method to fetch items from cache. If a key is not found in cache, fetches it from the database.
        """
        # Validate the model for each key
        for key in keys:
            validate_model(key['model'], mixin_to_check)

        # Generate cache keys
        cache_keys = [get_version_cache_key(key['model'], key['id'], version_type) for key in keys]
        # Get items from cache
        cached_items = cache.get_many(cache_keys)

        # Identify keys missing in cache
        missing_keys = [
            key
            for key, cache_key in zip(keys, cache_keys)
            if cache_key not in cached_items
        ]

        # If there are missing keys, fetch them from the database and set in cache
        if missing_keys:
            missing_objects = CacheService._get_missing_from_database_set_in_cache(missing_keys, version_type)
            cached_items.update(missing_objects)

        return cached_items

    @staticmethod
    def _get_missing_from_database_set_in_cache(
            keys: List[VersionKey],
            version_type: Literal["version", "descendant_version", "path"]
    ) -> Dict[str, Any]:
        """
        Fetches missing keys from the database and sets them in the cache.
        """
        # Group keys by their model class
        grouped_keys = CacheService._get_model_groups(keys)

        # Initialize dictionary to hold objects to be inserted in cache
        inserted_objects = {}
        for model_class, ids in grouped_keys.items():
            # NOTE: if version_type is path, may want to do some additional
            #       processing to get the path from another method
            timestamp = CacheService.timestamp()
            with transaction.atomic():
                missing_objects = {}

                # Fetch missing keys from database
                instances: QuerySet[models.Model] = model_class.objects.filter(id__in=ids)
                # Type the instance variable
                instance: models.Model
                for instance in instances:
                    # Generate cache key
                    cache_key = get_version_cache_key(model_class, str(instance.id), version_type)
                    # Get value
                    value = getattr(instance, version_type)
                    # If the version_type is not path, set the value directly
                    if version_type != "path":
                        missing_objects[cache_key] = value
                    else:
                        missing_objects[cache_key] = CacheService._build_path_value(instance)

                # Set the values in the cache using set_many
                successful, unsuccessful = CacheService._set_versions_in_cache_lua(timestamp, missing_objects)
                if unsuccessful:
                    logger.error(
                        "Attempted to set versions in cache, but failed",
                        unsuccessful_keys=list(unsuccessful.keys()))
                inserted_objects.update(successful)

        return inserted_objects

    @staticmethod
    def _get_missing_from_database_set_in_cache_multiple_types(keys: List[VersionKeyAndType]) -> Dict[str, Any]:
        # Group keys by their model class
        # TODO: Extract and refactor
        grouped_keys = defaultdict(lambda: defaultdict(list))
        for key in keys: grouped_keys[key['model']][key['id']].append(key)

        # Initialize dictionary to hold objects to be inserted in cache
        inserted_objects = {}

        # Iterate over each model class
        for model_class, group_items in grouped_keys.items():
            ids = list(group_items.keys())

            timestamp = CacheService.timestamp()
            missing_objects = {}

            # Fetch missing ids from database
            instances: QuerySet[models.Model] = model_class.objects.filter(id__in=ids)

            # Assuming all are returned
            instance: models.Model
            for instance in instances:
                instance_id: str = str(instance.id)
                # Get the current group that can contain 1 or more items
                current_group: List[VersionKeyAndType] = group_items[instance_id]

                for group_item in current_group:
                    group_item_type: CachedFieldChoiceEnum = group_item["version_type"]
                    # Get the cache key
                    cache_key = get_version_cache_key(model_class, str(instance.id), group_item_type)

                    if group_item_type == CachedFieldChoiceEnum.PATH_VERSION:
                        missing_objects[cache_key] = CacheService._build_path_value(instance)
                    else:
                        missing_objects[cache_key] = getattr(instance, group_item_type)

            # Set the values in the cache
            # cache.set_many(missing_objects)
            successful, unsuccessful = CacheService._set_versions_in_cache_lua(timestamp, missing_objects)
            if unsuccessful:
                logger.error(
                    "Attempted to set versions in cache, but failed",
                    unsuccessful_keys=list(unsuccessful.keys()))
            inserted_objects.update(successful)
        return inserted_objects

    @staticmethod
    def _get_model_groups(keys: List[VersionKey]) -> Dict[Type[models.Model], List[str]]:
        """
        Groups keys by their model class.
        """
        grouped_keys = {}
        for key in keys:
            if key['model'] not in grouped_keys:
                grouped_keys[key['model']] = []
            grouped_keys[key['model']].append(key['id'])
        return grouped_keys

    @staticmethod
    def _build_path_value(instance: Union[SystemGroup, CloudSystemId]) -> List[List[str]]:
        model_name = instance.__class__.__name__

        if model_name in ['ChannelPartner', 'Organization']:
            return [['ChannelPartner', str(element)] for element in instance.path]
        elif model_name in ['SystemGroup', 'CloudSystemId']:
            ## Ignore the lint warning; need to update the typings
            return instance.systems_path
        else:
            raise ValueError(f"Invalid model type: {model_name}")

    @staticmethod
    def _set_versions_in_cache_lua(
            timestamp: int,
            data: Dict[str, Union[int, str, List[str]]]
    ) -> Tuple[
        Dict[str, Union[int, str, List[str]]],
        Dict[str, Union[int, str, List[str]]]
    ]:
        # Prepare the arguments for the Lua script
        args = [timestamp]
        for key, value in data.items():
            validated_key = cache.make_and_validate_key(key, version=None)
            args.append(validated_key)
            args.append(cache.serializer.dumps(value))

        # Execute the Lua script
        try:
            script_service = CacheScriptService()
            result = script_service.execute("set_versions_in_cache_script", args)

            # Clean the keys
            successful_keys = cache.clean_keys(*result[0])
            unsuccessful_keys = cache.clean_keys(*result[1])

            # Match the cleaned keys with their values from the original data
            successful_pairs = {key: data[key] for key in successful_keys}
            unsuccessful_pairs = {key: data[key] for key in unsuccessful_keys}

            if unsuccessful_pairs:
                logger.debug("Failed to set versions in cache", unsuccessful_keys=list(unsuccessful_keys))

            return successful_pairs, unsuccessful_pairs
        except Exception as e:
            print(e)
            logger.error("Redis error when attempting to set via Lua", error=str(e))
            return {}, data
