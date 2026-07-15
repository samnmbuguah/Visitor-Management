import logging
import time
import json

logger = logging.getLogger(__name__)


class AuthDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code == 401:
            auth_header = request.META.get("HTTP_AUTHORIZATION", "N/A")
            path = request.path
            method = request.method
            logger.warning(
                "401 Unauthorized: %s %s | Auth: %s",
                method,
                path,
                auth_header[:20] + "..." if auth_header != "N/A" else "MISSING",
            )

        return response


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration = round((time.time() - start_time) * 1000, 2)

        log_data = {
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": duration,
            "user": str(request.user) if request.user.is_authenticated else "anonymous",
            "ip": request.META.get("REMOTE_ADDR", ""),
        }

        if response.status_code >= 500:
            logger.error(json.dumps(log_data))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_data))
        else:
            logger.info(json.dumps(log_data))

        return response
