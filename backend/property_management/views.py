from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.http import HttpResponse
import qrcode
import io
import base64

from .models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, MaintenancePhoto,
    WorkOrder, AssetType, Asset, MaintenanceSchedule, AssetCheckout,
    CostCenter, MaintenanceExpense, PriorityLevel, MaintenanceStatus, AssetStatus, Lease
)
from .serializers import (
    MaintenanceCategorySerializer, VendorSerializer, MaintenanceRequestSerializer,
    MaintenancePhotoSerializer, WorkOrderSerializer, AssetTypeSerializer, AssetSerializer,
    MaintenanceScheduleSerializer, AssetCheckoutSerializer, CostCenterSerializer,
    MaintenanceExpenseSerializer, MaintenanceRequestCreateSerializer, AssetCreateSerializer,
    LeaseSerializer
)
from visitors.utils import get_user_tenant


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow hosts to manage their own requests"""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Admin users can edit anything
        if hasattr(request.user, 'profile') and request.user.profile.is_admin:
            return True
        
        # Hosts can only edit their own requests
        if hasattr(obj, 'host'):
            return obj.host.user == request.user
        
        return False


class MaintenanceCategoryViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceCategory.objects.none()
    serializer_class = MaintenanceCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return MaintenanceCategory.objects.none()
        return MaintenanceCategory.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.none()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tenant', 'is_active', 'insurance_verified']
    search_fields = ['name', 'company', 'contact_person']
    ordering_fields = ['name', 'rating', 'created_at']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return Vendor.objects.none()
        return Vendor.objects.filter(tenant=tenant).prefetch_related('specialties')

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def verify_insurance(self, request, pk=None):
        """Mark vendor insurance as verified"""
        vendor = self.get_object()
        expiry_date = request.data.get('expiry_date')
        
        if expiry_date:
            vendor.insurance_verified = True
            vendor.insurance_expiry = expiry_date
            vendor.save()
            return Response({'status': 'insurance verified'})
        
        return Response(
            {'error': 'expiry_date is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.none()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['requested_at', 'priority', 'status']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return MaintenanceRequest.objects.none()
        return MaintenanceRequest.objects.select_related('location', 'category', 'assigned_to').filter(tenant=tenant)

    def get_serializer_class(self):
        if self.action == 'create':
            return MaintenanceRequestCreateSerializer
        return MaintenanceRequestSerializer

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def assign_vendor(self, request, pk=None):
        """Assign a vendor to the maintenance request"""
        maintenance_request = self.get_object()
        vendor_id = request.data.get('vendor_id')
        
        try:
            vendor = Vendor.objects.get(id=vendor_id)
            maintenance_request.assigned_to = vendor
            maintenance_request.assigned_at = timezone.now()
            maintenance_request.status = MaintenanceStatus.ASSIGNED
            maintenance_request.save()
            
            # Create work order if not exists
            if not hasattr(maintenance_request, 'work_order'):
                WorkOrder.objects.create(
                    maintenance_request=maintenance_request,
                    vendor=vendor,
                    work_order_number=f"WO-{timezone.now().strftime('%Y%m%d')}-{maintenance_request.id}",
                    instructions=maintenance_request.description
                )
            
            return Response({'status': 'vendor assigned'})
        except Vendor.DoesNotExist:
            return Response(
                {'error': 'Vendor not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update maintenance request status"""
        maintenance_request = self.get_object()
        new_status = request.data.get('status')
        
        if new_status in dict(MaintenanceStatus.choices):
            maintenance_request.status = new_status
            
            # Update timestamps based on status
            if new_status == MaintenanceStatus.IN_PROGRESS:
                maintenance_request.started_at = timezone.now()
            elif new_status == MaintenanceStatus.COMPLETED:
                maintenance_request.completed_at = timezone.now()
            
            maintenance_request.save()
            return Response({'status': 'updated'})
        
        return Response(
            {'error': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def add_photo(self, request, pk=None):
        """Add a photo to the maintenance request"""
        maintenance_request = self.get_object()
        photo_data = request.data.get('photo')
        caption = request.data.get('caption', '')
        is_before = request.data.get('is_before_photo', True)
        
        if photo_data:
            MaintenancePhoto.objects.create(
                maintenance_request=maintenance_request,
                photo=photo_data,
                caption=caption,
                is_before_photo=is_before,
                uploaded_by=request.user
            )
            return Response({'status': 'photo added'})
        
        return Response(
            {'error': 'photo data is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.none()
    serializer_class = WorkOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['vendor', 'maintenance_request']
    ordering_fields = ['created_at', 'work_order_number']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return WorkOrder.objects.none()
        return WorkOrder.objects.filter(maintenance_request__tenant=tenant)


class AssetTypeViewSet(viewsets.ModelViewSet):
    queryset = AssetType.objects.none()
    serializer_class = AssetTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return AssetType.objects.none()
        return AssetType.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.none()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['name', 'purchase_date', 'last_maintenance_date']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return Asset.objects.none()
        return Asset.objects.select_related('location', 'asset_type').filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    def get_serializer_class(self):
        if self.action == 'create':
            return AssetCreateSerializer
        return AssetSerializer

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Generate QR code for the asset"""
        asset = self.get_object()
        
        # Create QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(asset.qr_code)
        qr.make(fit=True)
        
        # Convert to image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return Response({
            'qr_code': img_str,
            'qr_value': asset.qr_code
        })

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check out asset for use"""
        asset = self.get_object()
        expected_return = request.data.get('expected_return_at')
        notes = request.data.get('notes', '')
        condition = request.data.get('condition', '')
        
        if asset.status != AssetStatus.OPERATIONAL:
            return Response(
                {'error': 'Asset is not available for checkout'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create checkout record
        checkout = AssetCheckout.objects.create(
            asset=asset,
            checked_out_by=request.user,
            expected_return_at=expected_return,
            notes=notes,
            condition_checkout=condition
        )
        
        # Update asset status
        asset.status = AssetStatus.UNDER_MAINTENANCE
        asset.save()
        
        return Response(AssetCheckoutSerializer(checkout).data)

    @action(detail=True, methods=['post'])
    def checkin(self, request, pk=None):
        """Check in asset after use"""
        asset = self.get_object()
        condition = request.data.get('condition', '')
        
        try:
            checkout = AssetCheckout.objects.filter(
                asset=asset, 
                actual_return_at__isnull=True
            ).latest('checked_out_at')
            
            checkout.actual_return_at = timezone.now()
            checkout.condition_return = condition
            checkout.save()
            
            # Update asset status
            asset.status = AssetStatus.OPERATIONAL
            asset.save()
            
            return Response({'status': 'asset checked in'})
        except AssetCheckout.DoesNotExist:
            return Response(
                {'error': 'No active checkout found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class MaintenanceScheduleViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceSchedule.objects.none()
    serializer_class = MaintenanceScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['scheduled_date', 'created_at']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return MaintenanceSchedule.objects.none()
        return MaintenanceSchedule.objects.filter(asset__tenant=tenant)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming maintenance schedules"""
        upcoming = MaintenanceSchedule.objects.filter(
            scheduled_date__gte=timezone.now(),
            status__in=[MaintenanceStatus.REQUESTED, MaintenanceStatus.ASSIGNED]
        ).order_by('scheduled_date')
        
        page = self.paginate_queryset(upcoming)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class AssetCheckoutViewSet(viewsets.ModelViewSet):
    queryset = AssetCheckout.objects.none()
    serializer_class = AssetCheckoutSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['checked_out_at', 'expected_return_at']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return AssetCheckout.objects.none()
        return AssetCheckout.objects.filter(asset__tenant=tenant)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue asset checkouts"""
        overdue = AssetCheckout.objects.filter(
            actual_return_at__isnull=True,
            expected_return_at__lt=timezone.now()
        ).order_by('expected_return_at')
        
        page = self.paginate_queryset(overdue)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


class CostCenterViewSet(viewsets.ModelViewSet):
    queryset = CostCenter.objects.none()
    serializer_class = CostCenterSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['code', 'name', 'current_spend']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return CostCenter.objects.none()
        return CostCenter.objects.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()

    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        """Get expenses for this cost center"""
        cost_center = self.get_object()
        expenses = MaintenanceExpense.objects.filter(cost_center=cost_center)
        
        # Add summary statistics
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Group by expense type
        by_type = expenses.values('expense_type').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return Response({
            'total_expenses': total_expenses,
            'by_type': list(by_type),
            'recent_expenses': MaintenanceExpenseSerializer(
                expenses.order_by('-created_at')[:10], 
                many=True
            ).data
        })


class MaintenanceExpenseViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceExpense.objects.none()
    serializer_class = MaintenanceExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['created_at', 'amount', 'invoice_date']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return MaintenanceExpense.objects.none()
        return MaintenanceExpense.objects.filter(cost_center__tenant=tenant)


class DashboardViewSet(viewsets.ViewSet):
    """Dashboard endpoints for property management analytics"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview statistics"""
        tenant = get_user_tenant(request.user)
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_403_FORBIDDEN)
            
        # Base filter for tenant
        tenant_filter = {'tenant': tenant}
        
        # Additional location filter if preferred
        user = request.user
        if hasattr(user, 'profile') and user.profile.location:
            location_filter = {**tenant_filter, 'location': user.profile.location}
        else:
            location_filter = tenant_filter
        
        # Maintenance requests stats
        maintenance_stats = {
            'total': MaintenanceRequest.objects.filter(**location_filter).count(),
            'emergency': MaintenanceRequest.objects.filter(
                priority=PriorityLevel.EMERGENCY, 
                status__in=[MaintenanceStatus.REQUESTED, MaintenanceStatus.ASSIGNED]
            ).count(),
            'in_progress': MaintenanceRequest.objects.filter(
                status=MaintenanceStatus.IN_PROGRESS
            ).count(),
            'completed_this_month': MaintenanceRequest.objects.filter(
                status=MaintenanceStatus.COMPLETED,
                completed_at__month=timezone.now().month,
                completed_at__year=timezone.now().year
            ).count()
        }
        
        # Asset stats
        asset_stats = {
            'total': Asset.objects.filter(**location_filter).count(),
            'operational': Asset.objects.filter(
                status=AssetStatus.OPERATIONAL, **location_filter
            ).count(),
            'under_maintenance': Asset.objects.filter(
                status=AssetStatus.UNDER_MAINTENANCE, **location_filter
            ).count(),
            'maintenance_due': Asset.objects.filter(
                next_maintenance_date__lte=timezone.now().date() + timezone.timedelta(days=7),
                **location_filter
            ).count()
        }
        
        # Upcoming schedules
        upcoming_schedules = MaintenanceSchedule.objects.filter(
            scheduled_date__gte=timezone.now(),
            scheduled_date__lte=timezone.now() + timezone.timedelta(days=7)
        ).count()
        
        return Response({
            'maintenance_stats': maintenance_stats,
            'asset_stats': asset_stats,
            'upcoming_schedules': upcoming_schedules
        })

    @action(detail=False, methods=['get'])
    def maintenance_trends(self, request):
        """Get maintenance request trends over time"""
        from django.db.models import Count
        from django.db.models.functions import TruncMonth, TruncWeek
        
        period = request.query_params.get('period', 'month')
        
        if period == 'week':
            trunc_func = TruncWeek
        else:
            trunc_func = TruncMonth
        
        trends = MaintenanceRequest.objects.annotate(
            period=trunc_func('requested_at')
        ).values('period').annotate(
            count=Count('id')
        ).order_by('period')
        
        return Response(list(trends))

    @action(detail=False, methods=['get'])
    def vendor_performance(self, request):
        """Get vendor performance metrics"""
        vendors = Vendor.objects.annotate(
            total_requests=Count('assigned_requests'),
            completed_requests=Count(
                'assigned_requests',
                filter=Q(assigned_requests__status=MaintenanceStatus.COMPLETED)
            ),
            avg_completion_time=models.Avg(
                'assigned_requests__completed_at',
                filter=Q(assigned_requests__completed_at__isnull=False)
            )
        ).filter(total_requests__gt=0)
        
        data = []
        for vendor in vendors:
            completion_rate = (
                (vendor.completed_requests / vendor.total_requests * 100) 
                if vendor.total_requests > 0 else 0
            )
            
            data.append({
                'vendor': VendorSerializer(vendor).data,
                'total_requests': vendor.total_requests,
                'completed_requests': vendor.completed_requests,
                'completion_rate': round(completion_rate, 2),
                'avg_completion_time': vendor.avg_completion_time
            })
        
        return Response(sorted(data, key=lambda x: x['completion_rate'], reverse=True))


class LeaseViewSet(viewsets.ModelViewSet):
    queryset = Lease.objects.none()
    serializer_class = LeaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'unit_number']
    search_fields = ['unit_number', 'tenant__name']
    ordering_fields = ['start_date', 'end_date', 'monthly_rent']

    def get_queryset(self):
        tenant = get_user_tenant(self.request.user)
        if not tenant:
            return Lease.objects.none()
        return Lease.objects.select_related('tenant').filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request.user)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            serializer.save()
