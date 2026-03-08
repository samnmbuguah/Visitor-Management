from typing import Dict, Any, List
from django.core.exceptions import ValidationError
from ..models import Location, Host, VisitorType


class VisitorValidator:
    """Validator for visitor data following SRP."""
    
    @staticmethod
    def validate_visitor_data(data: Dict[str, Any]) -> List[str]:
        """Validate visitor data and return list of errors."""
        errors = []
        
        # Required fields validation
        required_fields = ['name', 'email']
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")
        
        # Email validation
        email = data.get('email')
        if email and '@' not in email:
            errors.append("Invalid email format")
        
        # Phone validation (basic)
        phone = data.get('phone')
        if phone and len(phone) < 10:
            errors.append("Phone number must be at least 10 digits")
        
        # Expected duration validation
        expected_duration = data.get('expected_duration')
        if expected_duration and (not isinstance(expected_duration, int) or expected_duration <= 0):
            errors.append("Expected duration must be a positive integer")
        
        return errors
    
    @staticmethod
    def validate_host_location_relationship(host_id: int, location_id: int) -> List[str]:
        """Validate that host belongs to the specified location."""
        errors = []
        
        try:
            host = Host.objects.get(id=host_id)
            if host.location_id != location_id:
                errors.append("Host does not belong to the specified location")
        except Host.DoesNotExist:
            errors.append("Host not found")
        
        return errors
    
    @staticmethod
    def validate_visitor_type(visitor_type_id: int) -> List[str]:
        """Validate visitor type exists and is active."""
        errors = []
        
        try:
            visitor_type = VisitorType.objects.get(id=visitor_type_id)
            if not visitor_type.is_active:
                errors.append("Visitor type is not active")
        except VisitorType.DoesNotExist:
            errors.append("Visitor type not found")
        
        return errors
    
    @staticmethod
    def validate_location_exists(location_id: int) -> List[str]:
        """Validate that location exists."""
        errors = []
        
        try:
            Location.objects.get(id=location_id)
        except Location.DoesNotExist:
            errors.append("Location not found")
        
        return errors
    
    @classmethod
    def validate_complete_visitor_data(cls, data: Dict[str, Any]) -> List[str]:
        """Validate complete visitor data including relationships."""
        errors = []
        
        # Basic validation
        errors.extend(cls.validate_visitor_data(data))
        
        # Relationship validation
        if 'host' in data and 'location' in data:
            errors.extend(cls.validate_host_location_relationship(
                data['host'], data['location']
            ))
        
        if 'location' in data:
            errors.extend(cls.validate_location_exists(data['location']))
        
        if 'visitor_type' in data and data['visitor_type']:
            errors.extend(cls.validate_visitor_type(data['visitor_type']))
        
        return errors
