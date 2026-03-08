from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
import json
from datetime import timedelta

from visitors.models import Location, Host, PreRegistration, Visitor, Tenant, UserProfile
from property_management.models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, MaintenancePhoto,
    WorkOrder, AssetType, Asset, MaintenanceSchedule, AssetCheckout,
    CostCenter, MaintenanceExpense, PriorityLevel, MaintenanceStatus, AssetStatus
)


class PropertyManagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        # Create location
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St",
            timezone="UTC"
        )
        
        # Create user and host
        # Create user and host
        import uuid
        unique_username = f"testuser_{uuid.uuid4().hex[:8]}"
        self.user = User.objects.create_user(
            username=unique_username,
            password='testpass123',
            email=f'{unique_username}@example.com'
        )
        
        # Create user profile
        UserProfile.objects.create(
            user=self.user,
            role='ADMIN',
            location=self.location
        )
        
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Test Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.user
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.user)
        
        # Create test data
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="HVAC",
            description="Heating and cooling"
        )
        
        self.vendor = Vendor.objects.create(
            tenant=self.tenant,
            name="Test Vendor",
            contact_person="John Doe",
            phone="1234567890",
            email="vendor@example.com",
            company="Test Company"
        )
        self.vendor.specialties.add(self.category)
        
        self.asset_type = AssetType.objects.create(
            tenant=self.tenant,
            name="Air Conditioner",
            description="HVAC unit",
            requires_maintenance=True,
            maintenance_interval_days=30
        )


class MaintenanceRequestTests(PropertyManagementTestCase):
    def test_create_maintenance_request(self):
        """Test creating a maintenance request"""
        data = {
            'title': 'Broken AC',
            'description': 'The AC unit is not cooling',
            'priority': 'HIGH',
            'category': self.category.id,
            'location': self.location.id
        }
        
        response = self.client.post('/api/property-management/requests/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the most recent request since ID is not returned
        request = MaintenanceRequest.objects.latest('id')
        self.assertEqual(request.title, 'Broken AC')
        self.assertEqual(request.priority, PriorityLevel.HIGH)
        self.assertEqual(request.host, self.host)
        self.assertEqual(request.status, MaintenanceStatus.REQUESTED)

    def test_get_maintenance_requests(self):
        """Test retrieving maintenance requests"""
        MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test description",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        response = self.client.get('/api/property-management/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_update_maintenance_request_status(self):
        """Test updating maintenance request status"""
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test description",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        response = self.client.post(
            f'/api/property-management/requests/{request.id}/update_status/',
            {'status': 'IN_PROGRESS'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.status, MaintenanceStatus.IN_PROGRESS)
        self.assertIsNotNone(request.started_at)

    def test_assign_vendor_to_request(self):
        """Test assigning a vendor to maintenance request"""
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test description",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        response = self.client.post(
            f'/api/property-management/requests/{request.id}/assign_vendor/',
            {'vendor_id': self.vendor.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        request.refresh_from_db()
        self.assertEqual(request.assigned_to, self.vendor)
        self.assertEqual(request.status, MaintenanceStatus.ASSIGNED)
        self.assertIsNotNone(request.assigned_at)
        
        # Check if work order was created
        self.assertTrue(hasattr(request, 'work_order'))

    def test_add_photo_to_request(self):
        """Test adding photos to maintenance request"""
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test description",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        # Mock base64 image data
        photo_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        response = self.client.post(
            f'/api/property-management/requests/{request.id}/add_photo/',
            {
                'photo': photo_data,
                'caption': 'Test photo',
                'is_before_photo': True
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertEqual(request.photos.count(), 1)
        photo = request.photos.first()
        self.assertEqual(photo.caption, 'Test photo')
        self.assertTrue(photo.is_before_photo)


class AssetManagementTests(PropertyManagementTestCase):
    def test_create_asset(self):
        """Test creating an asset"""
        data = {
            'name': 'Main AC Unit',
            'description': 'Primary air conditioning unit',
            'asset_type': self.asset_type.id,
            'location': self.location.id,
            'serial_number': 'AC123456',
            'manufacturer': 'Carrier',
            'model': 'XYZ-1000'
        }
        
        response = self.client.post('/api/property-management/assets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        asset = Asset.objects.get(id=response.data['id'])
        self.assertEqual(asset.name, 'Main AC Unit')
        self.assertEqual(asset.status, AssetStatus.OPERATIONAL)
        self.assertIsNotNone(asset.qr_code)

    def test_get_assets(self):
        """Test retrieving assets"""
        Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location,
            serial_number="TEST123"
        )
        
        response = self.client.get('/api/property-management/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_generate_qr_code(self):
        """Test generating QR code for asset"""
        asset = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location,
            serial_number="TEST123"
        )
        
        response = self.client.get(f'/api/property-management/assets/{asset.id}/qr_code/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('qr_code', response.data)
        self.assertIn('qr_value', response.data)

    def test_checkout_asset(self):
        """Test checking out an asset"""
        asset = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location,
            serial_number="TEST123"
        )
        
        expected_return = timezone.now() + timedelta(days=7)
        response = self.client.post(
            f'/api/property-management/assets/{asset.id}/checkout/',
            {
                'expected_return_at': expected_return.isoformat(),
                'notes': 'Test checkout',
                'condition': 'Good condition'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        asset.refresh_from_db()
        self.assertEqual(asset.status, AssetStatus.UNDER_MAINTENANCE)
        
        # Check if checkout record was created
        self.assertEqual(asset.checkouts.count(), 1)
        checkout = asset.checkouts.first()
        self.assertEqual(checkout.checked_out_by, self.user)

    def test_checkin_asset(self):
        """Test checking in an asset"""
        asset = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location,
            serial_number="TEST123",
            status=AssetStatus.UNDER_MAINTENANCE
        )
        
        # Create checkout record
        checkout = AssetCheckout.objects.create(
            asset=asset,
            checked_out_by=self.user,
            expected_return_at=timezone.now() + timedelta(days=7)
        )
        
        response = self.client.post(
            f'/api/property-management/assets/{asset.id}/checkin/',
            {'condition': 'Returned in good condition'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        asset.refresh_from_db()
        self.assertEqual(asset.status, AssetStatus.OPERATIONAL)
        
        checkout.refresh_from_db()
        self.assertIsNotNone(checkout.actual_return_at)


class VendorManagementTests(PropertyManagementTestCase):
    def test_create_vendor(self):
        """Test creating a vendor"""
        data = {
            'name': 'New Vendor',
            'contact_person': 'Jane Smith',
            'phone': '9876543210',
            'email': 'jane@newvendor.com',
            'company': 'New Company',
            'specialty_ids': [self.category.id]
        }
        
        response = self.client.post('/api/property-management/vendors/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        vendor = Vendor.objects.get(id=response.data['id'])
        self.assertEqual(vendor.name, 'New Vendor')
        self.assertEqual(vendor.contact_person, 'Jane Smith')
        self.assertTrue(vendor.specialties.filter(id=self.category.id).exists())

    def test_verify_insurance(self):
        """Test verifying vendor insurance"""
        expiry_date = (timezone.now() + timedelta(days=365)).date()
        
        response = self.client.post(
            f'/api/property-management/vendors/{self.vendor.id}/verify_insurance/',
            {'expiry_date': expiry_date.isoformat()}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.insurance_verified)
        self.assertEqual(self.vendor.insurance_expiry, expiry_date)


class MaintenanceScheduleTests(PropertyManagementTestCase):
    def test_create_maintenance_schedule(self):
        """Test creating maintenance schedule"""
        import uuid
        asset = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location
        )
        
        scheduled_date = timezone.now() + timedelta(days=7)
        data = {
            'asset_id': asset.id,
            'title': 'Preventive Maintenance',
            'description': 'Monthly checkup',
            'scheduled_date': scheduled_date.isoformat(),
            'estimated_duration_hours': 2.0,
            'assigned_to_id': self.vendor.id
        }
        
        response = self.client.post('/api/property-management/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        schedule = MaintenanceSchedule.objects.get(id=response.data['id'])
        self.assertEqual(schedule.asset, asset)
        self.assertEqual(schedule.assigned_to, self.vendor)
        self.assertEqual(schedule.status, MaintenanceStatus.REQUESTED)

    def test_get_upcoming_schedules(self):
        """Test retrieving upcoming maintenance schedules"""
        import uuid
        asset = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=self.asset_type,
            location=self.location
        )
        
        # Create upcoming schedule
        MaintenanceSchedule.objects.create(
            asset=asset,
            title="Upcoming Maintenance",
            description="Test",
            scheduled_date=timezone.now() + timedelta(days=7),
            estimated_duration_hours=2.0
        )
        
        # Create past schedule
        MaintenanceSchedule.objects.create(
            asset=asset,
            title="Past Maintenance",
            description="Test",
            scheduled_date=timezone.now() - timedelta(days=7),
            estimated_duration_hours=2.0,
            status=MaintenanceStatus.COMPLETED
        )
        
        response = self.client.get('/api/property-management/schedules/upcoming/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class CostCenterTests(PropertyManagementTestCase):
    def test_create_cost_center(self):
        """Test creating a cost center"""
        data = {
            'name': 'IT Department',
            'code': 'IT001',
            'description': 'IT operations and equipment',
            'budget_limit': 10000.00,
            'manager_id': self.host.id
        }
        
        response = self.client.post('/api/property-management/cost-centers/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        cost_center = CostCenter.objects.get(id=response.data['id'])
        self.assertEqual(cost_center.name, 'IT Department')
        self.assertEqual(cost_center.code, 'IT001')
        self.assertEqual(cost_center.manager_id, self.host.id)

    def test_get_cost_center_expenses(self):
        """Test retrieving cost center expenses"""
        cost_center = CostCenter.objects.create(
            tenant=self.tenant,
            name="IT Department",
            code="IT001",
            budget_limit=10000.00
        )
        
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        # Create expense
        MaintenanceExpense.objects.create(
            maintenance_request=request,
            cost_center=cost_center,
            expense_type='LABOR',
            description='Repair work',
            amount=500.00
        )
        
        response = self.client.get(f'/api/property-management/cost-centers/{cost_center.id}/expenses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['total_expenses'], 500.00)
        self.assertEqual(len(data['by_type']), 1)
        self.assertEqual(data['by_type'][0]['total'], 500.00)


class DashboardTests(PropertyManagementTestCase):
    def test_dashboard_overview(self):
        """Test dashboard overview statistics"""
        # Create test data
        MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Emergency Request",
            description="Test",
            priority=PriorityLevel.EMERGENCY,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Test Asset",
            description="Test",
            asset_type=self.asset_type,
            location=self.location,
            status=AssetStatus.UNDER_MAINTENANCE
        )
        
        response = self.client.get('/api/property-management/dashboard/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('maintenance_stats', data)
        self.assertIn('asset_stats', data)
        self.assertIn('upcoming_schedules', data)
        
        # Check specific stats
        self.assertEqual(data['maintenance_stats']['emergency'], 1)
        self.assertEqual(data['asset_stats']['under_maintenance'], 1)

    def test_maintenance_trends(self):
        """Test maintenance request trends"""
        # Create test data over different months
        for i in range(3):
            MaintenanceRequest.objects.create(
                tenant=self.tenant,
                title=f"Request {i}",
                description="Test",
                priority=PriorityLevel.MEDIUM,
                category=self.category,
                location=self.location,
                host=self.host,
                requested_at=timezone.now() - timedelta(days=i*30)
            )
        
        response = self.client.get('/api/property-management/dashboard/maintenance_trends/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        trends = response.data
        self.assertIsInstance(trends, list)
        self.assertTrue(len(trends) > 0)


class IntegrationTests(PropertyManagementTestCase):
    def test_contractor_visitor_integration(self):
        """Test integration between property management and visitor system"""
        # Create a maintenance request
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test",
            priority=PriorityLevel.HIGH,
            category=self.category,
            location=self.location,
            host=self.host,
            assigned_to=self.vendor
        )
        
        # Create visitor record for contractor
        visitor = Visitor.objects.create(
            tenant=self.tenant,
            name=self.vendor.contact_person,
            email=self.vendor.email,
            phone=self.vendor.phone,
            company=self.vendor.company,
            purpose=f"Maintenance: {request.title}",
            host=self.host,
            location=self.location
        )
        
        self.assertEqual(visitor.purpose, f"Maintenance: {request.title}")
        self.assertEqual(visitor.company, self.vendor.company)

    def test_location_based_filtering(self):
        """Test location-based filtering for property management"""
        # Create another location
        other_location = Location.objects.create(
            tenant=self.tenant,
            name="Other Office",
            address="456 Other St"
        )
        
        # Create assets in different locations
        asset1 = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Asset 1",
            description="Test",
            asset_type=self.asset_type,
            location=self.location,
            serial_number="SN1"
        )
        
        asset2 = Asset.objects.create(qr_code=__import__('uuid').uuid4().hex, 
            tenant=self.tenant,
            name="Asset 2",
            description="Test",
            asset_type=self.asset_type,
            location=other_location,
            serial_number="SN2"
        )
        
        # Filter by user's location
        response = self.client.get('/api/property-management/assets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return all assets for admin users
        self.assertEqual(len(response.data['results']), 2)
