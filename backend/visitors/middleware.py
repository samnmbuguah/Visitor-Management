import logging

logger = logging.getLogger(__name__)

class AuthDebugMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if response.status_code == 401:
            auth_header = request.META.get('HTTP_AUTHORIZATION', 'N/A')
            path = request.path
            method = request.method
            print(f"[AUTH DEBUG] 401 Unauthorized for {method} {path}")
            print(f"[AUTH DEBUG] Authorization header: {auth_header[:20]}..." if auth_header != 'N/A' else "[AUTH DEBUG] Authorization header: MISSING")
            
        return response
