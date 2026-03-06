"""
Push notification service for real-time security alerts.
Supports Firebase Cloud Messaging (FCM) and web push notifications.
"""

import logging
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for sending push notifications for security alerts."""
    
    def __init__(self):
        self.fcm_server_key = getattr(settings, 'FCM_SERVER_KEY', None)
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
        
    def send_security_alert(self, 
                           title: str,
                           message: str,
                           severity: str,
                           user_tokens: List[str],
                           data: Optional[Dict] = None) -> bool:
        """
        Send security alert push notification.
        
        Args:
            title: Alert title
            message: Alert message
            severity: Alert severity (LOW, MEDIUM, HIGH, CRITICAL)
            user_tokens: List of FCM device tokens
            data: Additional data payload
            
        Returns:
            True if successful, False otherwise
        """
        if not self.fcm_server_key:
            logger.warning("FCM server key not configured")
            return False
            
        if not user_tokens:
            logger.warning("No device tokens provided")
            return False
            
        # Prepare notification payload
        notification_data = {
            "title": title,
            "body": message,
            "sound": self._get_sound_for_severity(severity),
            "badge": "1",
            "icon": "security_alert",
            "click_action": "SECURITY_ALERT"
        }
        
        # Additional data for the app
        payload_data = {
            "type": "security_alert",
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **(data or {})
        }
        
        # Send to all tokens
        success = 0
        failed = 0
        
        for token in user_tokens:
            try:
                response = self._send_fcm_notification(
                    token=token,
                    notification=notification_data,
                    data=payload_data
                )
                
                if response.get('success'):
                    success += 1
                else:
                    failed += 1
                    logger.error(f"Failed to send notification to {token}: {response}")
                    
            except Exception as e:
                failed += 1
                logger.error(f"Error sending notification to {token}: {e}")
                
        logger.info(f"Push notification sent: {success} success, {failed} failed")
        return success > 0
        
    def send_gate_access_notification(self,
                                   plate_number: str,
                                   access_granted: bool,
                                   access_type: str,
                                   user_tokens: List[str]) -> bool:
        """
        Send gate access notification.
        
        Args:
            plate_number: Vehicle plate number
            access_granted: Whether access was granted
            access_type: Type of access
            user_tokens: List of FCM device tokens
            
        Returns:
            True if successful, False otherwise
        """
        if access_granted:
            title = "✅ Gate Access Granted"
            message = f"Vehicle {plate_number} granted {access_type} access"
            severity = "LOW"
        else:
            title = "🚫 Gate Access Denied"
            message = f"Vehicle {plate_number} denied access"
            severity = "MEDIUM"
            
        data = {
            "plate_number": plate_number,
            "access_granted": access_granted,
            "access_type": access_type
        }
        
        return self.send_security_alert(title, message, severity, user_tokens, data)
        
    def send_camera_offline_notification(self,
                                       camera_name: str,
                                       user_tokens: List[str]) -> bool:
        """
        Send camera offline notification.
        
        Args:
            camera_name: Name of offline camera
            user_tokens: List of FCM device tokens
            
        Returns:
            True if successful, False otherwise
        """
        title = "📷 Camera Offline"
        message = f"Camera '{camera_name}' is offline"
        severity = "HIGH"
        
        data = {
            "camera_name": camera_name,
            "alert_type": "camera_offline"
        }
        
        return self.send_security_alert(title, message, severity, user_tokens, data)
        
    def send_system_anomaly_notification(self,
                                      anomaly_type: str,
                                      description: str,
                                      user_tokens: List[str]) -> bool:
        """
        Send system anomaly notification.
        
        Args:
            anomaly_type: Type of anomaly
            description: Description of anomaly
            user_tokens: List of FCM device tokens
            
        Returns:
            True if successful, False otherwise
        """
        title = "⚠️ System Anomaly Detected"
        message = f"{anomaly_type}: {description}"
        severity = "HIGH"
        
        data = {
            "anomaly_type": anomaly_type,
            "description": description,
            "alert_type": "system_anomaly"
        }
        
        return self.send_security_alert(title, message, severity, user_tokens, data)
        
    def _send_fcm_notification(self,
                             token: str,
                             notification: Dict,
                             data: Dict) -> Dict:
        """
        Send notification via Firebase Cloud Messaging.
        
        Args:
            token: Device token
            notification: Notification payload
            data: Data payload
            
        Returns:
            Response from FCM
        """
        headers = {
            "Authorization": f"key={self.fcm_server_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "to": token,
            "notification": notification,
            "data": data,
            "priority": "high",
            "time_to_live": 3600  # 1 hour
        }
        
        try:
            response = requests.post(
                self.fcm_url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"FCM request failed: {e}")
            return {"success": False, "error": str(e)}
            
    def _get_sound_for_severity(self, severity: str) -> str:
        """Get notification sound based on severity."""
        sound_map = {
            "LOW": "default",
            "MEDIUM": "alert",
            "HIGH": "alarm",
            "CRITICAL": "emergency"
        }
        return sound_map.get(severity, "default")
        
    def validate_fcm_token(self, token: str) -> bool:
        """
        Validate FCM token format.
        
        Args:
            token: FCM device token
            
        Returns:
            True if valid format, False otherwise
        """
        # Basic validation - FCM tokens are typically 100-200 characters
        if not token or not isinstance(token, str):
            return False
            
        if len(token) < 50 or len(token) > 300:
            return False
            
        # FCM tokens should not contain spaces
        if ' ' in token:
            return False
            
        return True
        
    def batch_send_notifications(self,
                               notifications: List[Dict],
                               max_batch_size: int = 500) -> Dict:
        """
        Send multiple notifications in batches.
        
        Args:
            notifications: List of notification dictionaries
            max_batch_size: Maximum batch size per request
            
        Returns:
            Summary of results
        """
        results = {
            "total": len(notifications),
            "success": 0,
            "failed": 0,
            "errors": []
        }
        
        for i in range(0, len(notifications), max_batch_size):
            batch = notifications[i:i + max_batch_size]
            
            for notification in batch:
                try:
                    success = self.send_security_alert(
                        title=notification.get("title"),
                        message=notification.get("message"),
                        severity=notification.get("severity", "LOW"),
                        user_tokens=notification.get("tokens", []),
                        data=notification.get("data")
                    )
                    
                    if success:
                        results["success"] += 1
                    else:
                        results["failed"] += 1
                        
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append(str(e))
                    
        return results


# Singleton instance
push_service = PushNotificationService()
