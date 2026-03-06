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
    permission_classes = [AllowAny] # Allow visitors to see host list

    def get_queryset(self):
        user = self.request.user
        queryset = Host.objects.filter(is_active=True)
        
        # If user is logged in, apply RBAC
        if user.is_authenticated:
            # Super Admin sees all
            if user.profile.role == 'SUPER_ADMIN':
                pass
            # Admin sees hosts in their location
            elif user.profile.role == 'ADMIN':
                queryset = queryset.filter(location=user.profile.location)
            # Standard hosts/others can only see hosts in their location
            else:
                queryset = queryset.filter(location=user.profile.location)
        
        # Filter by location if provided in query params (useful for Kiosk)
        location_id = self.request.query_params.get('location')
        if location_id:
            queryset = queryset.filter(location_id=location_id)
            
        return queryset


class VisitorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing visitors."""
    queryset = Visitor.objects.all().order_by('-checkin_time')
    
    def get_permissions(self):
        if self.action in ['create', 'list', 'checkout', 'search', 'active']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return VisitorCreateSerializer
        return VisitorSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            # Allow unauthenticated access for kiosk
            # For search action, return all visitors; for list, return only active
            if self.action == 'search':
                return Visitor.objects.all().order_by('-checkin_time')
            else:
                return Visitor.objects.filter(status='CHECKED_IN').order_by('-checkin_time')
            
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
        # matches = WatchlistEntry.objects.filter(is_active=True).filter(
        
        # Handle Watchlist Rejection
        reject_reason = None
        status_val = 'CHECKED_IN'  # Default
        
        # TODO: Implement watchlist service when available
        # For now, skip watchlist check
        watchlist_hit = None
        
        if watchlist_hit:
            status_val = 'REJECTED'
            reject_reason = watchlist_hit.reason
            print(f"[CREATE] Visitor {serializer.validated_data.get('email', '')} blocked by watchlist: {reject_reason}")
        
        visitor = serializer.save(status=status_val)
        print(f"[CREATE] Created visitor {visitor.id} with status {visitor.status} by {self.request.user}")

        # Handle Watchlist Rejection
        if status_val == 'REJECTED':
             # Notify Admin?
             # For now, just stop.
             print(f"[CREATE] Visitor {visitor.id} rejected due to watchlist")
             return Response(serializer.data, status=status.HTTP_201_CREATED)

        # Send notification to host
        try:
            if status_val == 'PENDING':
                NotificationService.notify_host_approval_required(visitor)
                print(f"[CREATE] Sent approval required notification for visitor {visitor.id}")
            else:
                NotificationService.notify_host_of_arrival(visitor)
                print(f"[CREATE] Sent arrival notification for visitor {visitor.id}")
        except Exception as e:
            print(f"[CREATE] Failed to send notification for visitor {visitor.id}: {e}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check out a visitor."""
        visitor = self.get_object()
        
        print(f"[CHECKOUT] Attempting checkout for visitor {visitor.id} (status={visitor.status}) by {request.user}")
        
        if visitor.status == 'CHECKED_OUT':
            print(f"[CHECKOUT] Failed: visitor already checked out (status={visitor.status})")
            return Response(
                {'error': 'Visitor already checked out'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        visitor.checkout_time = timezone.now()
        visitor.status = 'CHECKED_OUT'
        visitor.save()
        
        print(f"[CHECKOUT] Checked out visitor {visitor.id}")
        
        # Notify host
        try:
            NotificationService.send_checkout_notification(visitor)
            print(f"[CHECKOUT] Sent checkout notification for visitor {visitor.id}")
        except Exception as e:
            print(f"[CHECKOUT] Failed to send checkout notification for visitor {visitor.id}: {e}")
        
        return Response(VisitorSerializer(visitor).data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for a returning visitor by email or phone."""
        query = request.query_params.get('query')
        if not query or len(query) < 3:
             print(f"[SEARCH] Invalid query: '{query}' (too short or empty)")
             return Response({'error': 'Query parameter must be at least 3 characters'}, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[SEARCH] Searching for visitors with query '{query}' by {request.user}")
        
        from django.db.models import Q
        queryset = self.get_queryset().filter(
            Q(email__icontains=query) | Q(phone__icontains=query) | Q(name__icontains=query)
        )
        
        results = VisitorSerializer(queryset, many=True).data
        print(f"[SEARCH] Found {len(results)} results for query '{query}'")
        
        return Response({'results': results})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending visitor."""
        visitor = self.get_object()
        
        # Log for debugging
        print(f"[APPROVE] Attempting to approve visitor {visitor.id} (status={visitor.status}) by user {request.user}")
        
        if visitor.status != 'PENDING':
            print(f"[APPROVE] Failed: visitor not pending (status={visitor.status})")
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)
            
        visitor.status = 'CHECKED_IN'
        visitor.save()
        
        print(f"[APPROVE] Approved visitor {visitor.id}")
        
        # Notify host (confirmation) and potentially visitor
        try:
            NotificationService.notify_host_of_arrival(visitor)
            print("[APPROVE] Notified host of arrival")
        except Exception as e:
            print(f"[APPROVE] Failed to notify host: {e}")
        
        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending visitor."""
        visitor = self.get_object()
        
        # Log for debugging
        print(f"[REJECT] Attempting to reject visitor {visitor.id} (status={visitor.status}) by user {request.user}")
        
        if visitor.status != 'PENDING':
            print(f"[REJECT] Failed: visitor not pending (status={visitor.status})")
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)
            
        visitor.status = 'REJECTED'
        visitor.save()
        
        print(f"[REJECT] Rejected visitor {visitor.id}")
        
        return Response(VisitorSerializer(visitor).data)

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

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get list of currently active (checked-in) visitors."""
        queryset = self.get_queryset().filter(status='CHECKED_IN')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


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

