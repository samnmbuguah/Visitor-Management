import logging
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

logger = logging.getLogger(__name__)


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
        logger.debug("Action: %s, User: %s, Auth: %s", self.action, self.request.user, self.request.user.is_authenticated)
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
        user = self.request.user
        tenant = get_user_tenant(user)
        logger.debug(f"[VISITOR QS] Action: {self.action}, User: {user}, Tenant: {tenant}")
        
        base_qs = Visitor.objects.select_related(
            'host', 'location', 'visitor_type', 'kiosk', 'pre_registration', 'approved_by'
        )
        
        if not tenant:
            if self.action in ['search', 'active', 'checkout']:
                return base_qs.all()
            return Visitor.objects.none()
        
        profile = getattr(user, 'profile', None)
        if profile:
            if profile.role in ['SUPER_ADMIN', 'ADMIN']:
                if profile.role == 'ADMIN' and profile.location:
                    return base_qs.filter(location=profile.location)
                return base_qs.filter(location__tenant=tenant)
            
            if profile.role in ['RECEPTIONIST', 'MANAGER', 'SECURITY']:
                if profile.location:
                    return base_qs.filter(location=profile.location)
                return base_qs.filter(location__tenant=tenant)
        
        host_profile = getattr(user, 'host_profile', None)
        if host_profile:
            return base_qs.filter(host=host_profile)
            
        return Visitor.objects.none()

    def create(self, request, *args, **kwargs):
        logger.debug("Create data: %s", request.data)
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        from django.db.models import Q
        from ..models import WatchlistEntry

        name = serializer.validated_data.get('name')
        email = serializer.validated_data.get('email')
        phone = serializer.validated_data.get('phone')
        location = serializer.validated_data.get('location')

        reject_reason = None

        if location and getattr(location, 'require_visitor_approval', False):
            status_val = 'PENDING'
        else:
            status_val = 'CHECKED_IN'

        watchlist_hit = None

        if watchlist_hit:
            status_val = 'REJECTED'
            reject_reason = watchlist_hit.reason
            logger.warning("Visitor %s blocked by watchlist: %s", serializer.validated_data.get('email', ''), reject_reason)

        visitor = serializer.save(status=status_val)
        logger.info("Created visitor %s with status %s by %s", visitor.id, visitor.status, self.request.user)

        # Generate AI executive briefing for host
        try:
            from ..ai.briefing_agent import generate_host_briefing
            generate_host_briefing(visitor)
        except Exception as err:
            logger.warning("Could not generate AI briefing for visitor %s: %s", visitor.id, err)

        if status_val == 'REJECTED':
             logger.warning("Visitor %s rejected due to watchlist", visitor.id)
             return Response(serializer.data, status=status.HTTP_201_CREATED)

        try:
            if status_val == 'PENDING':
                NotificationService.notify_host_approval_required(visitor)
                logger.info("Sent approval required notification for visitor %s", visitor.id)
            else:
                NotificationService.notify_host_of_arrival(visitor)
                logger.info("Sent arrival notification for visitor %s", visitor.id)
        except Exception as e:
            logger.error("Failed to send notification for visitor %s: %s", visitor.id, e)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check out a visitor."""
        visitor = self.get_object()

        if visitor.status == 'CHECKED_OUT':
            return Response(
                {'error': 'Visitor already checked out'},
                status=status.HTTP_400_BAD_REQUEST
            )

        visitor.checkout_time = timezone.now()
        visitor.status = 'CHECKED_OUT'
        visitor.save()

        logger.info("Checked out visitor %s by %s", visitor.id, request.user)

        try:
            NotificationService.send_checkout_notification(visitor)
        except Exception as e:
            logger.error("Failed to send checkout notification for visitor %s: %s", visitor.id, e)

        return Response(VisitorSerializer(visitor).data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for a returning visitor by email or phone."""
        query = request.query_params.get('query')
        if not query or len(query) < 3:
             return Response({'error': 'Query parameter must be at least 3 characters'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db.models import Q
        queryset = self.get_queryset().filter(
            Q(email__icontains=query) | Q(phone__icontains=query) | Q(name__icontains=query)
        )

        results = VisitorSerializer(queryset, many=True).data
        logger.info("Search for '%s': found %s results", query, len(results))

        return Response({'results': results})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending visitor."""
        visitor = self.get_object()

        if visitor.status != 'PENDING':
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        profile = getattr(user, 'profile', None)

        if profile:
            if profile.role in ['SUPER_ADMIN', 'ADMIN']:
                if profile.role == 'ADMIN' and visitor.location != profile.location:
                    return Response({'error': 'Cannot approve visitor outside your location'}, status=status.HTTP_403_FORBIDDEN)
            elif profile.role == 'HOST':
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

        logger.info("Approved visitor %s by %s", visitor.id, request.user)

        try:
            if visitor.host:
                NotificationService.notify_host_of_arrival(visitor)
        except Exception as e:
            logger.error("Failed to notify host for visitor %s: %s", visitor.id, e)

        return Response(VisitorSerializer(visitor).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending visitor."""
        visitor = self.get_object()

        if visitor.status != 'PENDING':
            return Response({'error': 'Visitor is not pending approval'}, status=status.HTTP_400_BAD_REQUEST)

        visitor.status = 'REJECTED'
        visitor.save()

        logger.info("Rejected visitor %s by %s", visitor.id, request.user)

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

