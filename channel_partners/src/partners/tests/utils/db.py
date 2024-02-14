from django.db.models import Func


class RemoveArrayElement(Func):
    function = "ARRAY_REMOVE"
    template = "%(function)s(%(expressions)s, '%(element)s')"
