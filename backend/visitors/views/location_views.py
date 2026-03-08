from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from ..models import Location, Kiosk
from ..serializers import LocationSerializer, KioskSerializer
from ..utils import get_user_tenant


class LocationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing locations."""
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter locations by user's tenant."""
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return Location.objects.none()
        return Location.objects.filter(tenant=tenant)


class KioskViewSet(viewsets.ModelViewSet):
    """ViewSet for managing kiosks."""
    queryset = Kiosk.objects.all()
    serializer_class = KioskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Kiosk.objects.all()

        location_id = self.request.query_params.get('location')
        if location_id:
            queryset = queryset.filter(location_id=location_id)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset
