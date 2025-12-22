from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitorViewSet, HostViewSet

router = DefaultRouter()
router.register(r'visitors', VisitorViewSet)
router.register(r'hosts', HostViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
