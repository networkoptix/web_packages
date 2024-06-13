class FieldOriginalMixin:
    """
    Populates '_original_{field_name}' fields with original values.
    TODO. Fix usage with newly created objects
    """
    observed_fields = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.observed_fields:
            for field_name in self.observed_fields:
                # Directly access the instance's __dict__ to avoid recursion
                setattr(self, f'_original_{field_name}', self.__dict__.get(field_name))

    def save(self, *args, **kwargs):
        if self.observed_fields:
            for field_name in self.observed_fields:
                # Directly access the instance's __dict__ to avoid recursion
                setattr(self, f'_original_{field_name}', self.__dict__.get(field_name))
        super().save(*args, **kwargs)