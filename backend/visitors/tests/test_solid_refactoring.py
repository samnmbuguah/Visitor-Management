from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import Mock, patch
from ..models import Visitor, Host, Location, UserProfile, VisitorType
from ..services.visitor_service import VisitorService
from ..services.rbac_service import RBACService
from ..repositories.visitor_repository import VisitorRepository
from ..factories.visitor_factory import VisitorFactory
from ..validators.visitor_validator import VisitorValidator
from ..strategies.notification_strategy import NotificationStrategy, EmailNotificationStrategy


class TestVisitorRepository(TestCase):
    """Test VisitorRepository following SRP."""
    
    def setUp(self):
        self.repository = VisitorRepository()
        self.location = Location.objects.create(name="Test Location", floor="1")
        self.host = Host.objects.create(name="Test Host", email="host@test.com", location=self.location)
        self.visitor_type = VisitorType.objects.create(name="Business Meeting")
        
    def test_get_by_id_exists(self):
        visitor = Visitor.objects.create(
            name="Test Visitor",
            email="test@test.com",
            host=self.host,
            location=self.location
        )
        result = self.repository.get_by_id(visitor.id)
        self.assertEqual(result.id, visitor.id)
        
    def test_get_by_id_not_exists(self):
        result = self.repository.get_by_id(999)
        self.assertIsNone(result)
        
    def test_create_visitor(self):
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'host': self.host,
            'location': self.location
        }
        visitor = self.repository.create(data)
        self.assertEqual(visitor.name, 'Test Visitor')
        self.assertEqual(visitor.email, 'test@test.com')
        
    def test_get_active_visitors(self):
        # Create active visitor
        Visitor.objects.create(
            name="Active Visitor",
            email="active@test.com",
            host=self.host,
            location=self.location,
            status='CHECKED_IN'
        )
        # Create checked out visitor
        Visitor.objects.create(
            name="Checked Out Visitor",
            email="checkout@test.com",
            host=self.host,
            location=self.location,
            status='CHECKED_OUT'
        )
        
        active_visitors = self.repository.get_active_visitors()
        self.assertEqual(len(active_visitors), 1)
        self.assertEqual(active_visitors[0].name, "Active Visitor")


class TestRBACService(TestCase):
    """Test RBACService following SRP."""
    
    def setUp(self):
        self.rbac_service = RBACService()
        self.location = Location.objects.create(name="Test Location", floor="1")
        
        # Create users with different roles
        self.super_admin_user = User.objects.create_user("superadmin", "super@test.com", "pass")
        self.super_admin_profile = UserProfile.objects.create(
            user=self.super_admin_user, role='SUPER_ADMIN'
        )
        
        self.admin_user = User.objects.create_user("admin", "admin@test.com", "pass")
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user, role='ADMIN', location=self.location
        )
        
        self.host_user = User.objects.create_user("host", "host@test.com", "pass")
        self.host_profile = UserProfile.objects.create(
            user=self.host_user, role='HOST', location=self.location
        )
        self.host_record = Host.objects.create(
            name="Test Host", email="host@test.com", 
            user=self.host_user, location=self.location
        )
        
        self.other_host = Host.objects.create(
            name="Other Host", email="other@test.com", location=self.location
        )
        
        self.visitor = Visitor.objects.create(
            name="Test Visitor",
            email="test@test.com",
            host=self.host_record,
            location=self.location,
            status='PENDING'
        )
        
    def test_super_admin_can_approve_any_visitor(self):
        can_approve, reason = self.rbac_service.can_user_approve_visitor(
            self.super_admin_user, self.visitor
        )
        self.assertTrue(can_approve)
        self.assertEqual(reason, "")
        
    def test_admin_can_approve_visitor_in_location(self):
        can_approve, reason = self.rbac_service.can_user_approve_visitor(
            self.admin_user, self.visitor
        )
        self.assertTrue(can_approve)
        self.assertEqual(reason, "")
        
    def test_admin_cannot_approve_visitor_outside_location(self):
        other_location = Location.objects.create(name="Other Location", floor="2")
        visitor_other_location = Visitor.objects.create(
            name="Other Location Visitor",
            email="other@test.com",
            host=self.other_host,
            location=other_location,
            status='PENDING'
        )
        
        can_approve, reason = self.rbac_service.can_user_approve_visitor(
            self.admin_user, visitor_other_location
        )
        self.assertFalse(can_approve)
        self.assertIn("outside your location", reason)
        
    def test_host_can_approve_own_visitor(self):
        can_approve, reason = self.rbac_service.can_user_approve_visitor(
            self.host_user, self.visitor
        )
        self.assertTrue(can_approve)
        self.assertEqual(reason, "")
        
    def test_host_cannot_approve_others_visitor(self):
        other_visitor = Visitor.objects.create(
            name="Other Visitor",
            email="other@test.com",
            host=self.other_host,
            location=self.location,
            status='PENDING'
        )
        
        can_approve, reason = self.rbac_service.can_user_approve_visitor(
            self.host_user, other_visitor
        )
        self.assertFalse(can_approve)
        self.assertIn("assigned to another host", reason)


class TestVisitorService(TestCase):
    """Test VisitorService following SRP and DIP."""
    
    def setUp(self):
        self.mock_repository = Mock(spec=VisitorRepository)
        self.mock_rbac_service = Mock()
        self.mock_notification_service = Mock()
        
        self.visitor_service = VisitorService(
            repository=self.mock_repository
        )
        self.visitor_service.rbac_service = self.mock_rbac_service
        self.visitor_service.notification_service = self.mock_notification_service
        
        self.location = Location.objects.create(name="Test Location", floor="1")
        self.host = Host.objects.create(name="Test Host", email="host@test.com", location=self.location)
        
    def test_approve_visitor_success(self):
        # Setup
        visitor = Visitor(
            id=1,
            name="Test Visitor",
            email="test@test.com",
            host=self.host,
            location=self.location,
            status='PENDING'
        )
        
        user = Mock()
        user.profile.role = 'HOST'
        user.host_profile = self.host
        
        self.mock_repository.get_by_id.return_value = visitor
        self.mock_rbac_service.can_user_approve_visitor.return_value = (True, "")
        self.mock_repository.update.return_value = visitor
        
        # Execute
        result, error = self.visitor_service.approve_visitor(user, 1)
        
        # Assert
        self.assertEqual(result, visitor)
        self.assertEqual(error, "")
        self.mock_rbac_service.can_user_approve_visitor.assert_called_once_with(user, visitor)
        self.mock_repository.update.assert_called_once_with(1, {'status': 'CHECKED_IN'})
        
    def test_approve_visitor_rbac_denied(self):
        # Setup
        visitor = Visitor(
            id=1,
            name="Test Visitor",
            email="test@test.com",
            host=self.host,
            location=self.location,
            status='PENDING'
        )
        
        user = Mock()
        
        self.mock_repository.get_by_id.return_value = visitor
        self.mock_rbac_service.can_user_approve_visitor.return_value = (False, "Permission denied")
        
        # Execute
        result, error = self.visitor_service.approve_visitor(user, 1)
        
        # Assert
        self.assertIsNone(result)
        self.assertEqual(error, "Permission denied")
        self.mock_rbac_service.can_user_approve_visitor.assert_called_once_with(user, visitor)
        self.mock_repository.update.assert_not_called()


class TestVisitorFactory(TestCase):
    """Test VisitorFactory following Factory Pattern."""
    
    def setUp(self):
        self.location = Location.objects.create(name="Test Location", floor="1")
        self.host = Host.objects.create(name="Test Host", email="host@test.com", location=self.location)
        self.visitor_type = VisitorType.objects.create(name="Business Meeting")
        
    def test_create_manual_registration(self):
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'phone': '1234567890',
            'company': 'Test Company',
            'purpose': 'Meeting',
            'visitor_type': self.visitor_type.id,
            'expected_duration': 60
        }
        
        result = VisitorFactory.create_manual_registration(data, self.host, self.location)
        
        self.assertEqual(result['name'], 'Test Visitor')
        self.assertEqual(result['email'], 'test@test.com')
        self.assertEqual(result['host'], self.host)
        self.assertEqual(result['location'], self.location)
        self.assertEqual(result['status'], 'PENDING')


class TestVisitorValidator(TestCase):
    """Test VisitorValidator following SRP."""
    
    def test_validate_visitor_data_success(self):
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'phone': '1234567890',
            'expected_duration': 60
        }
        
        errors = VisitorValidator.validate_visitor_data(data)
        self.assertEqual(len(errors), 0)
        
    def test_validate_visitor_data_missing_required(self):
        data = {
            'email': 'test@test.com'
        }
        
        errors = VisitorValidator.validate_visitor_data(data)
        self.assertIn('name is required', errors)
        
    def test_validate_visitor_data_invalid_email(self):
        data = {
            'name': 'Test Visitor',
            'email': 'invalid-email'
        }
        
        errors = VisitorValidator.validate_visitor_data(data)
        self.assertIn('Invalid email format', errors)
        
    def test_validate_complete_visitor_data(self):
        # Setup
        location = Location.objects.create(name="Test Location", floor="1")
        host = Host.objects.create(name="Test Host", email="host@test.com", location=location)
        visitor_type = VisitorType.objects.create(name="Business Meeting")
        
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'host': host.id,
            'location': location.id,
            'visitor_type': visitor_type.id
        }
        
        errors = VisitorValidator.validate_complete_visitor_data(data)
        self.assertEqual(len(errors), 0)


class TestNotificationStrategy(TestCase):
    """Test NotificationStrategy following Strategy Pattern."""
    
    def test_email_notification_strategy(self):
        strategy = EmailNotificationStrategy()
        
        with patch('django.core.mail.send_mail') as mock_send_mail:
            result = strategy.send(
                recipient='test@test.com',
                message='Test message',
                context={'subject': 'Test Subject'}
            )
            
            self.assertTrue(result)
            mock_send_mail.assert_called_once()
            
    def test_notification_factory(self):
        from ..strategies.notification_strategy import NotificationFactory
        
        email_strategy = NotificationFactory.create_strategy('email')
        sms_strategy = NotificationFactory.create_strategy('sms')
        
        self.assertIsInstance(email_strategy, EmailNotificationStrategy)
        self.assertTrue(hasattr(sms_strategy, 'send'))
        
        with self.assertRaises(ValueError):
            NotificationFactory.create_strategy('invalid')


class TestSOLIDIntegration(TestCase):
    """Integration tests for SOLID refactored components."""
    
    def setUp(self):
        self.location = Location.objects.create(name="Test Location", floor="1")
        self.host = Host.objects.create(name="Test Host", email="host@test.com", location=self.location)
        self.visitor_type = VisitorType.objects.create(name="Business Meeting")
        
        # Create user with host profile
        self.user = User.objects.create_user("testuser", "test@test.com", "pass")
        self.profile = UserProfile.objects.create(user=self.user, role='HOST', location=self.location)
        self.user.host_profile = self.host
        
    def test_complete_visitor_approval_flow(self):
        """Test complete visitor approval flow using refactored components."""
        # Setup
        repository = VisitorRepository()
        rbac_service = RBACService()
        visitor_service = VisitorService(repository)
        
        # Create visitor
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'host': self.host,
            'location': self.location,
            'status': 'PENDING'
        }
        
        visitor = repository.create(data)
        self.assertEqual(visitor.status, 'PENDING')
        
        # Approve visitor
        approved_visitor, error = visitor_service.approve_visitor(self.user, visitor.id)
        
        self.assertIsNotNone(approved_visitor)
        self.assertEqual(error, "")
        self.assertEqual(approved_visitor.status, 'CHECKED_IN')
        
    def test_validation_service_integration(self):
        """Test validation integration with factory."""
        data = {
            'name': 'Test Visitor',
            'email': 'test@test.com',
            'host': self.host.id,
            'location': self.location.id,
            'visitor_type': self.visitor_type.id
        }
        
        # Validate data
        errors = VisitorValidator.validate_complete_visitor_data(data)
        self.assertEqual(len(errors), 0)
        
        # Create visitor using factory
        visitor_data = VisitorFactory.create_manual_registration(data, self.host, self.location)
        
        # Validate created data
        errors = VisitorValidator.validate_visitor_data(visitor_data)
        self.assertEqual(len(errors), 0)
