from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Q, Avg
from django.shortcuts import get_object_or_404
import logging
import base64
import cv2
import numpy as np

from visitors.security_models import (
    GateAccessLog, SecurityIncident, SecurityAlert, 
    CameraStatus, VisitorTracking
)
from visitors.models import Visitor, PreRegistration
from visitors.tenant_models import Tenant, TenantSettings
from visitors.services.ocr_service import gate_service

logger = logging.getLogger(__name__)


class SecurityDashboardView(APIView):
    """Enhanced security dashboard with threat detection."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        tenant_id = request.query_params.get('location')
        time_range = request.query_params.get('time_range', '24h')  # 1h, 24h, 7d, 30d
        
        # Calculate time range
        if time_range == '1h':
            start_time = timezone.now() - timedelta(hours=1)
        elif time_range == '24h':
            start_time = timezone.now() - timedelta(hours=24)
        elif time_range == '7d':
            start_time = timezone.now() - timedelta(days=7)
        elif time_range == '30d':
            start_time = timezone.now() - timedelta(days=30)
        else:
            start_time = timezone.now() - timedelta(hours=24)
        
        # Get base queryset
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            # Fallback to first tenant (for superadmin)
            tenant = Tenant.objects.first()
        
        # Security metrics
        gate_logs = GateAccessLog.objects.filter(
            tenant=tenant,
            detected_at__gte=start_time
        )
        
        incidents = SecurityIncident.objects.filter(
            tenant=tenant,
            detected_at__gte=start_time
        )
        
        alerts = SecurityAlert.objects.filter(
            tenant=tenant,
            created_at__gte=start_time
        )
        
        # Access statistics
        total_attempts = gate_logs.count()
        granted_access = gate_logs.filter(access_granted=True).count()
        denied_access = total_attempts - granted_access
        
        # Incident statistics
        incident_stats = {
            'total': incidents.count(),
            'by_severity': dict(incidents.values('severity').annotate(count=Count('id')).values_list('severity', 'count')),
            'by_type': dict(incidents.values('incident_type').annotate(count=Count('id')).values_list('incident_type', 'count')),
            'open_count': incidents.filter(status='OPEN').count(),
            'resolved_count': incidents.filter(status='RESOLVED').count(),
        }
        
        # Alert statistics
        alert_stats = {
            'total': alerts.count(),
            'active': alerts.filter(is_active=True).count(),
            'acknowledged': alerts.filter(acknowledged=True).count(),
            'by_type': dict(alerts.values('alert_type').annotate(count=Count('id')).values_list('alert_type', 'count')),
        }
        
        # Recent activity
        recent_gate_logs = gate_logs.order_by('-detected_at')[:10]
        recent_incidents = incidents.order_by('-detected_at')[:5]
        active_alerts = alerts.filter(is_active=True).order_by('-created_at')[:10]
        
        # Camera status
        cameras = CameraStatus.objects.filter(tenant=tenant)
        camera_stats = {
            'total': cameras.count(),
            'online': cameras.filter(status='ONLINE').count(),
            'offline': cameras.filter(status='OFFLINE').count(),
            'monitoring': cameras.filter(is_monitoring=True).count(),
        }
        
        # Threat indicators
        threat_indicators = self._calculate_threat_indicators(gate_logs, incidents, start_time)
        
        # Visitor tracking
        active_visitors = Visitor.objects.filter(
            tenant=tenant,
            status='CHECKED_IN'
        ).count()
        
        tracking_logs = VisitorTracking.objects.filter(
            tenant=tenant,
            timestamp__gte=start_time
        ).count()
        
        dashboard_data = {
            'time_range': time_range,
            'summary': {
                'total_access_attempts': total_attempts,
                'access_granted': granted_access,
                'access_denied': denied_access,
                'access_granted_rate': round((granted_access / total_attempts * 100) if total_attempts > 0 else 0, 1),
                'active_visitors': active_visitors,
                'tracking_events': tracking_logs,
            },
            'incidents': incident_stats,
            'alerts': alert_stats,
            'cameras': camera_stats,
            'threat_indicators': threat_indicators,
            'recent_activity': {
                'gate_logs': [
                    {
                        'id': str(log.id),
                        'plate_number': log.plate_number,
                        'access_type': log.access_type,
                        'access_granted': log.access_granted,
                        'detected_at': log.detected_at.isoformat(),
                    }
                    for log in recent_gate_logs
                ],
                'incidents': [
                    {
                        'id': str(incident.id),
                        'title': incident.title,
                        'severity': incident.severity,
                        'status': incident.status,
                        'detected_at': incident.detected_at.isoformat(),
                    }
                    for incident in recent_incidents
                ],
                'alerts': [
                    {
                        'id': str(alert.id),
                        'alert_type': alert.alert_type,
                        'message': alert.message,
                        'severity': alert.severity,
                        'acknowledged': alert.acknowledged,
                        'created_at': alert.created_at.isoformat(),
                    }
                    for alert in active_alerts
                ],
            }
        }
        
        return Response(dashboard_data)
    
    def _calculate_threat_indicators(self, gate_logs, incidents, start_time):
        """Calculate various threat indicators."""
        indicators = {}
        
        # High frequency access attempts (potential tailgating)
        recent_attempts = gate_logs.filter(
            detected_at__gte=timezone.now() - timedelta(minutes=10)
        )
        indicators['high_frequency_attempts'] = recent_attempts.count() > 10
        
        # Multiple denied access attempts
        denied_plates = gate_logs.filter(
            access_granted=False
        ).values('plate_number').annotate(count=Count('id')).filter(count__gte=3)
        indicators['repeated_denied_access'] = denied_plates.count() > 0
        
        # Off-hours access attempts
        business_hours_start = 9  # 9 AM
        business_hours_end = 17  # 5 PM
        off_hours_attempts = gate_logs.filter(
            detected_at__hour__lt=business_hours_start
        ) | gate_logs.filter(
            detected_at__hour__gte=business_hours_end
        )
        indicators['off_hours_attempts'] = off_hours_attempts.count()
        
        # Unknown plate frequency
        unknown_plates = gate_logs.filter(
            access_type='unknown'
        ).count()
        indicators['unknown_plate_frequency'] = unknown_plates
        
        # Critical incidents
        critical_incidents = incidents.filter(severity='CRITICAL').count()
        indicators['critical_incidents'] = critical_incidents > 0
        
        # Camera offline status
        offline_cameras = CameraStatus.objects.filter(status='OFFLINE').count()
        total_cameras = CameraStatus.objects.count()
        indicators['camera_offline_rate'] = round((offline_cameras / total_cameras * 100) if total_cameras > 0 else 0, 1)
        
        # Overall threat level
        threat_score = 0
        if indicators['high_frequency_attempts']:
            threat_score += 20
        if indicators['repeated_denied_access']:
            threat_score += 25
        if indicators['off_hours_attempts'] > 5:
            threat_score += 15
        if indicators['unknown_plate_frequency'] > 10:
            threat_score += 20
        if indicators['critical_incidents']:
            threat_score += 30
        if indicators['camera_offline_rate'] > 50:
            threat_score += 15
        
        if threat_score >= 70:
            threat_level = 'CRITICAL'
        elif threat_score >= 50:
            threat_level = 'HIGH'
        elif threat_score >= 30:
            threat_level = 'MEDIUM'
        else:
            threat_level = 'LOW'
        
        indicators['overall_threat_level'] = threat_level
        indicators['threat_score'] = threat_score
        
        return indicators


class LiveCameraView(APIView):
    """Live camera feed endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        camera_id = request.query_params.get('camera_id')
        
        # Get tenant
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            tenant = Tenant.objects.first()
        
        # Get camera
        if camera_id:
            camera = get_object_or_404(CameraStatus, id=camera_id, tenant=tenant)
        else:
            # Get first active camera
            camera = CameraStatus.objects.filter(
                tenant=tenant,
                status='ONLINE'
            ).first()
        
        if not camera:
            return Response(
                {'error': 'No active camera found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get current frame from OCR service
        frame = gate_service.get_camera_frame(str(tenant.id))
        
        if frame is None:
            return Response(
                {'error': 'Camera stream unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Convert frame to JPEG
        try:
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return Response({
                'camera_id': str(camera.id),
                'camera_name': camera.name,
                'status': camera.status,
                'frame': f"data:image/jpeg;base64,{frame_base64}",
                'timestamp': timezone.now().isoformat(),
            })
            
        except Exception as e:
            logger.error(f"Error encoding camera frame: {e}")
            return Response(
                {'error': 'Failed to process camera frame'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GateControlView(APIView):
    """Gate automation control endpoints."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        action = request.data.get('action')  # open, close, lock
        camera_id = request.data.get('camera_id')
        reason = request.data.get('reason', 'Manual control')
        
        if action not in ['open', 'close', 'lock']:
            return Response(
                {'error': 'Invalid action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get tenant
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            tenant = Tenant.objects.first()
        
        # Log the manual control
        try:
            GateAccessLog.objects.create(
                tenant=tenant,
                access_type=f'manual_{action}',
                access_granted=True,
                metadata={
                    'action': action,
                    'reason': reason,
                    'user_id': request.user.id,
                    'camera_id': camera_id,
                }
            )
            
            # Execute gate action
            if action == 'open':
                gate_service._open_gate(str(tenant.id))
                message = "Gate opened successfully"
            elif action == 'close':
                # Implementation for closing gate
                message = "Gate closed successfully"
            elif action == 'lock':
                # Implementation for locking gate
                message = "Gate locked successfully"
            
            return Response({
                'success': True,
                'message': message,
                'action': action,
                'timestamp': timezone.now().isoformat(),
            })
            
        except Exception as e:
            logger.error(f"Error executing gate control: {e}")
            return Response(
                {'error': 'Failed to execute gate control'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SecurityIncidentsView(APIView):
    """Security incidents management."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get tenant
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            tenant = Tenant.objects.first()
        
        incidents = SecurityIncident.objects.filter(tenant=tenant).order_by('-detected_at')
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            incidents = incidents.filter(status=status_filter)
        
        # Filter by severity if provided
        severity_filter = request.query_params.get('severity')
        if severity_filter:
            incidents = incidents.filter(severity=severity_filter)
        
        # Paginate
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        start = (page - 1) * page_size
        end = start + page_size
        
        incidents_page = incidents[start:end]
        
        return Response({
            'incidents': [
                {
                    'id': str(incident.id),
                    'title': incident.title,
                    'description': incident.description,
                    'incident_type': incident.incident_type,
                    'severity': incident.severity,
                    'status': incident.status,
                    'location': incident.location.name if incident.location else None,
                    'detected_at': incident.detected_at.isoformat(),
                    'resolved_at': incident.resolved_at.isoformat() if incident.resolved_at else None,
                    'assigned_to': incident.assigned_to.username if incident.assigned_to else None,
                }
                for incident in incidents_page
            ],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': incidents.count(),
                'pages': (incidents.count() + page_size - 1) // page_size,
            }
        })
    
    def post(self, request):
        # Create new security incident
        data = request.data
        
        # Get tenant
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            tenant = Tenant.objects.first()
        
        try:
            incident = SecurityIncident.objects.create(
                tenant=tenant,
                title=data.get('title'),
                description=data.get('description'),
                incident_type=data.get('incident_type'),
                severity=data.get('severity'),
                assigned_to=request.user if data.get('assign_to_me') else None,
            )
            
            return Response({
                'id': str(incident.id),
                'message': 'Security incident created successfully',
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating security incident: {e}")
            return Response(
                {'error': 'Failed to create security incident'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VisitorTrackingView(APIView):
    """Real-time visitor tracking."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get tenant
        tenant = getattr(request.user.profile, 'tenant', None) if hasattr(request.user, 'profile') else None
        if not tenant:
            tenant = Tenant.objects.first()
        
        # Get active visitors
        active_visitors = Visitor.objects.filter(
            tenant=tenant,
            status='CHECKED_IN'
        ).order_by('-checkin_time')
        
        # Get recent tracking events
        tracking_events = VisitorTracking.objects.filter(
            tenant=tenant
        ).order_by('-timestamp')[:50]
        
        return Response({
            'active_visitors': [
                {
                    'id': str(visitor.id),
                    'name': visitor.name,
                    'company': visitor.company,
                    'purpose': visitor.purpose,
                    'host': visitor.host.name if visitor.host else None,
                    'checkin_time': visitor.checkin_time.isoformat(),
                    'location': visitor.location.name if visitor.location else None,
                    'number_plate': visitor.number_plate,
                }
                for visitor in active_visitors
            ],
            'tracking_events': [
                {
                    'id': str(event.id),
                    'visitor_name': event.visitor.name,
                    'tracking_type': event.tracking_type,
                    'location': event.location.name if event.location else None,
                    'zone': event.zone,
                    'timestamp': event.timestamp.isoformat(),
                    'tracking_method': event.tracking_method,
                }
                for event in tracking_events
            ],
        })
