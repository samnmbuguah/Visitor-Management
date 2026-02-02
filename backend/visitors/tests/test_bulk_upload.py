from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from .base import BaseTestCase
from ..models import PreRegistration

class BulkUploadTests(BaseTestCase):
    def test_bulk_upload_success(self):
        # CSV Content: name,email,expected_arrival,phone,company,host_email
        # Provide host_email since logged in user is admin not host
        csv_content = (f"name,email,expected_arrival,phone,company,host_email\n"
                       f"Visitor One,v1@test.com,2025-12-31 10:00,123,CompA,{self.host.email}\n"
                       f"Visitor Two,v2@test.com,2025-12-31 11:00,,,{self.host.email}\n").encode('utf-8')
        
        file = SimpleUploadedFile("invitees.csv", csv_content, content_type="text/csv")
        
        response = self.client.post(
            '/api/pre-registrations/bulk_upload/',
            {'file': file},
            format='multipart'
        )
        
        if response.status_code != status.HTTP_201_CREATED:
            self.fail(f"Bulk Upload Failed: {response.data}")
            
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(PreRegistration.objects.count(), 2)
        
    def test_bulk_upload_invalid_file(self):
        response = self.client.post(
            '/api/pre-registrations/bulk_upload/',
            {}, # No file
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
