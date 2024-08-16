from collections import deque

import structlog


logger = structlog.getLogger()


class FieldOriginalMixin:
    """
    Maintains a fixed-length FIFO queue for auditing changes to specified fields.

    The `_audit` attribute is a dictionary where keys are field names and values are deques (FIFO queues) of changes.
    Upon initialization, the audit will have one entry for each observed field with its initial value.

    Attributes:
        observed_fields (list): List of field names to be audited.
        audit_length (int): Maximum number of historical values to keep for each field (default: 3).
    """
    observed_fields = []
    audit_length = 3  # Default length of the FIFO queue

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._initialize_audit()

    def has_field_changed(self, field_name, idx=None):
        """
        Check if a field has changed by comparing the current value with a historical value.

        Args:
            field_name (str): The name of the field to check.
            idx (int, optional): Index of the historical value to compare against. If None, compares with the most recent historical value.

        Returns:
            bool: True if the field has changed, False otherwise.

        Raises:
            None, but logs errors for non-existent fields or out-of-range indices.
        """
        if field_name not in self._audit:
            logger.error("Field does not exist in audit.", model=self.__class__.__name__, field=field_name)
            return False

        current_value = self._get_field_value(field_name)
        audit_history = list(self._audit[field_name])

        if idx is not None:
            if idx < 0 or idx >= len(audit_history):
                logger.error("Index out of range.", model=self.__class__.__name__, field=field_name, idx=idx)
                return False
            audited_value = audit_history[idx]
        else:
            audited_value = audit_history[0] if audit_history else None

        return current_value != audited_value

    def get_audit_history(self, field_name, idx=None):
        """
        Retrieve the audit history of a field.

        Args:
            field_name (str): The name of the field.
            idx (int, optional): Index of a specific historical value to retrieve. If None, returns the entire history.

        Returns:
            list or Any: The entire audit history as a list, or a specific historical value if idx is provided.

        Raises:
            None, but logs errors for non-existent fields or out-of-range indices.
        """
        if field_name not in self._audit:
            logger.error("Field does not exist in audit.", model=self.__class__.__name__, field=field_name)
            return []

        audit_history = list(self._audit[field_name])

        if idx is not None:
            if idx < 0 or idx >= len(audit_history):
                logger.error("Index out of range.", model=self.__class__.__name__, field=field_name, idx=idx)
                return None
            return audit_history[idx]

        return audit_history

    def save(self, *args, **kwargs):
        self._update_audit()
        super().save(*args, **kwargs)

    def _initialize_audit(self):
        """
        Initialize the audit dictionary with deques for each observed field,
        ensuring that initial values, including None, are captured.
        """
        self._audit = {}
        if self.observed_fields:
            for field_name in self.observed_fields:
                if self._field_exists(field_name):
                    self._audit[field_name] = deque(maxlen=self.audit_length)
                    current_value = self._get_field_value(field_name)
                    self._audit[field_name].appendleft(current_value)
                else:
                    logger.warning("Field does not exist on model.", model=self.__class__.__name__, field=field_name)

    def _update_audit(self):
        """
        Update the audit dictionary with the current values of the observed fields.
        This method now explicitly handles the case where a field's current value is None,
        ensuring that such changes are also tracked in the audit history.
        """
        if self.observed_fields:
            for field_name in self.observed_fields:
                if self._field_exists(field_name):
                    current_value = self._get_field_value(field_name)
                    self._audit[field_name].appendleft(current_value)
                else:
                    logger.warning("Field does not exist on model.", model=self.__class__.__name__, field=field_name)

    def _field_exists(self, field_name):
        """
        Check if a field exists on the model.
        """
        return field_name in self.__dict__ or hasattr(self.__class__, field_name)

    def _get_field_value(self, field_name):
        """
        Get the value of a field, bypassing the ORM mechanisms to avoid recursion.
        """
        return self.__dict__.get(field_name, None)
