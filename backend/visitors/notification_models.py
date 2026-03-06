"""
Models for managing push notification device tokens and preferences.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class DeviceToken(models.Model):
    """Model for storing FCM device tokens for push notifications."""
    
    TOKEN_TYPES = [
        ('fcm', 'Firebase Cloud Messaging'),
        ('apns', 'Apple Push Notification Service'),
        ('web', 'Web Push'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.TextField(unique=True, help_text='FCM/APNS device token')
    token_type = models.CharField(max_length=10, choices=TOKEN_TYPES, default='fcm')
    device_name = models.CharField(max_length=100, blank=True, help_text='User-friendly device name')
    device_model = models.CharField(max_length=100, blank=True)
    app_version = models.CharField(max_length=20, blank=True)
    os_version = models.CharField(max_length=20, blank=True)
    
    # Notification preferences
    enabled = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    gate_access = models.BooleanField(default=True)
    camera_offline = models.BooleanField(default=True)
    system_anomalies = models.BooleanField(default=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.device_name or self.token_type}"
        
    def update_last_used(self):
        """Update last used timestamp."""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])
        
    def disable(self):
        """Disable this token."""
        self.is_active = False
        self.enabled = False
        self.save(update_fields=['is_active', 'enabled'])


class NotificationLog(models.Model):
    """Model for logging sent notifications."""
    
    NOTIFICATION_TYPES = [
        ('security_alert', 'Security Alert'),
        ('gate_access', 'Gate Access'),
        ('camera_offline', 'Camera Offline'),
        ('system_anomaly', 'System Anomaly'),
        ('test', 'Test Notification'),
    ]
    
    STATUSES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_logs')
    device_token = models.ForeignKey(DeviceToken, on_delete=models.CASCADE, null=True, related_name='notification_logs')
    
    # Notification details
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical')
    ])
    
    # Delivery status
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    sent_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    
    # Response data
    response_data = models.JSONField(blank=True, default=dict, help_text='Response from notification service')
    error_message = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
        ]
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.notification_type} - {self.status}"
        
    def mark_sent(self, response_data=None):
        """Mark notification as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        if response_data:
            self.response_data = response_data
        self.save(update_fields=['status', 'sent_at', 'response_data'])
        
    def mark_failed(self, error_message):
        """Mark notification as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message'])
        
    def mark_delivered(self):
        """Mark notification as delivered."""
        self.delivered_at = timezone.now()
        self.save(update_fields=['delivered_at'])
        
    def mark_read(self):
        """Mark notification as read."""
        self.read_at = timezone.now()
        self.save(update_fields=['read_at'])


class NotificationPreference(models.Model):
    """User preferences for different types of notifications."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Global preferences
    push_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    sms_enabled = models.BooleanField(default=False)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(blank=True, null=True, help_text='Start of quiet hours (24-hour format)')
    quiet_hours_end = models.TimeField(blank=True, null=True, help_text='End of quiet hours (24-hour format)')
    
    # Security preferences
    security_alerts_enabled = models.BooleanField(default=True)
    gate_access_enabled = models.BooleanField(default=True)
    camera_offline_enabled = models.BooleanField(default=True)
    system_anomalies_enabled = models.BooleanField(default=True)
    
    # Severity filters
    low_severity_enabled = models.BooleanField(default=False)
    medium_severity_enabled = models.BooleanField(default=True)
    high_severity_enabled = models.BooleanField(default=True)
    critical_severity_enabled = models.BooleanField(default=True)
    
    # Frequency limits
    max_notifications_per_hour = models.IntegerField(default=20, help_text='Maximum notifications per hour')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__username']
        
    def __str__(self):
        return f"{self.user.username} - Preferences"
        
    def is_quiet_hours(self):
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled or not self.quiet_hours_start or not self.quiet_hours_end:
            return False
            
        now = timezone.now().time()
        
        if self.quiet_hours_start <= self.quiet_hours_end:
            # Same day range (e.g., 22:00 to 06:00)
            return self.quiet_hours_start <= now <= self.quiet_hours_end
        else:
            # Overnight range (e.g., 22:00 to 06:00 next day)
            return now >= self.quiet_hours_start or now <= self.quiet_hours_end
            
    def should_send_notification(self, notification_type, severity):
        """Check if notification should be sent based on preferences."""
        # Check global enabled
        if not self.push_enabled:
            return False
            
        # Check quiet hours
        if self.is_quiet_hours():
            return False
            
        # Check notification type
        type_checks = {
            'security_alert': self.security_alerts_enabled,
            'gate_access': self.gate_access_enabled,
            'camera_offline': self.camera_offline_enabled,
            'system_anomaly': self.system_anomalies_enabled,
        }
        
        if notification_type in type_checks and not type_checks[notification_type]:
            return False
            
        # Check severity
        severity_checks = {
            'LOW': self.low_severity_enabled,
            'MEDIUM': self.medium_severity_enabled,
            'HIGH': self.high_severity_enabled,
            'CRITICAL': self.critical_severity_enabled,
        }
        
        if severity in severity_checks and not severity_checks[severity]:
            return False
            
        return True
