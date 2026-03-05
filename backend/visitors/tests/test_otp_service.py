from django.test import TestCase
from django.core.cache import cache

from ..services.otp_service import OTPService


class OTPServiceTests(TestCase):
    def tearDown(self):
        cache.clear()

    def test_send_otp_stores_code_in_cache(self):
        identifier = "user@example.com"
        otp = OTPService.send_otp(identifier, channel='email')
        self.assertIsNotNone(otp)
        self.assertEqual(cache.get(f"otp_{identifier}"), otp)

    def test_verify_otp_success_deletes_cached_code(self):
        identifier = "user2@example.com"
        otp = OTPService.send_otp(identifier)

        ok = OTPService.verify_otp(identifier, otp)
        self.assertTrue(ok)
        self.assertIsNone(cache.get(f"otp_{identifier}"))

    def test_verify_otp_failure_keeps_cached_code(self):
        identifier = "user3@example.com"
        otp = OTPService.send_otp(identifier)

        ok = OTPService.verify_otp(identifier, "000000")
        self.assertFalse(ok)
        self.assertEqual(cache.get(f"otp_{identifier}"), otp)
