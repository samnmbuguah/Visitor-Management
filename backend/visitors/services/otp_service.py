import random
import string
from django.core.cache import cache
from .notification_service import NotificationService

class OTPService:
    @staticmethod
    def generate_otp(length=6):
        return ''.join(random.choices(string.digits, k=length))

    @staticmethod
    def send_otp(identifier, channel='email'):
        otp = OTPService.generate_otp()
        # Store in cache for 5 minutes
        cache.set(f"otp_{identifier}", otp, timeout=300)
        
        print(f"[MOCK OTP] Generated OTP for {identifier}: {otp}")
        
        # Mock sending
        if channel == 'email':
            # NotificationService.send_email(...)
            pass
        return otp

    @staticmethod
    def verify_otp(identifier, code):
        stored_otp = cache.get(f"otp_{identifier}")
        if stored_otp and stored_otp == code:
            cache.delete(f"otp_{identifier}")
            return True
        return False
