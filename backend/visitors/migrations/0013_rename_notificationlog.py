# Generated migration to rename NotificationLog to EmailNotificationLog

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('visitors', '0011_rename_pre_registration_gateaccesslog_related_pre_registration_and_more'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='NotificationLog',
            new_name='EmailNotificationLog',
        ),
    ]
