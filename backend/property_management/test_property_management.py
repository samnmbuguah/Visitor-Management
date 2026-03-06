import pytest
from django.test import TestCase
from django.contrib.auth.models import User, AnonymousUser
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from django.utils import timezone
import json
from datetime import timedelta

from visitors.models import Location, Host, Visitor, Tenant
from property_management.models import (
    MaintenanceCategory, Vendor, MaintenanceRequest, Asset, AssetType,
    CostCenter, MaintenanceExpense, PriorityLevel, MaintenanceStatus, AssetStatus
)
from property_management.views import IsOwnerOrReadOnly


class PropertyManagementPermissionsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St"
        )
        
        # Create different user types
        self.admin_user = User.objects.create_user(
            username='admin',
            password='testpass123',
            email='admin@example.com'
        )
        
        self.host_user = User.objects.create_user(
            username='host',
            password='testpass123',
            email='host@example.com'
        )
        
        self.other_user = User.objects.create_user(
            username='other',
            password='testpass123',
            email='other@example.com'
        )
        
        # Create hosts
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Main Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.host_user
        )
        
        self.other_host = Host.objects.create(
            tenant=self.tenant,
            name="Other Host",
            email="other@example.com",
            department="HR",
            location=self.location,
            user=self.other_user
        )
        
        # Create test data
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="Plumbing",
            description="Plumbing issues"
        )

    def test_is_owner_or_readonly_permission(self):
        """Test custom permission for maintenance requests"""
        permission = IsOwnerOrReadOnly()
        
        # Create request by host
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Host Request",
            description="Test",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        # Mock request objects
        mock_request = MagicMock()
        
        # Test host can edit their own request
        mock_request.user = self.host_user
        mock_request.method = 'PUT'
        self.assertTrue(permission.has_object_permission(mock_request, None, request))
        
        # Test other host cannot edit
        mock_request.user = self.other_user
        self.assertFalse(permission.has_object_permission(mock_request, None, request))
        
        # Test admin can edit any request
        mock_request.user = self.admin_user
        with patch.object(self.admin_user, 'profile') as mock_profile:
            mock_profile.is_admin = True
            self.assertTrue(permission.has_object_permission(mock_request, None, request))
        
        # Test safe methods are allowed for all
        mock_request.method = 'GET'
        mock_request.user = self.other_user
        self.assertTrue(permission.has_object_permission(mock_request, None, request))


class PropertyManagementAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St"
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Test Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.user
        )
        
        self.client.force_authenticate(user=self.user)
        
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="Electrical",
            description="Electrical issues"
        )

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access APIs"""
        self.client.force_authenticate(user=None)
        
        endpoints = [
            '/api/property-management/requests/',
            '/api/property-management/assets/',
            '/api/property-management/vendors/',
            '/api/property-management/categories/',
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_access_allowed(self):
        """Test that authenticated users can access APIs"""
        endpoints = [
            '/api/property-management/requests/',
            '/api/property-management/assets/',
            '/api/property-management/vendors/',
            '/api/property-management/categories/',
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])

    def test_api_response_format(self):
        """Test API response format and structure"""
        # Create test data
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
        
        data = response.data
        if 'results' in data:  # Paginated response
            self.assertIsInstance(data['results'], list)
            if data['results']:
                request_data = data['results'][0]
                self.assertIn('id', request_data)
                self.assertIn('title', request_data)
                self.assertIn('priority', request_data)
                self.assertIn('status', request_data)
                self.assertIn('location', request_data)
                self.assertIn('category', request_data)
                self.assertIn('host', request_data)
        else:  # Non-paginated response
            self.assertIsInstance(data, list)


class PropertyManagementModelTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St"
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Test Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.user
        )
        
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="HVAC",
            description="Heating and cooling"
        )

    def test_maintenance_request_creation(self):
        """Test maintenance request model creation and methods"""
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Broken AC",
            description="The AC unit is not working",
            priority=PriorityLevel.HIGH,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        self.assertEqual(str(request), "Broken AC - Main Office")
        self.assertEqual(request.priority, PriorityLevel.HIGH)
        self.assertEqual(request.status, MaintenanceStatus.REQUESTED)
        self.assertIsNone(request.assigned_to)
        self.assertIsNone(request.started_at)
        self.assertIsNone(request.completed_at)

    def test_asset_creation(self):
        """Test asset model creation and methods"""
        asset_type = AssetType.objects.create(
            tenant=self.tenant,
            name="Air Conditioner",
            description="HVAC unit",
            requires_maintenance=True,
            maintenance_interval_days=30
        )
        
        asset = Asset.objects.create(
            tenant=self.tenant,
            name="Main AC Unit",
            description="Primary AC unit",
            asset_type=asset_type,
            location=self.location,
            serial_number="AC123456",
            manufacturer="Carrier",
            model="XYZ-1000"
        )
        
        self.assertEqual(str(asset), "Main AC Unit - Main Office")
        self.assertEqual(asset.status, AssetStatus.OPERATIONAL)
        self.assertIsNotNone(asset.qr_code)  # QR code should be auto-generated
        self.assertIsNone(asset.last_maintenance_date)

    def test_vendor_creation(self):
        """Test vendor model creation and methods"""
        vendor = Vendor.objects.create(
            tenant=self.tenant,
            name="Test Vendor",
            contact_person="John Doe",
            phone="1234567890",
            email="vendor@example.com",
            company="Test Company"
        )
        vendor.specialties.add(self.category)
        
        self.assertEqual(str(vendor), "Test Vendor - Test Company")
        self.assertFalse(vendor.insurance_verified)
        self.assertEqual(vendor.specialties.count(), 1)

    def test_cost_center_creation(self):
        """Test cost center model creation and methods"""
        cost_center = CostCenter.objects.create(
            tenant=self.tenant,
            name="IT Department",
            code="IT001",
            description="IT operations",
            budget_limit=10000.00,
            manager=self.host
        )
        
        self.assertEqual(str(cost_center), "IT001 - IT Department")
        self.assertEqual(cost_center.current_spend, 0)
        self.assertEqual(cost_center.manager, self.host)

    def test_maintenance_expense_creation(self):
        """Test maintenance expense model creation"""
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host
        )
        
        cost_center = CostCenter.objects.create(
            tenant=self.tenant,
            name="IT Department",
            code="IT001"
        )
        
        expense = MaintenanceExpense.objects.create(
            maintenance_request=request,
            cost_center=cost_center,
            expense_type='LABOR',
            description="Repair work",
            amount=500.00
        )
        
        self.assertEqual(str(expense), "LABOR: 500.00 for Test Request")
        self.assertEqual(expense.expense_type, 'LABOR')
        self.assertEqual(expense.amount, 500.00)


class PropertyManagementServiceTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St"
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Test Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.user
        )
        
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="Plumbing",
            description="Plumbing issues"
        )

    @patch('property_management.views.qrcode.QRCode')
    def test_qr_code_generation(self, mock_qrcode):
        """Test QR code generation for assets"""
        from property_management.views import AssetViewSet
        
        asset_type = AssetType.objects.create(
            tenant=self.tenant,
            name="Test Equipment",
            description="Test equipment"
        )
        
        asset = Asset.objects.create(
            tenant=self.tenant,
            name="Test Asset",
            description="Test description",
            asset_type=asset_type,
            location=self.location,
            qr_code="test-qr-value"
        )
        
        # Mock QR code generation
        mock_qr_instance = MagicMock()
        mock_qrcode.return_value = mock_qr_instance
        mock_img = MagicMock()
        mock_qr_instance.make_image.return_value = mock_img
        
        # Test QR code generation endpoint
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        response = client.get(f'/api/property-management/assets/{asset.id}/qr_code/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify QR code was generated
        mock_qrcode.assert_called_once()

    def test_work_order_total_calculation(self):
        """Test work order total cost calculation"""
        from property_management.models import WorkOrder, Vendor
        
        vendor = Vendor.objects.create(
            tenant=self.tenant,
            name="Test Vendor",
            contact_person="John Doe",
            phone="1234567890",
            email="vendor@example.com"
        )
        
        request = MaintenanceRequest.objects.create(
            tenant=self.tenant,
            title="Test Request",
            description="Test",
            priority=PriorityLevel.MEDIUM,
            category=self.category,
            location=self.location,
            host=self.host,
            assigned_to=vendor
        )
        
        work_order = WorkOrder.objects.create(
            maintenance_request=request,
            vendor=vendor,
            work_order_number="WO-001",
            instructions="Test instructions",
            labor_cost=300.00,
            material_cost=200.00
        )
        
        self.assertEqual(work_order.total_cost, 500.00)
        
        # Test updating costs
        work_order.labor_cost = 400.00
        work_order.save()
        self.assertEqual(work_order.total_cost, 600.00)


class PropertyManagementIntegrationTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Test Company",
            domain="test.com",
            subdomain="test",
            billing_email="billing@test.com"
        )
        
        self.location = Location.objects.create(
            tenant=self.tenant,
            name="Main Office",
            address="123 Test St"
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.host = Host.objects.create(
            tenant=self.tenant,
            name="Test Host",
            email="host@example.com",
            department="IT",
            location=self.location,
            user=self.user
        )
        
        self.category = MaintenanceCategory.objects.create(
            tenant=self.tenant,
            name="Electrical",
            description="Electrical issues"
        )

    def test_maintenance_request_workflow(self):
        """Test complete maintenance request workflow"""
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # 1. Create maintenance request
        data = {
            'title': 'Power Outage',
            description: 'Power is out in section B',
            'priority': 'EMERGENCY',
            'category': self.category.id,
            'location': self.location.id
        }
        
        response = client.post('/api/property-management/requests/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        request_id = response.data['id']
        
        # 2. Update status to in progress
        response = client.post(
            f'/api/property-management/requests/{request_id}/update_status/',
            {'status': 'IN_PROGRESS'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Complete the request
        response = client.post(
            f'/api/property-management/requests/{request_id}/update_status/',
            {'status': 'COMPLETED'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify final state
        request = MaintenanceRequest.objects.get(id=request_id)
        self.assertEqual(request.status, MaintenanceStatus.COMPLETED)
        self.assertIsNotNone(request.completed_at)

    def test_asset_lifecycle(self):
        """Test complete asset lifecycle"""
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        # 1. Create asset type
        asset_type = AssetType.objects.create(
            tenant=self.tenant,
            name="Computer",
            description="Desktop computer",
            requires_maintenance=True,
            maintenance_interval_days=90
        )
        
        # 2. Create asset
        data = {
            'name': 'Main Desktop',
            'description': 'Primary workstation',
            'asset_type': asset_type.id,
            'location': self.location.id,
            'serial_number': 'PC123456'
        }
        
        response = client.post('/api/property-management/assets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        asset_id = response.data['id']
        
        # 3. Checkout asset
        expected_return = (timezone.now() + timedelta(days=7)).isoformat()
        response = client.post(
            f'/api/property-management/assets/{asset_id}/checkout/',
            {
                'expected_return_at': expected_return,
                'notes': 'Test checkout',
                'condition': 'Good condition'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Check in asset
        response = client.post(
            f'/api/property-management/assets/{asset_id}/checkin/',
            {'condition': 'Returned in good condition'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify final state
        asset = Asset.objects.get(id=asset_id)
        self.assertEqual(asset.status, AssetStatus.OPERATIONAL)
        self.assertEqual(asset.checkouts.count(), 1)
        self.assertIsNotNone(asset.checkouts.first().actual_return_at)


# Pytest fixtures for easier testing
@pytest.fixture
def tenant():
    return Tenant.objects.create(
        name="Test Company",
        domain="test.com",
        subdomain="test",
        billing_email="billing@test.com"
    )


@pytest.fixture
def location(tenant):
    return Location.objects.create(
        tenant=tenant,
        name="Main Office",
        address="123 Test St"
    )


@pytest.fixture
def user():
    return User.objects.create_user(
        username='testuser',
        password='testpass123',
        email='test@example.com'
    )


@pytest.fixture
def host(tenant, location, user):
    return Host.objects.create(
        tenant=tenant,
        name="Test Host",
        email="host@example.com",
        department="IT",
        location=location,
        user=user
    )


@pytest.fixture
def maintenance_category(tenant):
    return MaintenanceCategory.objects.create(
        tenant=tenant,
        name="Plumbing",
        description="Plumbing issues"
    )


@pytest.fixture
def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestPropertyManagementWithFixtures:
        def test_create_request_with_fixture(self, authenticated_client, tenant, location, host, maintenance_category):
            """Test creating maintenance request using pytest fixtures"""
            data = {
                'title': 'Test Request',
                'description': 'Test description',
                'priority': 'MEDIUM',
                'category': maintenance_category.id,
                'location': location.id
            }
            
            response = authenticated_client.post('/api/property-management/requests/', data)
            assert response.status_code == status.HTTP_201_CREATED
            
            request = MaintenanceRequest.objects.get(id=response.data['id'])
            assert request.title == 'Test Request'
            assert request.host == host
            assert request.location == location
