from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from ..models import Visitor, Host
from ..serializers import VisitorSerializer, VisitorCreateSerializer, HostSerializer
from ..services.notifications import NotificationService
from ..permissions import IsSuperAdmin, IsLocationAdmin, IsHost


class HostViewSet(viewsets.ModelViewSet):
    """ViewSet for managing hosts."""
    queryset = Host.objects.all()
    serializer_class = HostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Host.objects.filter(is_active=True)
        
        # Super Admin sees all
        if user.profile.role == 'SUPER_ADMIN':
            pass
        # Admin sees hosts in their location
        elif user.profile.role == 'ADMIN':
            queryset = queryset.filter(location=user.profile.location)
        # Standard hosts/others can only see hosts in their location (for directory purposes)
        else:
            queryset = queryset.filter(location=user.profile.location)

        location_id = self.request.query_params.get('location')
        if location_id:
            queryset = queryset.filter(location_id=location_id)
        return queryset


class VisitorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing visitors."""
    queryset = Visitor.objects.all().order_by('-checkin_time')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return VisitorCreateSerializer
        return VisitorSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Visitor.objects.all().order_by('-checkin_time')

        # RBAC Filtering
        if not user.is_staff: # If standard user via API
             profile = getattr(user, 'profile', None)
             if profile:
                 if profile.role == 'SUPER_ADMIN':
                     pass
                 elif profile.role == 'ADMIN':
                     queryset = queryset.filter(location=profile.location)
                 elif profile.role == 'HOST':
                     # Hosts only see their own visitors
                     # But wait, dashboard might need to see more? Only their own.
                     # However, a receptionist (if role existed) would see all.
                     # For now, Host sees their own visitors.
                     if hasattr(user, 'host_profile'):
                         queryset = queryset.filter(host=user.host_profile)
                     else:
                         return Visitor.objects.none()

        status_filter = self.request.query_params.get('status')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by location
        location_id = self.request.query_params.get('location')
        if location_id:
            queryset = queryset.filter(location_id=location_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(checkin_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(checkin_time__date__lte=end_date)

        # Filter by host
        host_id = self.request.query_params.get('host')
        if host_id:
            queryset = queryset.filter(host_id=host_id)

        return queryset

    def perform_create(self, serializer):
        # Check against Watchlist
        from django.db.models import Q
        from ..models import WatchlistEntry

        name = serializer.validated_data.get('name')
        email = serializer.validated_data.get('email')
        phone = serializer.validated_data.get('phone')
        location = serializer.validated_data.get('location')

        # Find matches
        matches = WatchlistEntry.objects.filter(is_active=True).filter(
            Q(email__iexact=email) | Q(phone=phone) | Q(name__iexact=name)
        )
        
        # Filter by location scope (Global or Specific)
        # If entry.location is None, it applies everywhere.
        # If entry.location is set, it only applies there.
        active_match = None
        for match in matches:
            if match.location is None or match.location == location:
                active_match = match
                break
        
        status_val = 'CHECKED_IN'
        reject_reason = ""
        
        if active_match:
            status_val = 'REJECTED'
            reject_reason = f"Watchlist Match: {active_match.reason}"
        elif location and location.require_visitor_approval:
            status_val = 'PENDING'
            
        visitor = serializer.save(status=status_val)

        # Handle Watchlist Rejection
        if status_val == 'REJECTED':
             # Notify Admin?
             # For now, just stop.
             print(f"Visitor {visitor.id} blocked by watchlist: {reject_reason}")
             return

        # Send notification to host
        try:
            if status_val == 'PENDING':
                NotificationService.notify_host_approval_required(visitor)
            else:
                NotificationService.notify_host_of_arrival(visitor)
        except Exception as e:
            print(f"Failed to send notification: {e}")

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check out a visitor."""
        visitor = self.get_object()
        if visitor.status == 'CHECKED_OUT':
            return Response(
                {'error': 'Visitor already checked out'},
                status=status.HTTP_400_BAD_REQUEST
            )

        visitor.status = 'CHECKED_OUT'
        visitor.checkout_time = timezone.now()
        visitor.save()

        # Send checkout notification
        try:
            NotificationService.send_checkout_notification(visitor)
        except Exception as e:
            print(f"Failed to send checkout notification: {e}")

        serializer = VisitorSerializer(visitor)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all currently checked-in visitors."""
        queryset = self.get_queryset().filter(status='CHECKED_IN')
        serializer = VisitorSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all visitors for today."""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(checkin_time__date=today)
        serializer = VisitorSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending visitor."""
        visitor = self.get_object()
        if visitor.status != 'PENDING':
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)
            
        visitor.status = 'CHECKED_IN'
        visitor.save()
        
        # Notify host (confirmation) and potentially visitor
        NotificationService.notify_host_of_arrival(visitor)
        
        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending visitor."""
        visitor = self.get_object()
        if visitor.status != 'PENDING':
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)
            
        visitor.status = 'REJECTED'
        visitor.save()
        
        return Response(VisitorSerializer(visitor).data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for a returning visitor by email or phone."""
        query = request.query_params.get('query')
        if not query or len(query) < 3:
             return Response({'error': 'Query parameter must be at least 3 characters'}, status=status.HTTP_400_BAD_REQUEST)
        
        from django.db.models import Q
        # unique matches only, getting the most recent one
        visitor = Visitor.objects.filter(
            Q(email__iexact=query) | Q(phone__iexact=query)
        ).order_by('-checkin_time').first()
        
        if not visitor:
             return Response({'detail': 'No visitor found'}, status=status.HTTP_404_NOT_FOUND)
             
        from ..serializers import VisitorSearchSerializer
        return Response(VisitorSearchSerializer(visitor).data)



from ..models import WatchlistEntry
from ..serializers import WatchlistSerializer

class WatchlistViewSet(viewsets.ModelViewSet):
    queryset = WatchlistEntry.objects.all().order_by('-created_at')
    serializer_class = WatchlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if not user.is_staff:
             profile = getattr(user, 'profile', None)
             if not profile or profile.role == 'HOST':
                 return WatchlistEntry.objects.none() # Hosts cannot see watchlist
             if profile.role == 'ADMIN':
                 queryset = queryset.filter(location=profile.location)
        return queryset

