from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from django.conf import settings
from django import get_version as django_version
import time
import os


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_time = time.time()
        db_status = "healthy"
        db_error = None

        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            db_status = "unhealthy"
            db_error = str(e)

        response_time = round((time.time() - start_time) * 1000, 2)

        data = {
            "status": "healthy" if db_status == "healthy" else "degraded",
            "version": os.environ.get("APP_VERSION", "1.0.0"),
            "django_version": django_version(),
            "debug": settings.DEBUG,
            "database": {
                "status": db_status,
                "error": db_error,
                "time_ms": response_time,
            },
            "timestamp": time.time(),
        }

        http_status = status.HTTP_200_OK if db_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(data, status=http_status)
