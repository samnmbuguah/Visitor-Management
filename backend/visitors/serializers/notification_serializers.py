"""
Serializers for notification models and push notification APIs.
"""

from rest_framework import serializers
from visitors.notification_models import DeviceToken, NotificationLog, NotificationPreference


class DeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer for device tokens."""
    
    class Meta:
        model = DeviceToken
        fields = [
            'id', 'token', 'token_type', 'device_name', 'device_model',
            'app_version', 'os_version', 'enabled', 'security_alerts',
            'gate_access', 'camera_offline', 'system_anomalies',
            'created_at', 'last_used_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'last_used_at', 'is_active']
        
    def validate_token(self, value):
        """Validate FCM token format."""
        from ..services.push_service import push_service
        
        if not push_service.validate_fcm_token(value):
            raise serializers.ValidationError("Invalid device token format")
        return value


class RegisterDeviceTokenSerializer(serializers.Serializer):
    """Serializer for registering device tokens."""
    token = serializers.CharField(max_length=500, required=True)
    token_type = serializers.ChoiceField(
        choices=DeviceToken.TOKEN_TYPES,
        default='fcm'
    )
    device_name = serializers.CharField(max_length=100, required=False)
    device_model = serializers.CharField(max_length=100, required=False)
    app_version = serializers.CharField(max_length=20, required=False)
    os_version = serializers.CharField(max_length=20, required=False)


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs."""
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'notification_type', 'title', 'message', 'severity',
            'status', 'sent_at', 'delivered_at', 'read_at',
            'created_at', 'error_message'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at', 'delivered_at', 'read_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for notification preferences."""
    
    quiet_hours_start = serializers.TimeField(required=False, allow_null=True)
    quiet_hours_end = serializers.TimeField(required=False, allow_null=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'push_enabled', 'email_enabled', 'sms_enabled',
            'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
            'security_alerts_enabled', 'gate_access_enabled',
            'camera_offline_enabled', 'system_anomalies_enabled',
            'low_severity_enabled', 'medium_severity_enabled',
            'high_severity_enabled', 'critical_severity_enabled',
            'max_notifications_per_hour'
        ]
        
    def validate(self, data):
        """Validate quiet hours configuration."""
        quiet_hours_enabled = data.get('quiet_hours_enabled')
        quiet_hours_start = data.get('quiet_hours_start')
        quiet_hours_end = data.get('quiet_hours_end')
        
        if quiet_hours_enabled:
            if not quiet_hours_start or not quiet_hours_end:
                raise serializers.ValidationError(
                    "Both quiet_hours_start and quiet_hours_end are required when quiet_hours_enabled is True"
                )
                
        return data


class NotificationHistorySerializer(serializers.Serializer):
    """Serializer for notification history response."""
    notifications = NotificationLogSerializer(many=True)
    pagination = serializers.DictField()


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""
    total = serializers.IntegerField()
    sent = serializers.IntegerField()
    failed = serializers.IntegerField()
    read = serializers.IntegerField()
    unread = serializers.IntegerField()
    delivery_rate = serializers.FloatField()
    read_rate = serializers.FloatField()
    by_type = serializers.DictField()
    by_severity = serializers.DictField()
    recent_24h = serializers.IntegerField()


class SendTestNotificationSerializer(serializers.Serializer):
    """Serializer for sending test notifications."""
    message = serializers.CharField(max_length=500, required=False, default="This is a test notification")
    severity = serializers.ChoiceField(
        choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')],
        default='LOW'
    )
