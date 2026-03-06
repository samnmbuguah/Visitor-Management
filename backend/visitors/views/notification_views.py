"""
API views for managing push notifications and device tokens.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
import logging

from visitors.notification_models import DeviceToken, NotificationLog, NotificationPreference
from visitors.services.push_service import push_service
from visitors.tenant_models import Tenant

logger = logging.getLogger(__name__)


class RegisterDeviceTokenView(APIView):
    """Register a new device token for push notifications."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Register device token."""
        data = request.data
        
        # Validate token
        token = data.get('token')
        if not token:
            return Response(
                {'error': 'Device token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not push_service.validate_fcm_token(token):
            return Response(
                {'error': 'Invalid device token format'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if token already exists for this user
        existing_token = DeviceToken.objects.filter(
            user=request.user,
            token=token
        ).first()
        
        if existing_token:
            # Update existing token
            existing_token.device_name = data.get('device_name', existing_token.device_name)
            existing_token.device_model = data.get('device_model', existing_token.device_model)
            existing_token.app_version = data.get('app_version', existing_token.app_version)
            existing_token.os_version = data.get('os_version', existing_token.os_version)
            existing_token.is_active = True
            existing_token.enabled = True
            existing_token.update_last_used()
            existing_token.save()
            
            return Response({
                'message': 'Token updated successfully',
                'token_id': str(existing_token.id)
            })
            
        # Create new token
        device_token = DeviceToken.objects.create(
            user=request.user,
            token=token,
            token_type=data.get('token_type', 'fcm'),
            device_name=data.get('device_name', 'Unknown Device'),
            device_model=data.get('device_model', ''),
            app_version=data.get('app_version', ''),
            os_version=data.get('os_version', ''),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': 'Token registered successfully',
            'token_id': str(device_token.id)
        }, status=status.HTTP_201_CREATED)


class UnregisterDeviceTokenView(APIView):
    """Unregister/disable a device token."""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, token_id):
        """Unregister device token."""
        try:
            device_token = DeviceToken.objects.get(
                id=token_id,
                user=request.user
            )
            device_token.disable()
            
            return Response({'message': 'Token unregistered successfully'})
            
        except DeviceToken.DoesNotExist:
            return Response(
                {'error': 'Token not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ListDeviceTokensView(APIView):
    """List all device tokens for the current user."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of device tokens."""
        tokens = DeviceToken.objects.filter(
            user=request.user,
            is_active=True
        ).order_by('-created_at')
        
        token_data = []
        for token in tokens:
            token_data.append({
                'id': str(token.id),
                'device_name': token.device_name,
                'device_model': token.device_model,
                'token_type': token.token_type,
                'app_version': token.app_version,
                'os_version': token.os_version,
                'enabled': token.enabled,
                'security_alerts': token.security_alerts,
                'gate_access': token.gate_access,
                'camera_offline': token.camera_offline,
                'system_anomalies': token.system_anomalies,
                'created_at': token.created_at.isoformat(),
                'last_used_at': token.last_used_at.isoformat() if token.last_used_at else None
            })
            
        return Response({
            'tokens': token_data,
            'total': len(token_data)
        })


class UpdateNotificationPreferencesView(APIView):
    """Update notification preferences."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current notification preferences."""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        
        return Response({
            'push_enabled': preferences.push_enabled,
            'email_enabled': preferences.email_enabled,
            'sms_enabled': preferences.sms_enabled,
            'quiet_hours_enabled': preferences.quiet_hours_enabled,
            'quiet_hours_start': preferences.quiet_hours_start.strftime('%H:%M') if preferences.quiet_hours_start else None,
            'quiet_hours_end': preferences.quiet_hours_end.strftime('%H:%M') if preferences.quiet_hours_end else None,
            'security_alerts_enabled': preferences.security_alerts_enabled,
            'gate_access_enabled': preferences.gate_access_enabled,
            'camera_offline_enabled': preferences.camera_offline_enabled,
            'system_anomalies_enabled': preferences.system_anomalies_enabled,
            'low_severity_enabled': preferences.low_severity_enabled,
            'medium_severity_enabled': preferences.medium_severity_enabled,
            'high_severity_enabled': preferences.high_severity_enabled,
            'critical_severity_enabled': preferences.critical_severity_enabled,
            'max_notifications_per_hour': preferences.max_notifications_per_hour
        })
        
    def put(self, request):
        """Update notification preferences."""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        
        data = request.data
        
        # Update preferences
        preferences.push_enabled = data.get('push_enabled', preferences.push_enabled)
        preferences.email_enabled = data.get('email_enabled', preferences.email_enabled)
        preferences.sms_enabled = data.get('sms_enabled', preferences.sms_enabled)
        preferences.quiet_hours_enabled = data.get('quiet_hours_enabled', preferences.quiet_hours_enabled)
        
        # Handle quiet hours
        if data.get('quiet_hours_start'):
            from datetime import datetime
            preferences.quiet_hours_start = datetime.strptime(data['quiet_hours_start'], '%H:%M').time()
        else:
            preferences.quiet_hours_start = None
            
        if data.get('quiet_hours_end'):
            from datetime import datetime
            preferences.quiet_hours_end = datetime.strptime(data['quiet_hours_end'], '%H:%M').time()
        else:
            preferences.quiet_hours_end = None
            
        # Security preferences
        preferences.security_alerts_enabled = data.get('security_alerts_enabled', preferences.security_alerts_enabled)
        preferences.gate_access_enabled = data.get('gate_access_enabled', preferences.gate_access_enabled)
        preferences.camera_offline_enabled = data.get('camera_offline_enabled', preferences.camera_offline_enabled)
        preferences.system_anomalies_enabled = data.get('system_anomalies_enabled', preferences.system_anomalies_enabled)
        
        # Severity filters
        preferences.low_severity_enabled = data.get('low_severity_enabled', preferences.low_severity_enabled)
        preferences.medium_severity_enabled = data.get('medium_severity_enabled', preferences.medium_severity_enabled)
        preferences.high_severity_enabled = data.get('high_severity_enabled', preferences.high_severity_enabled)
        preferences.critical_severity_enabled = data.get('critical_severity_enabled', preferences.critical_severity_enabled)
        
        preferences.max_notifications_per_hour = data.get('max_notifications_per_hour', preferences.max_notifications_per_hour)
        
        preferences.save()
        
        return Response({'message': 'Preferences updated successfully'})


class SendTestNotificationView(APIView):
    """Send a test push notification."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Send test notification."""
        # Get active tokens for user
        tokens = DeviceToken.objects.filter(
            user=request.user,
            is_active=True,
            enabled=True
        ).values_list('token', flat=True)
        
        if not tokens:
            return Response(
                {'error': 'No active device tokens found'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Send test notification
        try:
            success = push_service.send_security_alert(
                title="🧪 Test Notification",
                message="This is a test security notification",
                severity="LOW",
                user_tokens=list(tokens)
            )
        except Exception as e:
            # Log the error but continue to create notification log
            logger.warning(f"FCM send failed (expected in development): {e}")
            success = False
        
        # Log the test notification regardless of FCM success
        NotificationLog.objects.create(
            user=request.user,
            notification_type='test',
            title="Test Notification",
            message="This is a test security notification",
            severity='LOW',
            status='sent' if success else 'failed',
            sent_at=timezone.now() if success else None,
            error_message=None if success else "FCM not configured (development mode)"
        )
        
        if success:
            return Response({'message': 'Test notification sent successfully'})
        else:
            return Response({
                'message': 'Test notification logged (FCM not configured in development)',
                'note': 'In production, this would send a real push notification'
            })


class NotificationHistoryView(APIView):
    """Get notification history for the current user."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get notification history."""
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Filter by notification type if specified
        notification_type = request.query_params.get('type')
        
        query = Q(user=request.user)
        if notification_type:
            query &= Q(notification_type=notification_type)
            
        notifications = NotificationLog.objects.filter(query).order_by('-created_at')
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        notifications_page = notifications[start:end]
        
        notification_data = []
        for notification in notifications_page:
            notification_data.append({
                'id': str(notification.id),
                'notification_type': notification.notification_type,
                'title': notification.title,
                'message': notification.message,
                'severity': notification.severity,
                'status': notification.status,
                'created_at': notification.created_at.isoformat(),
                'sent_at': notification.sent_at.isoformat() if notification.sent_at else None,
                'delivered_at': notification.delivered_at.isoformat() if notification.delivered_at else None,
                'read_at': notification.read_at.isoformat() if notification.read_at else None,
                'error_message': notification.error_message
            })
            
        return Response({
            'notifications': notification_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': notifications.count(),
                'pages': (notifications.count() + page_size - 1) // page_size
            }
        })


class MarkNotificationReadView(APIView):
    """Mark a notification as read."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, notification_id):
        """Mark notification as read."""
        try:
            notification = NotificationLog.objects.get(
                id=notification_id,
                user=request.user
            )
            notification.mark_read()
            
            return Response({'message': 'Notification marked as read'})
            
        except NotificationLog.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationStatsView(APIView):
    """Get notification statistics for the current user."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get notification statistics."""
        # Get user's notifications
        notifications = NotificationLog.objects.filter(user=request.user)
        
        # Calculate stats
        total = notifications.count()
        sent = notifications.filter(status='sent').count()
        failed = notifications.filter(status='failed').count()
        read = notifications.filter(read_at__isnull=False).count()
        
        # By type
        by_type = {}
        for notification_type, _ in NotificationLog.NOTIFICATION_TYPES:
            count = notifications.filter(notification_type=notification_type).count()
            by_type[notification_type] = count
            
        # By severity
        by_severity = {}
        for severity, _ in NotificationLog._meta.get_field('severity').choices:
            count = notifications.filter(severity=severity).count()
            by_severity[severity] = count
            
        # Recent activity (last 24 hours)
        from datetime import timedelta
        recent = notifications.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        return Response({
            'total': total,
            'sent': sent,
            'failed': failed,
            'read': read,
            'unread': total - read,
            'delivery_rate': (sent / total * 100) if total > 0 else 0,
            'read_rate': (read / total * 100) if total > 0 else 0,
            'by_type': by_type,
            'by_severity': by_severity,
            'recent_24h': recent
        })
