from django.db import connection, migrations

# Keeping this migration just to keep current graph consistent with history on prod


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_account_customization'),
    ]

    operations = [
    ]
