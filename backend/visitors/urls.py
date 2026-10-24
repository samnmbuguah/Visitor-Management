from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    VisitorViewSet,
    HostViewSet,
    VisitorTypeViewSet,
    WatchlistViewSet,
    LocationViewSet,
    KioskViewSet,
    RegisterView,
    UserProfileView,
    UserListView,
    LogoutView,
    CustomTokenObtainPairView,
    NotificationTemplateViewSet,
    NotificationLogViewSet,
    DashboardStatsView,
    VisitorTrendsView,
    PeakHoursView,
    HostStatsView,
    LocationStatsView,
    PreRegistrationViewSet,
    ParcelViewSet,
    DailyReportView,
    VisitTrendsExtendedView,
    SecurityDashboardView,
    LiveCameraView,
    GateControlView,
    SecurityIncidentsView,
    VisitorTrackingView,
    CameraViewSet,
    RegisterDeviceTokenView,
    UnregisterDeviceTokenView,
    ListDeviceTokensView,
    UpdateNotificationPreferencesView,
    SendTestNotificationView,
    NotificationHistoryView,
    MarkNotificationReadView,
    NotificationStatsView,
    CreateCustomerView,
    CreateSubscriptionView,
    CancelSubscriptionView,
    UpdateSubscriptionView,
    SubscriptionStatusView,
    InvoicesView,
    UsageMetricsView,
    StripeWebhookView,
    TenantViewSet,
)
from .views.ai_views import (
    KioskAgentChatView,
    FrontDeskCopilotChatView,
    CardExtractionView,
)

router = DefaultRouter()
router.register(r'visitors', VisitorViewSet)
router.register(r'hosts', HostViewSet)
router.register(r'visitor-types', VisitorTypeViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'kiosks', KioskViewSet)
router.register(r'notification-templates', NotificationTemplateViewSet)
router.register(r'notification-logs', NotificationLogViewSet)
router.register(r'pre-registrations', PreRegistrationViewSet)
router.register(r'watchlist', WatchlistViewSet)
router.register(r'parcels', ParcelViewSet)
router.register(r'cameras', CameraViewSet, basename='camera')
router.register(r'tenants', TenantViewSet)

urlpatterns = [
    path('', include(router.urls)),

    # Authentication endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
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
    
    # Report endpoints
    path('reports/daily/', DailyReportView.as_view(), name='daily_report'),
    path('reports/trends/', VisitTrendsExtendedView.as_view(), name='visit_trends'),
    
    # Security endpoints
    path('security/dashboard/', SecurityDashboardView.as_view(), name='security_dashboard'),
    path('security/camera/', LiveCameraView.as_view(), name='live_camera'),
    path('security/gate/', GateControlView.as_view(), name='gate_control'),
    path('security/incidents/', SecurityIncidentsView.as_view(), name='security_incidents'),
    path('security/tracking/', VisitorTrackingView.as_view(), name='visitor_tracking'),
    
    # Push notification endpoints
    path('notifications/register/', RegisterDeviceTokenView.as_view(), name='register_device_token'),
    path('notifications/unregister/<uuid:token_id>/', UnregisterDeviceTokenView.as_view(), name='unregister_device_token'),
    path('notifications/tokens/', ListDeviceTokensView.as_view(), name='list_device_tokens'),
    path('notifications/preferences/', UpdateNotificationPreferencesView.as_view(), name='notification_preferences'),
    path('notifications/test/', SendTestNotificationView.as_view(), name='send_test_notification'),
    path('notifications/history/', NotificationHistoryView.as_view(), name='notification_history'),
    path('notifications/<uuid:notification_id>/read/', MarkNotificationReadView.as_view(), name='mark_notification_read'),
    path('notifications/stats/', NotificationStatsView.as_view(), name='notification_stats'),
    
    # Payment and billing endpoints
    path('billing/customer/', CreateCustomerView.as_view(), name='create_customer'),
    path('billing/subscribe/', CreateSubscriptionView.as_view(), name='create_subscription'),
    path('billing/cancel/', CancelSubscriptionView.as_view(), name='cancel_subscription'),
    path('billing/update/', UpdateSubscriptionView.as_view(), name='update_subscription'),
    path('billing/status/', SubscriptionStatusView.as_view(), name='subscription_status'),
    path('billing/invoices/', InvoicesView.as_view(), name='invoices'),
    path('billing/usage/', UsageMetricsView.as_view(), name='usage_metrics'),
    path('billing/webhook/stripe/', StripeWebhookView.as_view(), name='stripe_webhook'),

    # AI & LangGraph Agent endpoints
    path('ai/kiosk-chat/', KioskAgentChatView.as_view(), name='ai_kiosk_chat'),
    path('ai/copilot-chat/', FrontDeskCopilotChatView.as_view(), name='ai_copilot_chat'),
    path('ai/scan-card/', CardExtractionView.as_view(), name='ai_scan_card'),
]
