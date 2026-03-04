from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from ..models import Location, Kiosk
from ..serializers import LocationSerializer, KioskSerializer


class LocationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing locations."""
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [AllowAny] # Allow Kiosk to see locations

    def get_queryset(self):
        queryset = Location.objects.all()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


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
