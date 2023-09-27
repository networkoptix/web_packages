from collections import OrderedDict
from collections.abc import Mapping

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.fields import get_error_detail, set_value, SkipField, empty
from rest_framework.settings import api_settings
from rest_framework import serializers


VALUE_REPLACEMENT = "**REDACTED**"


class FieldAccessMixin:
    """
    Overrides `to_representation()` and `to_internal_value()` methods to implement
    fields permission checks. Data required for permissions check must be passed in
    serializer context.
    """

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
            has_write_perm_method = getattr(self, 'can_write_' + field.field_name, None)
            if has_write_perm_method is None and isinstance(field.source, str):
                has_write_perm_method = getattr(self, 'can_write_' + field.source, None)

            primitive_value = field.get_value(data)

            try:
                # field permission check must be run before any validation
                if primitive_value != empty:
                    if has_write_perm_method and not has_write_perm_method():
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
            field_source = self.fields[field_name].source
            has_read_permission_method = getattr(self, 'can_read_' + field_name, None) or getattr(self, 'can_read_' + field_source, None)
            if not has_read_permission_method:
                continue
            if not has_read_permission_method():
                ret[field_name] = VALUE_REPLACEMENT
        return ret


class FieldAccessSerializer(FieldAccessMixin, serializers.Serializer):
    pass


class FieldAccessModelSerializer(FieldAccessMixin, serializers.ModelSerializer):
    pass
