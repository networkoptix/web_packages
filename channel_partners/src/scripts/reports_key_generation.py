import datetime
from time import time
from uuid import (
    UUID,
    uuid4,
)

from partners.models import (
    ReportSnapshot,
    ReportSnapshotStringKey,
)


entity_id_range = range(1000, 2000)
service_count = 20
zero_data = datetime.date(2023, 12, 15)
report_types = (
    ReportSnapshot.ReportType.system_regular_report,
    ReportSnapshot.ReportType.organization_systems_reports,
    ReportSnapshot.ReportType.channel_partner_organization_usages,
)

def values_key_generation():
    ret = []
    for entity_idx in entity_id_range:
        for service_idx in range(service_count):
            report_type = report_types[service_idx % 3]
            start_date = zero_data + datetime.timedelta(days=2 * service_idx)
            entity_id = UUID(int=entity_idx, version=4)
            service_id = UUID(int=entity_idx * 1000 + service_idx, version=4)
            ret.append((entity_id, report_type, service_id, start_date))
    return ret


def string_key_conv(values_keys):
    pat = '{}-{}-{}-{}'
    return [pat.format(*values) for values in values_keys]


def generate():
    values_keys = values_key_generation()
    string_values = string_key_conv(values_keys)
    str_key_objects = []
    values_key_objects = []
    for value in string_values:
        str_key_objects.append(ReportSnapshotStringKey(
            key=value, report_data={f'{uuid4()}': f'{uuid4()}'}
        ))
    ReportSnapshotStringKey.objects.bulk_create(str_key_objects, batch_size=500)
    for entity_id, report_type, service_id, start_date in values_keys:
        values_key_objects.append(ReportSnapshot(
            entity_id=entity_id,
            report_type=report_type.value,
            service_id=service_id,
            start_date=start_date,
            report_data={f'{uuid4()}': f'{uuid4()}'}
        ))
    ReportSnapshot.objects.bulk_create(values_key_objects, batch_size=500)



def test():
    values_keys = values_key_generation()
    string_values = string_key_conv(values_keys)
    max = 0
    min = 1000
    total = 0
    ts = time()
    for key in string_values:
        tsi = time()
        report = ReportSnapshotStringKey.objects.get(key=key)
        dur = time() - tsi
        if dur > max:
            max = dur
        if dur < min:
            min = dur
        total += dur
    print(f'Querying by unique string key: {total}s')
    print(f'Max: {max}')
    print(f'Min: {min}')
    ts = time()
    max = 0
    min = 1000
    total = 0
    for entity_id, report_type, service_id, start_date in values_keys:
        tsi = time()
        report = ReportSnapshot.objects.get(
            entity_id=entity_id,
            report_type=report_type.value,
            service_id=service_id,
            start_date=start_date
        )
        dur = time() - tsi
        if dur > max:
            max = dur
        if dur < min:
            min = dur
        total += dur
    print(f'Querying by unique compound key: {total}s')
    print(f'Max: {max}')
    print(f'Min: {min}')


def test_complex_query():
    values_keys = values_key_generation()
    string_values = string_key_conv(values_keys)
    max = 0
    min = 1000
    total = 0
    ts = time()
    for entity_id, report_type, service_id, start_date in values_keys:
        tsi = time()
        report = ReportSnapshotStringKey.objects.filter(key__contains=f'{entity_id}').count()
        dur = time() - tsi
        if dur > max:
            max = dur
        if dur < min:
            min = dur
        total += dur
    print(f'Querying by unique string key: {total}s')
    print(f'Max: {max}')
    print(f'Min: {min}')
    ts = time()
    max = 0
    min = 1000
    total = 0
    for entity_id, report_type, service_id, start_date in values_keys:
        tsi = time()
        report = ReportSnapshot.objects.filter(
            entity_id=entity_id,
        ).count()
        dur = time() - tsi
        if dur > max:
            max = dur
        if dur < min:
            min = dur
        total += dur
    print(f'Querying by unique compound key: {total}s')
    print(f'Max: {max}')
    print(f'Min: {min}')

