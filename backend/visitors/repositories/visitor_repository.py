from typing import List, Optional, Dict, Any
from django.db.models import Q
from django.utils import timezone
from .base import BaseRepository
from ..models import Visitor


class VisitorRepository(BaseRepository):
    """Repository for Visitor operations following SRP."""
    
    def get_by_id(self, id: int) -> Optional[Visitor]:
        return Visitor.objects.filter(id=id).first()
    
    def get_all(self, filters: Dict[str, Any] = None) -> List[Visitor]:
        queryset = Visitor.objects.all().order_by('-checkin_time')
        
        if filters:
            if 'status' in filters:
                queryset = queryset.filter(status=filters['status'])
            if 'location' in filters:
                queryset = queryset.filter(location_id=filters['location'])
            if 'host' in filters:
                queryset = queryset.filter(host_id=filters['host'])
            if 'search' in filters:
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(email__icontains=search_term) | 
                    Q(phone__icontains=search_term) | 
                    Q(name__icontains=search_term)
                )
            if 'date' in filters:
                queryset = queryset.filter(checkin_time__date=filters['date'])
        
        return list(queryset)
    
    def create(self, data: Dict[str, Any]) -> Visitor:
        return Visitor.objects.create(**data)
    
    def update(self, id: int, data: Dict[str, Any]) -> Optional[Visitor]:
        visitor = self.get_by_id(id)
        if visitor:
            for key, value in data.items():
                setattr(visitor, key, value)
            visitor.save()
        return visitor
    
    def delete(self, id: int) -> bool:
        visitor = self.get_by_id(id)
        if visitor:
            visitor.delete()
            return True
        return False
    
    def get_active_visitors(self) -> List[Visitor]:
        """Get all currently checked-in visitors."""
        return list(Visitor.objects.filter(status='CHECKED_IN').order_by('-checkin_time'))
    
    def get_today_visitors(self) -> List[Visitor]:
        """Get all visitors for today."""
        today = timezone.now().date()
        return list(Visitor.objects.filter(checkin_time__date=today).order_by('-checkin_time'))
    
    def get_overdue_visitors(self, grace_minutes: int = 15) -> List[Visitor]:
        """Get visitors who have exceeded their expected duration."""
        from datetime import timedelta
        
        now = timezone.now()
        overdue_visitors = []
        
        visitors = Visitor.objects.filter(
            status='CHECKED_IN',
            expected_duration__isnull=False
        ).select_related('host', 'location')
        
        for visitor in visitors:
            expected_checkout = visitor.checkin_time + timedelta(minutes=visitor.expected_duration)
            if now > expected_checkout + timedelta(minutes=grace_minutes):
                overdue_visitors.append(visitor)
        
        return overdue_visitors
