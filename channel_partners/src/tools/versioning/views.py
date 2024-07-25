from typing import (
    Dict,
    Optional,
)

from tools.versioning.utils import (
    Versions,
    versioned_serializer,
)


class VersionedViewMixin:
    versions: Optional[Versions] = None
    actions_versions: Dict[str, Versions] = {}

    def __init__(self, *args, versions: Versions = None, **kwargs):
        super().__init__(*args, **kwargs)
        if versions:
            self.versions = versions

    def get_serializer_class_for_action(self):
        """
        Get the serializer class for the current action.
        This method must be implemented by the subclass.
        :return: serializer class
        """
        return super().get_serializer_class()

    def get_serializer_class(self):
        base_serializer_class = self.get_serializer_class_for_action()
        serializer = versioned_serializer(base_serializer_class, self.request.version)
        return serializer
