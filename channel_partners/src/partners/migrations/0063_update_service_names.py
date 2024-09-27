from django.db import migrations


def update_service_names(apps, schema_editor):
    ChannelPartnerService = apps.get_model('partners', 'ChannelPartnerService')

    # Service Type
    LOCAL_RECORDING = 0

    # Service Sub Type
    REGULAR = 0
    DEMO = 1
    CREDIT = 2

    # Update names based on conditions
    ChannelPartnerService.objects.filter(
        type=LOCAL_RECORDING,
        sub_type=REGULAR
    ).update(name='Device Service')

    ChannelPartnerService.objects.filter(
        type=LOCAL_RECORDING,
        sub_type=DEMO
    ).update(name='Demo Device Service')

    ChannelPartnerService.objects.filter(
        type=LOCAL_RECORDING,
        sub_type=CREDIT
    ).update(name='Credit Device Service')


class Migration(migrations.Migration):
    dependencies = [
        ('partners', '0062_add_default_logging_switch_to_waffle'),
    ]

    operations = [
        migrations.RunPython(update_service_names),
    ]
