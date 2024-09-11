from django.db import migrations
from waffle.models import Switch


def add_switch(apps, schema_editor):
    Switch.objects.get_or_create(name='logging_debug_active', defaults={'active': False})


def remove_switch(apps, schema_editor):
    Switch.objects.filter(name='logging_debug_active').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('partners', '0061_alter_reportsnapshot_unique_together_and_more'),
        ('waffle', '__latest__'),
    ]

    operations = [
        migrations.RunPython(add_switch, remove_switch),
    ]
