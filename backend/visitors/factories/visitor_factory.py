from typing import Dict, Any, Optional
from django.utils import timezone
from ..models import Visitor, Host, Location, VisitorType


class VisitorFactory:
    """Factory for creating visitors following Factory Pattern."""
    
    @staticmethod
    def create_from_pre_registration(pre_registration, host: Optional[Host] = None) -> Dict[str, Any]:
        """Create visitor data from pre-registration."""
        data = {
            'name': pre_registration.visitor_name,
            'email': pre_registration.visitor_email,
            'phone': pre_registration.visitor_phone,
            'company': pre_registration.visitor_company,
            'number_plate': pre_registration.visitor_number_plate,
            'purpose': pre_registration.purpose,
            'visitor_type': pre_registration.visitor_type,
            'expected_duration': pre_registration.expected_duration,
            'host': host or pre_registration.host,
            'location': pre_registration.location,
            'status': 'CHECKED_IN',  # Pre-registered visitors are checked in
            'checkin_time': timezone.now(),
            'pre_registration': pre_registration,
        }
        return data
    
    @staticmethod
    def create_manual_registration(data: Dict[str, Any], host: Host, location: Location) -> Dict[str, Any]:
        """Create visitor data for manual registration."""
        visitor_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data.get('phone', ''),
            'company': data.get('company', ''),
            'purpose': data.get('purpose', ''),
            'visitor_type': data.get('visitor_type'),
            'expected_duration': data.get('expected_duration'),
            'host': host,
            'location': location,
            'status': 'PENDING',  # Manual registrations require approval
            'checkin_time': timezone.now(),
        }
        return visitor_data
    
    @staticmethod
    def create_from_kiosk(data: Dict[str, Any], location: Location) -> Dict[str, Any]:
        """Create visitor data from kiosk check-in."""
        visitor_data = {
            'name': data['name'],
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'company': data.get('company', ''),
            'purpose': data.get('purpose', 'Kiosk Check-in'),
            'visitor_type': data.get('visitor_type'),
            'expected_duration': data.get('expected_duration'),
            'host': None,  # Kiosk check-ins may not have a host
            'location': location,
            'status': 'CHECKED_IN',  # Kiosk check-ins are immediate
            'checkin_time': timezone.now(),
        }
        return visitor_data
