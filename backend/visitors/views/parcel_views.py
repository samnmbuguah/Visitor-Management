from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from ..models import Parcel, UserRole
from ..serializers.parcel_serializers import ParcelSerializer, ParcelCreateSerializer, ParcelCollectionSerializer

class ParcelViewSet(viewsets.ModelViewSet):
    queryset = Parcel.objects.all().order_by('-received_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ParcelCreateSerializer
        if self.action == 'collect':
            return ParcelCollectionSerializer
        return ParcelSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Parcel.objects.none()
        
        queryset = Parcel.objects.all().order_by('-received_at')
        
        # Super Admin sees all
        if user.profile.role == UserRole.SUPER_ADMIN:
            pass
        # Admin sees parcels in their location
        elif user.profile.role == UserRole.ADMIN:
            queryset = queryset.filter(location=user.profile.location)
        # Hosts only see their own parcels
        elif user.profile.role == UserRole.HOST:
            if hasattr(user, 'host_profile'):
                queryset = queryset.filter(recipient=user.host_profile)
            else:
                return Parcel.objects.none()
        
        return queryset

    @action(detail=True, methods=['post'])
    def collect(self, request, pk=None):
        """Mark a parcel as collected with a signature."""
        parcel = self.get_object()
        if parcel.status == 'COLLECTED':
            return Response({'error': 'Parcel already collected'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ParcelCollectionSerializer(parcel, data=request.data)
        if serializer.is_valid():
            parcel.status = 'COLLECTED'
            parcel.collected_at = timezone.now()
            parcel.collection_signature = serializer.validated_data.get('collection_signature')
            parcel.save()
            return Response(ParcelSerializer(parcel).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def notify(self, request, pk=None):
        """Manually trigger a notification to the recipient."""
        parcel = self.get_object()
        # In a real app, this would trigger an email/SMS
        # For now, we'll just update status to NOTIFIED
        parcel.status = 'NOTIFIED'
        parcel.save()
        return Response({'status': 'Notification sent', 'parcel_status': parcel.status})
