from partners.models import (
    CloudSystemId,
    Organization,
    SystemGroup,
)
from tools.helpers import get_path_from_parent


def fix_group_path(group: SystemGroup):
    correct_path = get_path_from_parent(group.parent or group.organization)
    if group.path != correct_path:
        print(f"Fixing group '{group}' correct path {correct_path}, existing path {group.path}")
        group.path = correct_path
        group.save()

    for sub_group in SystemGroup.objects.filter(parent=group):
        fix_group_path(sub_group)


def fix_systems_paths():
    all_systems = CloudSystemId.objects.all()
    updated_systems = []
    for system in all_systems:
        correct_path = get_path_from_parent(system.system_group or system.organization)
        if system.path != correct_path:
            print(f"Fixing system '{system.id}' correct path {correct_path}, existing path {system.path}")
            system.path = correct_path
            updated_systems.append(system)
    CloudSystemId.objects.bulk_update(updated_systems, fields=['path'], batch_size=100)


def run():
    for organization in Organization.objects.all():
        for group in organization.groups.filter(parent__isnull=True):
            fix_group_path(group)
    fix_systems_paths()
