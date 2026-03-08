from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaintenanceCategoryViewSet, VendorViewSet, MaintenanceRequestViewSet,
    WorkOrderViewSet, AssetTypeViewSet, AssetViewSet, MaintenanceScheduleViewSet,
    AssetCheckoutViewSet, CostCenterViewSet, MaintenanceExpenseViewSet,
    DashboardViewSet, LeaseViewSet
)

router = DefaultRouter()
router.register(r'categories', MaintenanceCategoryViewSet)
router.register(r'vendors', VendorViewSet)
router.register(r'requests', MaintenanceRequestViewSet)
router.register(r'work-orders', WorkOrderViewSet)
router.register(r'asset-types', AssetTypeViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'schedules', MaintenanceScheduleViewSet)
router.register(r'checkouts', AssetCheckoutViewSet)
router.register(r'cost-centers', CostCenterViewSet)
router.register(r'expenses', MaintenanceExpenseViewSet)
router.register(r'leases', LeaseViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
