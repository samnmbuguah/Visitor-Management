from rest_framework import serializers
from ..models.security_models import (
    GateAccessLog, SecurityIncident, SecurityAlert,
    CameraStatus, VisitorTracking
)
from ..models import Visitor, PreRegistration


class GateAccessLogSerializer(serializers.ModelSerializer):
    """Serializer for gate access logs."""
    visitor_name = serializers.CharField(source='related_visitor.name', read_only=True)
    pre_reg_name = serializers.CharField(source='related_pre_registration.visitor_name', read_only=True)
    
    class Meta:
        model = GateAccessLog
        fields = [
            'id', 'plate_number', 'access_type', 'access_granted',
            'visitor_name', 'pre_reg_name', 'confidence_score',
            'detected_at', 'processed_at', 'metadata'
        ]
        read_only_fields = ['id', 'detected_at', 'processed_at']


class SecurityIncidentSerializer(serializers.ModelSerializer):
    """Serializer for security incidents."""
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = SecurityIncident
        fields = [
            'id', 'title', 'description', 'incident_type', 'severity',
            'status', 'location_name', 'detected_at', 'resolved_at',
            'assigned_to', 'assigned_to_name', 'resolution_notes',
            'evidence_images', 'evidence_videos', 'metadata'
        ]
        read_only_fields = ['id', 'detected_at', 'resolved_at']


class SecurityAlertSerializer(serializers.ModelSerializer):
    """Serializer for security alerts."""
    incident_title = serializers.CharField(source='related_incident.title', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.username', read_only=True)
    
    class Meta:
        model = SecurityAlert
        fields = [
            'id', 'alert_type', 'message', 'severity',
            'is_active', 'acknowledged', 'acknowledged_by',
            'acknowledged_by_name', 'acknowledged_at',
            'related_incident', 'incident_title',
            'created_at', 'expires_at', 'metadata'
        ]
        read_only_fields = ['id', 'created_at']


class CameraStatusSerializer(serializers.ModelSerializer):
    """Serializer for camera status."""
    location_name = serializers.CharField(source='location.name', read_only=True)
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = CameraStatus
        fields = [
            'id', 'name', 'location', 'location_name', 'rtsp_url',
            'camera_type', 'status', 'last_seen', 'uptime_percentage',
            'is_monitoring', 'monitoring_started_at',
            'total_detections', 'successful_reads', 'failed_reads',
            'success_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_success_rate(self, obj):
        """Calculate success rate of plate reads."""
        total = obj.total_detections
        if total == 0:
            return 0.0
        return round((obj.successful_reads / total) * 100, 1)


class VisitorTrackingSerializer(serializers.ModelSerializer):
    """Serializer for visitor tracking."""
    visitor_name = serializers.CharField(source='visitor.name', read_only=True)
    visitor_company = serializers.CharField(source='visitor.company', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = VisitorTracking
        fields = [
            'id', 'visitor', 'visitor_name', 'visitor_company',
            'tracking_type', 'location', 'location_name', 'zone',
            'x_coordinate', 'y_coordinate', 'tracking_method',
            'device_id', 'timestamp', 'metadata'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityDashboardSerializer(serializers.Serializer):
    """Serializer for security dashboard data."""
    time_range = serializers.CharField()
    summary = serializers.DictField()
    incidents = serializers.DictField()
    alerts = serializers.DictField()
    cameras = serializers.DictField()
    threat_indicators = serializers.DictField()
    recent_activity = serializers.DictField()


class LiveCameraFrameSerializer(serializers.Serializer):
    """Serializer for live camera frame data."""
    camera_id = serializers.UUIDField()
    camera_name = serializers.CharField()
    status = serializers.CharField()
    frame = serializers.CharField()  # Base64 encoded image
    timestamp = serializers.DateTimeField()


class GateControlSerializer(serializers.Serializer):
    """Serializer for gate control commands."""
    action = serializers.ChoiceField(choices=['open', 'close', 'lock'])
    camera_id = serializers.UUIDField(required=False)
    reason = serializers.CharField(required=False, default='Manual control')
    user_id = serializers.IntegerField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)


class SecurityIncidentCreateSerializer(serializers.Serializer):
    """Serializer for creating security incidents."""
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    incident_type = serializers.ChoiceField(choices=SecurityIncident.INCIDENT_TYPES)
    severity = serializers.ChoiceField(choices=SecurityIncident.SEVERITY_LEVELS)
    assign_to_me = serializers.BooleanField(default=False)
    location_id = serializers.UUIDField(required=False)
    evidence_images = serializers.ListField(child=serializers.URLField(), required=False)
    evidence_videos = serializers.ListField(child=serializers.URLField(), required=False)
