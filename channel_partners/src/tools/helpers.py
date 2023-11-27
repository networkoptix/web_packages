import typing
import uuid

from django.utils import timezone


def get_period_start():
    return timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_path_from_parent(parent) -> typing.List[uuid.UUID]:
    path = [parent.id] + (parent.path or [])
    return path
