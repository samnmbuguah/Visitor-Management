from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from ..models import Visitor, Host, Location, UserRole, WatchlistEntry, VisitorType
from ..serializers import VisitorSerializer, VisitorCreateSerializer, VisitorActionSerializer, HostSerializer, VisitorTypeSerializer, WatchlistSerializer
from ..services.notifications import NotificationService
from ..utils import get_user_tenant
from ..permissions import IsSuperAdmin, IsLocationAdmin, IsHost


class HostViewSet(viewsets.ModelViewSet):
    """ViewSet for managing hosts."""
    queryset = Host.objects.none()
    serializer_class = HostSerializer
    permission_classes = [AllowAny] # Allow visitors to see host list

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        location_id = self.request.query_params.get('location')
        
        if tenant:
            queryset = Host.objects.filter(location__tenant=tenant)
        else:
            # If no tenant (anonymous Kiosk), must provide location_id
            if not location_id:
                return Host.objects.none()
            queryset = Host.objects.all()
        
        if location_id:
            queryset = queryset.filter(location_id=location_id)
            
        return queryset


class WatchlistViewSet(viewsets.ModelViewSet):
    """ViewSet for managing watchlist entries."""
    queryset = WatchlistEntry.objects.none()
    serializer_class = WatchlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return WatchlistEntry.objects.none()
        return WatchlistEntry.objects.filter(location__tenant=tenant)


class VisitorTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for visitor types (read-only for common use)."""
    queryset = VisitorType.objects.none()
    serializer_class = VisitorTypeSerializer

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return VisitorType.objects.none()
        return VisitorType.objects.filter(is_active=True, tenant=tenant).order_by('name')


class VisitorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing visitors."""
    queryset = Visitor.objects.none()
    serializer_class = VisitorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    def get_permissions(self):
        if self.action in ['create', 'search', 'active', 'checkout']:
            return [AllowAny()]
        return [IsAuthenticated()]

    filterset_fields = ['status', 'location', 'host', 'visitor_type']
    search_fields = ['name', 'email', 'company', 'purpose']
    ordering_fields = ['checkin_time', 'created_at', 'status']

    def get_serializer_class(self):
        if self.action == 'create':
            return VisitorCreateSerializer
        if self.action in ['approve', 'reject']:
            return VisitorActionSerializer
        return VisitorSerializer

    def get_queryset(self):
        """Filter queryset by user's tenant for strict isolation."""
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            # For anonymous Kiosk search/create, we allow access but might need filtering
            # For now, allow all if it's AllowAny actions
            if self.action in ['create', 'search', 'active', 'checkout']:
                return Visitor.objects.all()
            return Visitor.objects.none()
        
        queryset = Visitor.objects.select_related('host', 'location', 'visitor_type').filter(location__tenant=tenant).order_by('-checkin_time')

        # Apply date range filters if present
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(checkin_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(checkin_time__date__lte=end_date)
            
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
        
        # Determine initial status based on location settings
        if location and getattr(location, 'require_visitor_approval', False):
            status_val = 'PENDING'
        else:
            status_val = 'CHECKED_IN'
        
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
        
        # Check if user is the host of this visitor or is admin/super admin
        user = request.user
        profile = getattr(user, 'profile', None)
        
        if profile:
            if profile.role in ['SUPER_ADMIN', 'ADMIN']:
                # Admins can approve any visitor at their location
                if profile.role == 'ADMIN' and visitor.location != profile.location:
                    return Response({'error': 'Cannot approve visitor outside your location'}, status=status.HTTP_403_FORBIDDEN)
                # Admin can approve regardless of host assignment
            elif profile.role == 'HOST':
                # Hosts can only approve their own visitors
                user_host_profile = getattr(user, 'host_profile', None)
                if not user_host_profile or visitor.host != user_host_profile:
                    return Response({'error': 'Cannot approve visitor assigned to another host'}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        visitor.status = 'CHECKED_IN'
        visitor.approved_by = request.user
        visitor.approved_at = timezone.now()
        visitor.checkin_time = timezone.now()
        visitor.save()
        
        print(f"[APPROVE] Approved visitor {visitor.id}")
        
        # Notify host (confirmation) and potentially visitor
        try:
            # Only notify if visitor has a host
            if visitor.host:
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

