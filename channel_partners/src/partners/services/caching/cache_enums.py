from enum import StrEnum


class CachedDependencyFieldTypeEnum(StrEnum):
    """
    Enum for defining the choices for the field.
    """
    VERSION = 'version'
    DESCENDANT_VERSION = 'descendant_version'


class TargetTypeEnum(StrEnum):
    """
    Enum for defining the target types.
    """
    SELF = 'self'
    PARENT = 'parent'
    ANCESTOR = 'ancestor'


class CachedFieldChoiceEnum(StrEnum):
    """
    Enum for defining the choices for the field.
    """
    VERSION = 'version'
    DESCENDANT_VERSION = 'descendant_version'
    PATH_VERSION = 'path_version'
