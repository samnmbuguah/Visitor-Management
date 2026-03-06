# Generated migration for security models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('visitors', '0009_subscriptionplan_tenant_subscription_host_tenant_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='GateAccessLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('plate_number', models.CharField(blank=True, help_text='Detected number plate', max_length=20)),
                ('access_type', models.CharField(choices=[('pre_registered', 'Pre-registered Visitor'), ('returning_visitor', 'Returning Visitor'), ('authorized_vehicle', 'Authorized Vehicle'), ('unknown', 'Unknown Plate'), ('manual_open', 'Manual Open'), ('emergency_open', 'Emergency Open'), ('scheduled_open', 'Scheduled Open')], max_length=20)),
                ('access_granted', models.BooleanField(default=False)),
                ('confidence_score', models.FloatField(blank=True, help_text='OCR confidence score (0-1)', null=True)),
                ('image_path', models.CharField(blank=True, help_text='Path to captured image', max_length=500)),
                ('detected_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Additional detection metadata')),
                ('pre_registration', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='gate_access_logs', to='visitors.preregistration')),
                ('related_visitor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='gate_access_logs', to='visitors.visitor')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gate_access_logs', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-detected_at'],
                'indexes': [
                    models.Index(fields=['tenant', 'detected_at'], name='visitors_gate_access_log_tenant_d_6f8c5f_idx'),
                    models.Index(fields=['plate_number'], name='visitors_gate_access_log_plate_n_5c3c4b_idx'),
                    models.Index(fields=['access_type'], name='visitors_gate_access_log_access__e9c3b5_idx'),
                    models.Index(fields=['access_granted'], name='visitors_gate_access_log_access__b8e5d5_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='SecurityIncident',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('incident_type', models.CharField(choices=[('unauthorized_access', 'Unauthorized Access Attempt'), ('tailgating', 'Tailgating Detected'), ('loitering', 'Loitering Detected'), ('forced_access', 'Forced Access Attempt'), ('camera_tampering', 'Camera Tampering'), ('system_anomaly', 'System Anomaly'), ('security_breach', 'Security Breach'), ('other', 'Other')], max_length=20)),
                ('severity', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], max_length=10)),
                ('status', models.CharField(choices=[('OPEN', 'Open'), ('INVESTIGATING', 'Investigating'), ('RESOLVED', 'Resolved'), ('FALSE_ALARM', 'False Alarm')], default='OPEN', max_length=15)),
                ('detected_at', models.DateTimeField(auto_now_add=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('evidence_images', models.JSONField(blank=True, default=list, help_text='List of image paths')),
                ('evidence_videos', models.JSONField(blank=True, default=list, help_text='List of video paths')),
                ('resolution_notes', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_incidents', to='auth.user')),
                ('location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='visitors.location')),
                ('related_gate_logs', models.ManyToManyField(blank=True, related_name='security_incidents', to='visitors.gateaccesslog')),
                ('related_visitors', models.ManyToManyField(blank=True, related_name='security_incidents', to='visitors.visitor')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='security_incidents', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-detected_at'],
                'indexes': [
                    models.Index(fields=['tenant', 'detected_at'], name='visitors_security_incident_tenant__f3c5c_idx'),
                    models.Index(fields=['severity'], name='visitors_security_incident_severi_8a1d7f_idx'),
                    models.Index(fields=['status'], name='visitors_security_incident_status_7e2c8b_idx'),
                    models.Index(fields=['incident_type'], name='visitors_security_incident_incide_2e4d3f_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='SecurityAlert',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('alert_type', models.CharField(choices=[('gate_anomaly', 'Gate Anomaly'), ('unrecognized_plate', 'Unrecognized Plate'), ('multiple_attempts', 'Multiple Access Attempts'), ('off_hours_access', 'Off-Hours Access'), ('camera_offline', 'Camera Offline'), ('system_error', 'System Error')], max_length=20)),
                ('message', models.TextField()),
                ('severity', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('acknowledged', models.BooleanField(default=False)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('acknowledged_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acknowledged_alerts', to='auth.user')),
                ('related_gate_log', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='visitors.gateaccesslog')),
                ('related_incident', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='visitors.securityincident')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='security_alerts', to='visitors.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['tenant', 'created_at'], name='visitors_security_alert_tenant_c_8b5e4_idx'),
                    models.Index(fields=['is_active'], name='visitors_security_alert_is_acti_7c3e2f_idx'),
                    models.Index(fields=['acknowledged'], name='visitors_security_alert_acknow_9e4d5f_idx'),
                    models.Index(fields=['alert_type'], name='visitors_security_alert_alert__a1c2e3_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='CameraStatus',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('rtsp_url', models.URLField()),
                ('camera_type', models.CharField(default='gate', help_text='gate, entrance, exit, parking, etc.', max_length=20)),
                ('status', models.CharField(choices=[('ONLINE', 'Online'), ('OFFLINE', 'Offline'), ('ERROR', 'Error'), ('MAINTENANCE', 'Maintenance')], default='OFFLINE', max_length=15)),
                ('last_seen', models.DateTimeField(blank=True, null=True)),
                ('uptime_percentage', models.FloatField(default=0.0, help_text='Uptime percentage for the last 24 hours')),
                ('is_monitoring', models.BooleanField(default=False)),
                ('monitoring_started_at', models.DateTimeField(blank=True, null=True)),
                ('total_detections', models.IntegerField(default=0)),
                ('successful_reads', models.IntegerField(default=0)),
                ('failed_reads', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='visitors.location')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='camera_statuses', to='visitors.tenant')),
            ],
            options={
                'ordering': ['tenant', 'location', 'name'],
                'unique_together': {('tenant', 'rtsp_url')},
                'indexes': [
                    models.Index(fields=['tenant', 'status'], name='visitors_camera_status_tenant_s_5c3e4f_idx'),
                    models.Index(fields=['is_monitoring'], name='visitors_camera_status_is_mon_7e2d8f_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='VisitorTracking',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tracking_type', models.CharField(choices=[('entry', 'Entry'), ('exit', 'Exit'), ('movement', 'Movement'), ('zone_change', 'Zone Change'), ('checkpoint', 'Checkpoint')], max_length=15)),
                ('zone', models.CharField(blank=True, help_text='Specific zone within location', max_length=50)),
                ('x_coordinate', models.FloatField(blank=True, null=True)),
                ('y_coordinate', models.FloatField(blank=True, null=True)),
                ('tracking_method', models.CharField(default='manual', help_text='manual, rfid, facial_recognition, plate_recognition', max_length=20)),
                ('device_id', models.CharField(blank=True, max_length=100)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('location', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='visitors.location')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='visitor_tracking', to='visitors.tenant')),
                ('visitor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tracking_logs', to='visitors.visitor')),
            ],
            options={
                'ordering': ['-timestamp'],
                'indexes': [
                    models.Index(fields=['tenant', 'visitor', 'timestamp'], name='visitors_visitor_tracking_tenant__e9c5f_idx'),
                    models.Index(fields=['tracking_type'], name='visitors_visitor_tracking_tracki_2e4d3f_idx'),
                    models.Index(fields=['location'], name='visitors_visitor_tracking_locat_7a3c8f_idx'),
                    models.Index(fields=['timestamp'], name='visitors_visitor_tracking_times_8b5e4f_idx'),
                ],
            },
        ),
    ]
