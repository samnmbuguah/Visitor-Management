from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class GateAccessLog(models.Model):
    """Log of all gate access attempts and events."""
    
    ACCESS_TYPES = [
        ('pre_registered', 'Pre-registered Visitor'),
        ('returning_visitor', 'Returning Visitor'),
        ('authorized_vehicle', 'Authorized Vehicle'),
        ('unknown', 'Unknown Plate'),
        ('manual_open', 'Manual Open'),
        ('emergency_open', 'Emergency Open'),
        ('scheduled_open', 'Scheduled Open'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('visitors.Tenant', on_delete=models.CASCADE, related_name='gate_access_logs')
    
    # Access details
    plate_number = models.CharField(max_length=20, blank=True, help_text="Detected number plate")
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES)
    access_granted = models.BooleanField(default=False)
    
    # Relationships
    related_visitor = models.ForeignKey('visitors.Visitor', on_delete=models.SET_NULL, null=True, blank=True, related_name='gate_access_logs')
    related_pre_registration = models.ForeignKey('visitors.PreRegistration', on_delete=models.SET_NULL, null=True, blank=True, related_name='gate_access_logs')
    
    # Metadata
    confidence_score = models.FloatField(null=True, blank=True, help_text="OCR confidence score (0-1)")
    image_path = models.CharField(max_length=500, blank=True, help_text="Path to captured image")
    
    # Timestamps
    detected_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional detection metadata")
    
    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['tenant', 'detected_at']),
            models.Index(fields=['plate_number']),
            models.Index(fields=['access_type']),
            models.Index(fields=['access_granted']),
        ]
    
    def __str__(self):
        return f"{self.plate_number or 'Manual'} - {self.access_type} ({'Granted' if self.access_granted else 'Denied'})"


class SecurityIncident(models.Model):
    """Security incidents and threats."""
    
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    INCIDENT_TYPES = [
        ('unauthorized_access', 'Unauthorized Access Attempt'),
        ('tailgating', 'Tailgating Detected'),
        ('loitering', 'Loitering Detected'),
        ('forced_access', 'Forced Access Attempt'),
        ('camera_tampering', 'Camera Tampering'),
        ('system_anomaly', 'System Anomaly'),
        ('security_breach', 'Security Breach'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('INVESTIGATING', 'Investigating'),
        ('RESOLVED', 'Resolved'),
        ('FALSE_ALARM', 'False Alarm'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('visitors.Tenant', on_delete=models.CASCADE, related_name='security_incidents')
    
    # Incident details
    title = models.CharField(max_length=200)
    description = models.TextField()
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='OPEN')
    
    # Location and time
    location = models.ForeignKey('visitors.Location', on_delete=models.SET_NULL, null=True, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_visitors = models.ManyToManyField('visitors.Visitor', blank=True, related_name='security_incidents')
    related_gate_logs = models.ManyToManyField('GateAccessLog', blank=True, related_name='security_incidents')
    
    # Evidence
    evidence_images = models.JSONField(default=list, help_text="List of image paths")
    evidence_videos = models.JSONField(default=list, help_text="List of video paths")
    
    # Assigned to
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents')
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-detected_at']
        indexes = [
            models.Index(fields=['tenant', 'detected_at']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['incident_type']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.severity} ({self.status})"


class SecurityAlert(models.Model):
    """Real-time security alerts."""
    
    ALERT_TYPES = [
        ('gate_anomaly', 'Gate Anomaly'),
        ('unrecognized_plate', 'Unrecognized Plate'),
        ('multiple_attempts', 'Multiple Access Attempts'),
        ('off_hours_access', 'Off-Hours Access'),
        ('camera_offline', 'Camera Offline'),
        ('system_error', 'System Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('visitors.Tenant', on_delete=models.CASCADE, related_name='security_alerts')
    
    # Alert details
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SecurityIncident.SEVERITY_LEVELS)
    
    # Status
    is_active = models.BooleanField(default=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    # Related objects
    related_incident = models.ForeignKey(SecurityIncident, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    related_gate_log = models.ForeignKey(GateAccessLog, on_delete=models.SET_NULL, null=True, blank=True, related_name='alerts')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'created_at']),
            models.Index(fields=['is_active']),
            models.Index(fields=['acknowledged']),
            models.Index(fields=['alert_type']),
        ]
    
    def __str__(self):
        return f"{self.alert_type} - {self.severity}"


class CameraStatus(models.Model):
    """Status monitoring for security cameras."""
    
    STATUS_CHOICES = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('ERROR', 'Error'),
        ('MAINTENANCE', 'Maintenance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('visitors.Tenant', on_delete=models.CASCADE, related_name='camera_statuses')
    
    # Camera details
    name = models.CharField(max_length=100)
    location = models.ForeignKey('visitors.Location', on_delete=models.SET_NULL, null=True, blank=True)
    rtsp_url = models.URLField()
    camera_type = models.CharField(max_length=20, default='gate', help_text="gate, entrance, exit, parking, etc.")
    
    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='OFFLINE')
    last_seen = models.DateTimeField(null=True, blank=True)
    uptime_percentage = models.FloatField(default=0.0, help_text="Uptime percentage for the last 24 hours")
    
    # Monitoring
    is_monitoring = models.BooleanField(default=False)
    monitoring_started_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    total_detections = models.IntegerField(default=0)
    successful_reads = models.IntegerField(default=0)
    failed_reads = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['tenant', 'location', 'name']
        unique_together = ['tenant', 'rtsp_url']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['is_monitoring']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.status}"


class VisitorTracking(models.Model):
    """Real-time visitor tracking and movement."""
    
    TRACKING_TYPES = [
        ('entry', 'Entry'),
        ('exit', 'Exit'),
        ('movement', 'Movement'),
        ('zone_change', 'Zone Change'),
        ('checkpoint', 'Checkpoint'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('visitors.Tenant', on_delete=models.CASCADE, related_name='visitor_tracking')
    
    # Visitor
    visitor = models.ForeignKey('visitors.Visitor', on_delete=models.CASCADE, related_name='tracking_logs')
    
    # Tracking details
    tracking_type = models.CharField(max_length=15, choices=TRACKING_TYPES)
    location = models.ForeignKey('visitors.Location', on_delete=models.SET_NULL, null=True, blank=True)
    zone = models.CharField(max_length=50, blank=True, help_text="Specific zone within location")
    
    # Coordinates (if available)
    x_coordinate = models.FloatField(null=True, blank=True)
    y_coordinate = models.FloatField(null=True, blank=True)
    
    # Device/Method
    tracking_method = models.CharField(max_length=20, default='manual', help_text="manual, rfid, facial_recognition, plate_recognition")
    device_id = models.CharField(max_length=100, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['tenant', 'visitor', 'timestamp']),
            models.Index(fields=['tracking_type']),
            models.Index(fields=['location']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.visitor.name} - {self.tracking_type} at {self.timestamp}"
