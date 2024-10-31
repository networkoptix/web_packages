import uuid
from typing import (
    Dict,
    List,
    Literal,
    Optional,
    Type,
    Union,
)

from django.apps import apps
from django.db import models

from channel_partners.mixins.descendant_version_mixin import (
    DescendantVersionMixin,
)
from channel_partners.mixins.version_mixin import VersionMixin
from channel_partners.utils import validate_model
from partners.services.cache_service import (
    VersionKey,
    VersionKeyAndType,
)
from partners.services.caching.cache_enums import (
    CachedDependencyFieldTypeEnum,
    CachedFieldChoiceEnum,
    TargetTypeEnum,
)
from partners.utils.cache_keys import get_version_cache_key


class CacheDependency:
    """
    Class for defining a cache dependency.
    """

    def __init__(
            self,
            model: Type[models.Model],
            field: CachedDependencyFieldTypeEnum,
            # This is used as the key that will be looked up by the validation source
            source: str,
            target: TargetTypeEnum = TargetTypeEnum.SELF  # <- DEFAULT VALUE
    ) -> None:
        # Validate the input
        if not isinstance(field, CachedDependencyFieldTypeEnum):
            raise ValueError(f"field must be an instance of CacheDependencyFieldEnum, not {type(field)}")

        if not isinstance(target, TargetTypeEnum):
            raise ValueError(f"target must be an instance of TargetTypeEnum, not {type(target)}")

        # Validate the usage of the field is correct
        self._validate_correct_usage(model, field, "field")

        # Set the attributes
        self._model: Type[models.Model] = model
        self._field: CachedDependencyFieldTypeEnum = field
        self._source: str = source
        self._target: TargetTypeEnum = target

    def __eq__(self, other):
        """
        Check if this CacheDependency is equal to another CacheDependency.
        """
        if isinstance(other, CacheDependency):
            return (
                    self._model == other._model and
                    self._source == other._source and
                    self._target == other._target and
                    self._field == other._field
            )
        return False

    def __hash__(self):
        """
        Compute the hash of this CacheDependency.
        """
        return hash((self._model, self._source, self._target, self._field))

    @staticmethod
    def _validate_correct_usage(
            model: Type[models.Model],
            field: CachedDependencyFieldTypeEnum,
            attribute_type: Literal["source", "field"]
    ) -> None:
        """
        Validate the correct usage of the field.

        Args:
            model (Type[models.Model]): The model that this cache dependency is associated with.
            field (CachedDependencyFieldTypeEnum): The field of the model that this cache dependency is associated with.
            attribute_type (Literal["source", "field"]): The attribute type of the cache dependency.
        """
        if field == CachedDependencyFieldTypeEnum.VERSION:
            validate_model(model, VersionMixin)
        elif field == CachedDependencyFieldTypeEnum.DESCENDANT_VERSION:
            validate_model(model, DescendantVersionMixin)
        else:
            raise ValueError(f"The {attribute_type} '{field}' is not a valid field choice")

    @property
    def model(self) -> Type[models.Model]:
        return self._model
    
    @property
    def field(self) -> CachedDependencyFieldTypeEnum:
        return self._field

    @property
    def _field_choice_type(self) -> CachedFieldChoiceEnum:
        if self._field == CachedDependencyFieldTypeEnum.VERSION:
            return CachedFieldChoiceEnum.VERSION
        elif self._field == CachedDependencyFieldTypeEnum.DESCENDANT_VERSION:
            return CachedFieldChoiceEnum.DESCENDANT_VERSION
        else:
            raise ValueError(f"Unsupported field type: {self._field}")

    @property
    def source(self) -> str:
        return self._source

    @property
    def target(self) -> TargetTypeEnum:
        return self._target

    def cache_key(self, instance_id: Union[str, uuid.UUID]) -> VersionKey:
        """
        Returns the key for the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.

        Returns:
            VersionKey: The key for the cache dependency.
        """
        return {'model': self._model, 'id': str(instance_id)}

    def cache_key_typed(self, instance_id: Union[str, uuid.UUID]) -> VersionKeyAndType:
        """
        Returns the typed key for the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.

        Returns:
            VersionKeyAndType: The typed key for the cache dependency.
        """
        if self._target in (TargetTypeEnum.PARENT, TargetTypeEnum.ANCESTOR):
            version_type = CachedFieldChoiceEnum.PATH_VERSION

        elif self._target == TargetTypeEnum.SELF:
            if self._field == CachedDependencyFieldTypeEnum.VERSION:
                version_type = CachedFieldChoiceEnum.VERSION
            elif self._field == CachedDependencyFieldTypeEnum.DESCENDANT_VERSION:
                version_type = CachedFieldChoiceEnum.DESCENDANT_VERSION
            else:
                raise ValueError(f"Unsupported field type: {self._field}")
        else:
            raise ValueError(f"Unsupported target type: {self._target}")
        return {'model': self._model, 'id': str(instance_id), 'version_type': version_type}

    def version_key(self, instance_id: Union[str, uuid.UUID]) -> str:
        """
        Returns the version key for the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.

        Returns:
            str: The version key for the cache dependency.
        """
        return get_version_cache_key(self._model, str(instance_id), self._field_choice_type)

    def get_parent_key(
            self,
            instance_id: Union[str, uuid.UUID],
            path_versions: Dict[str, List[List[str]]]
    ) -> Optional[VersionKeyAndType]:
        """
        Returns the parent key for the cache dependency.

        This method is used to get the parent key of the instance. It retrieves the parent of the instance from the path versions
        and returns a dictionary that represents the parent key.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.
            path_versions (Dict[str, List[List[str]]]): The path versions of the cache dependency.

        Returns:
            VersionKeyAndType: The parent key for the cache dependency.
        """

        # Get the path versions for the instance
        path_cache_key = get_version_cache_key(
            self._model,
            str(instance_id),
            CachedFieldChoiceEnum.PATH_VERSION)
        path_version = path_versions.get(path_cache_key)

        if not path_version or len(path_version) < 1:
            return None

        # Get the parent of the instance from the path versions
        # Rightmost is root, leftmost is parent
        parent_model_name, parent_id = path_version[0]
        parent_model = apps.get_model('partners', parent_model_name)

        # Return a dictionary that represents the parent key
        return {
            'model': parent_model,
            'id': parent_id,
            'version_type': self._field_choice_type
        }

    def get_ancestor_keys(
            self, instance_id: Union[str, uuid.UUID],
            path_versions: Dict[str, List[List[str]]]
    ) -> List[VersionKeyAndType]:
        """
        Returns the ancestor keys for the cache dependency.

        This method is used to get the ancestor keys of the instance. It retrieves the ancestors of the instance from the path versions
        and returns a list of dictionaries that represent the ancestor keys.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.
            path_versions (Dict[str, List[List[str]]]): The path versions of the cache dependency.

        Returns:
            List[VersionKeyAndType]: The ancestor keys for the cache dependency.
        """
        # Get the path versions for the instance
        path_cache_key = get_version_cache_key(self._model, str(instance_id), CachedFieldChoiceEnum.PATH_VERSION)
        path_version = path_versions.get(path_cache_key)

        if not path_version:
            raise ValueError(f"No path versions found for {path_cache_key}")

        # Return a list of dictionaries that represent the ancestor keys
        version_type = self._field_choice_type
        result = [
            {
                'model': apps.get_model('partners', model_name),
                'id': id,
                'version_type': version_type}
            for
            model_name, id
            in path_version
        ]
        return result

    def process_target_self(
            self,
            instance_id: Union[str, uuid.UUID],
            cached_version: Dict[str, int]
    ) -> str:
        """
        Process the target self for the cache dependency.

        This method is used when the target type is SELF. It retrieves the version of the instance from the cached versions
        and returns a string that represents the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.
            cached_version (Dict[str, int]): The cached version of the cache dependency.

        Returns:
            str: The processed target self for the cache dependency.
        """
        # Get the cache key for the instance
        cache_key = self.version_key(instance_id)
        # Get the version of the instance from the cached versions
        version: int = cached_version.get(cache_key)
        # Return a string that represents the cache dependency
        return f"{self._model.__name__}__{self.source}__{self.target}__{self.field}:{version}"

    def process_target_parent(
            self,
            instance_id: Union[str, uuid.UUID],
            path_versions: Dict[str, List[List[str]]],
            versions: Dict[str, int]
    ) -> Optional[str]:
        """
        Process the target parent for the cache dependency.

        This method is used when the target type is PARENT. It retrieves the parent of the instance from the path versions,
        gets the version of the parent from the versions, and returns a string that represents the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.
            path_versions (Dict[str, List[List[str]]]): The path versions of the cache dependency.
            versions (Dict[str, int]): The versions of the cache dependency.

        Returns:
            str: The processed target parent for the cache dependency.
        """
        # Get the path versions for the instance
        path_cache_key = get_version_cache_key(
            self._model,
            str(instance_id),
            CachedFieldChoiceEnum.PATH_VERSION)
        path_versions: List[List[str]] = path_versions.get(path_cache_key)

        if not path_versions:
            return None

        if len(path_versions) < 1:
            return None

        # Get the parent of the instance from the path versions
        # Rightmost is root, leftmost is parent
        parent_model_name, parent_id = path_versions[0]
        parent_model = apps.get_model('partners', parent_model_name)

        # Get the version of the parent from the versions
        parent_version_key = get_version_cache_key(
            parent_model,
            parent_id,
            self._field_choice_type)
        parent_version = versions[parent_version_key]

        # Return a string that represents the cache dependency
        return f"{parent_model_name}__{self.source}__{self.target}__{self.field}:{parent_version}"

    def process_target_ancestor(
            self,
            instance_id: Union[str, uuid.UUID],
            path_versions: Dict[str, List[List[str]]],
            versions: Dict[str, int]
    ) -> str:
        """
        Process the target ancestor for the cache dependency.

        This method is used when the target type is ANCESTOR. It retrieves the ancestors of the instance from the path versions,
        gets the versions of the ancestors from the versions, and returns a string that represents the cache dependency.

        Args:
            instance_id (Union[str, uuid.UUID]): The instance ID of the cache dependency.
            path_versions (Dict[str, List[List[str]]]): The path versions of the cache dependency.
            versions (Dict[str, int]): The versions of the cache dependency.

        Returns:
            str: The processed target ancestor for the cache dependency.
        """
        # Get the path versions for the instance
        path_cache_key = get_version_cache_key(self._model, str(instance_id), CachedFieldChoiceEnum.PATH_VERSION)
        path_versions_list: List[List[str]] = path_versions.get(path_cache_key)
        if not path_versions_list:
            raise ValueError(f"No path versions found for {path_cache_key}")

        ancestor_versions = []
        for model_name, id in path_versions_list:
            # Get the model of the ancestor
            model: Type[models.Model] = apps.get_model('partners', model_name)
            # Get the version of the ancestor from the versions
            version_cache_key = get_version_cache_key(model, id, self._field_choice_type)
            version = versions[version_cache_key]
            # Add the version of the ancestor to the list
            ancestor_versions.append(f"{model_name}__{self.source}__{self.target}__{self.field}:{version}")

        # Return a string that represents the cache dependency
        return ",".join(ancestor_versions)
