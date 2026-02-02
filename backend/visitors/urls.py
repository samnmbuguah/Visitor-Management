from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    VisitorViewSet,
    HostViewSet,
    LocationViewSet,
    KioskViewSet,
    RegisterView,
    UserProfileView,
    UserListView,
    LogoutView,
    NotificationTemplateViewSet,
    NotificationLogViewSet,
    DashboardStatsView,
    VisitorTrendsView,
    PeakHoursView,
    HostStatsView,
    LocationStatsView,
    PreRegistrationViewSet,
    WatchlistViewSet,
)

router = DefaultRouter()
router.register(r'visitors', VisitorViewSet)
router.register(r'hosts', HostViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'kiosks', KioskViewSet)
router.register(r'notification-templates', NotificationTemplateViewSet)
router.register(r'notification-logs', NotificationLogViewSet)
router.register(r'pre-registrations', PreRegistrationViewSet)
router.register(r'watchlist', WatchlistViewSet)

urlpatterns = [
    path('', include(router.urls)),

    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', UserProfileView.as_view(), name='user_profile'),
    path('auth/users/', UserListView.as_view(), name='user_list'),

    # Analytics endpoints
    path('analytics/dashboard/', DashboardStatsView.as_view(), name='analytics_dashboard'),
    path('analytics/visitors/', VisitorTrendsView.as_view(), name='analytics_visitors'),
    path('analytics/peak-hours/', PeakHoursView.as_view(), name='analytics_peak_hours'),
    path('analytics/hosts/', HostStatsView.as_view(), name='analytics_hosts'),
    path('analytics/locations/', LocationStatsView.as_view(), name='analytics_locations'),
]
