from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("visitors", "0021_alter_tenantuser_role_alter_userprofile_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="visitor",
            name="email",
            field=models.EmailField(db_index=True),
        ),
        migrations.AlterField(
            model_name="visitor",
            name="checkin_time",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AlterField(
            model_name="visitor",
            name="status",
            field=models.CharField(
                choices=[
                    ("CHECKED_IN", "Checked In"),
                    ("CHECKED_OUT", "Checked Out"),
                    ("PENDING", "Pending Approval"),
                    ("REJECTED", "Rejected"),
                ],
                db_index=True,
                default="CHECKED_IN",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="host",
            name="email",
            field=models.EmailField(db_index=True, max_length=254, unique=True),
        ),
        migrations.AlterField(
            model_name="preregistration",
            name="expected_arrival",
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AlterField(
            model_name="preregistration",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("USED", "Used"),
                    ("CANCELLED", "Cancelled"),
                    ("EXPIRED", "Expired"),
                ],
                db_index=True,
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="parcel",
            name="status",
            field=models.CharField(
                choices=[
                    ("RECEIVED", "Received"),
                    ("NOTIFIED", "Notified"),
                    ("COLLECTED", "Collected"),
                ],
                db_index=True,
                default="RECEIVED",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="visitor",
            index=models.Index(
                fields=["tenant", "status"], name="visitor_tenant_status_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="visitor",
            index=models.Index(
                fields=["location", "checkin_time"],
                name="visitor_location_checkin_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="preregistration",
            index=models.Index(
                fields=["tenant", "status"], name="prereg_tenant_status_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="visitor",
            index=models.Index(
                fields=["phone"], name="visitor_phone_idx"
            ),
        ),
    ]
