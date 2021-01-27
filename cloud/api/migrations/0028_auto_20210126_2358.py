from django.db import migrations, models

def clear_custom_properties(apps, schema_editor):
    AccountCustomProperty = apps.get_model('api', "AccountCustomProperty")
    db_alias = schema_editor.connection.alias
    existing = AccountCustomProperty.objects.using(db_alias).all().order_by('-id')
    unique = set()
    for property in existing:
        current = f'{property.account.email} - {property.endpoint}'
        if current in unique:
            property.delete()
        else:
            unique.add(current)

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0027_accountcustomproperty'),
    ]

    operations = [
        migrations.RunPython(clear_custom_properties, reverse_code=lambda apps, schema: None),
        migrations.AddConstraint(
            model_name='accountcustomproperty',
            constraint=models.UniqueConstraint(fields=('account', 'endpoint'), name='User Unique Endpoints'),
        ),
    ]
