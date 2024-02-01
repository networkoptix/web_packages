from collections import OrderedDict
from collections.abc import Mapping

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.functional import cached_property
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.fields import (
    SkipField,
    empty,
    get_error_detail,
    set_value,
)
from rest_framework.settings import api_settings

from partners.models import (
    CloudHost,
    CloudUser,
)
from tools.access_matrix import (
    AccessTypes,
    UserAccessMatrix,
)


VALUE_REPLACEMENT = "**REDACTED**"


class FieldAccessMixin:
    """
    Overrides `to_representation()` and `to_internal_value()` methods to implement
    fields permission checks. Data required for permissions check must be passed in
    serializer context.
    """

    def get_write_perm_method(self, field):
        return getattr(self, f'can_write_{field.field_name}', None)

    def get_read_perm_method(self, field):
        return getattr(self, f'can_read_{field.field_name}', None)

    def to_internal_value(self, data):
        """
        Dict of native values <- Dict of primitive datatypes.
        """
        if not isinstance(data, Mapping):
            message = self.error_messages['invalid'].format(
                datatype=type(data).__name__
            )
            raise ValidationError({
                api_settings.NON_FIELD_ERRORS_KEY: [message]
            }, code='invalid')

        ret = OrderedDict()
        errors = OrderedDict()
        fields = self._writable_fields

        for field in fields:
            validate_method = getattr(self, 'validate_' + field.field_name, None)
            has_write_perm_method = self.get_write_perm_method(field)

            primitive_value = field.get_value(data)

            try:
                # field permission check must be run before any validation
                if primitive_value != empty:
                    if has_write_perm_method and not has_write_perm_method(instance=self.instance):
                        raise ValidationError(
                            f"User is not allowed to modify this field. Field: {field.field_name}.",
                            code="forbidden"
                        )
                validated_value = field.run_validation(primitive_value)
                if validate_method is not None:
                    validated_value = validate_method(validated_value)
            except ValidationError as exc:
                errors[field.field_name] = exc.detail
            except DjangoValidationError as exc:
                errors[field.field_name] = get_error_detail(exc)
            except SkipField:
                pass
            else:
                set_value(ret, field.source_attrs, validated_value)

        if errors:
            raise ValidationError(errors)

        return ret

    def to_representation(self, instance):
        ret = super().to_representation(instance=instance)
        for field_name in ret:
            has_read_permission_method = self.get_read_perm_method(self.fields[field_name])
            if not has_read_permission_method:
                continue
            if not has_read_permission_method(instance=instance):
                ret[field_name] = VALUE_REPLACEMENT
        return ret


class FieldAccessSerializer(FieldAccessMixin, serializers.Serializer):
    pass


class FieldAccessModelSerializer(FieldAccessMixin, serializers.ModelSerializer):
    pass


def field_perm_method_wrapper(serializer, field, access_type: AccessTypes):
    if not serializer.user_access_matrix.access_matrix.fields.get(field.field_name):
        return None

    def method(instance=None):
        return serializer.user_access_matrix.check_permission(
            field_name=field.field_name, access_type=access_type, target_instance=instance)

    return method


class AccessMatrixMixin:
    CONTENT_TYPE = None

    @property
    def _content_type(self):
        if not self.CONTENT_TYPE:
            raise ValueError(f"CONTENT_TYPE must be set for using field access level with serializer.")
        return self.CONTENT_TYPE

    @property
    def request_user(self) -> CloudUser:
        return self.context['request'].user

    @property
    def request_cloud_host(self) -> CloudHost:
        return self.context['cloud_host']

    @cached_property
    def user_access_matrix(self):
        return UserAccessMatrix(cloud_user=self.request_user,
                                content_type=self._content_type,
                                request=self.context.get('request'))

    def get_write_perm_method(self, field):
        explicit_method = getattr(self, f'can_write_{field.field_name}', None)
        if explicit_method:
            return explicit_method
        
        return field_perm_method_wrapper(self, field, AccessTypes.write)

    def get_read_perm_method(self, field):
        explicit_method = getattr(self, f'can_read_{field.field_name}', None)
        if explicit_method:
            return explicit_method
        return field_perm_method_wrapper(self, field, AccessTypes.read)


class NullValuePKField(serializers.PrimaryKeyRelatedField):
    def __init__(self, **kwargs):
        self.null_value = kwargs.pop('null_value', None)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        """
        Replace field data with null if value equals `null_value`.
        """
        if self.null_value:
            if data == self.null_value:
                return None
        return super().to_internal_value(data)
