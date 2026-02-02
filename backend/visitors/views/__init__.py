from .visitor_views import VisitorViewSet, HostViewSet, WatchlistViewSet
from .location_views import LocationViewSet, KioskViewSet
from .auth_views import RegisterView, UserProfileView, UserListView, LogoutView
from .notification_views import NotificationTemplateViewSet, NotificationLogViewSet
from .pre_registration_views import PreRegistrationViewSet
from .analytics_views import (
    DashboardStatsView,
    VisitorTrendsView,
    PeakHoursView,
    HostStatsView,
    LocationStatsView,
)

__all__ = [
    'VisitorViewSet',
    'HostViewSet',
    'WatchlistViewSet',
    'LocationViewSet',
    'KioskViewSet',
    'RegisterView',
    'UserProfileView',
    'UserListView',
    'LogoutView',
    'NotificationTemplateViewSet',
    'NotificationLogViewSet',
    'DashboardStatsView',
    'VisitorTrendsView',
    'PeakHoursView',
    'HostStatsView',
    'LocationStatsView',
    'PreRegistrationViewSet',
]
