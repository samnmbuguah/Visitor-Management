# Property Management Module Documentation

## Overview

The Property Management module extends the visitor management system with comprehensive facilities maintenance, asset tracking, and vendor management capabilities. This module is designed for multi-tenant environments and provides end-to-end property management functionality.

## Architecture

### Module Structure
```
property_management/
├── models.py              # Core data models
├── serializers.py         # API serializers
├── views.py              # API viewsets and endpoints
├── urls.py               # URL routing
├── admin.py              # Django admin configuration
├── tests.py              # Test suite
├── management/
│   └── commands/
│       └── seed_property_management_data.py  # Data seeding
└── migrations/           # Database migrations
```

### Key Components

#### Models
- **MaintenanceCategory**: Categories for organizing maintenance requests
- **Vendor**: External service providers and contractors
- **MaintenanceRequest**: Core maintenance request tracking
- **WorkOrder**: Detailed work orders with cost tracking
- **Asset**: Physical assets with QR code tracking
- **AssetType**: Asset classifications with maintenance schedules
- **MaintenanceSchedule**: Preventive maintenance planning
- **CostCenter**: Expense tracking and budget management

#### API Endpoints
- `/api/property-management/requests/` - Maintenance request CRUD
- `/api/property-management/assets/` - Asset management
- `/api/property-management/vendors/` - Vendor management
- `/api/property-management/categories/` - Category management
- `/api/property-management/dashboard/` - Analytics and reporting

## Features

### 1. Maintenance Request Management

#### Request Lifecycle
1. **Request Creation**: Users submit maintenance requests with photos
2. **Assignment**: System or manual assignment to qualified vendors
3. **Work Order Generation**: Detailed work orders with cost estimates
4. **Progress Tracking**: Real-time status updates and communication
5. **Completion**: Final approval, payment processing, and feedback

#### Priority Levels
- **EMERGENCY**: Safety-critical issues requiring immediate attention
- **HIGH**: Urgent issues affecting operations
- **MEDIUM**: Routine maintenance and repairs
- **LOW**: Non-urgent improvements and cosmetic issues

#### Status Tracking
- **REQUESTED**: Initial submission awaiting review
- **ASSIGNED**: Vendor assigned and scheduled
- **IN_PROGRESS**: Work actively being performed
- **COMPLETED**: Work finished and approved
- **CANCELLED**: Request cancelled or resolved
- **ON_HOLD**: Work paused (parts, access, etc.)

### 2. Asset Management

#### Asset Lifecycle
1. **Asset Registration**: Physical assets with QR codes
2. **Maintenance Scheduling**: Preventive maintenance planning
3. **Tracking**: Location, status, and condition monitoring
4. **Check-out/Check-in**: Asset lending and temporary assignments
5. **Retirement**: End-of-life disposal and replacement

#### Asset Features
- **QR Code Generation**: Automatic QR code creation for asset identification
- **Maintenance Schedules**: Automated preventive maintenance reminders
- **Location Tracking**: Physical location and detailed positioning
- **Warranty Management**: Purchase date, warranty expiry tracking
- **Cost Tracking**: Total cost of ownership and maintenance expenses

### 3. Vendor Management

#### Vendor Qualification
- **Insurance Verification**: Automated insurance expiry tracking
- **Specialty Matching**: Category-based vendor assignment
- **Performance Ratings**: Quality and reliability scoring
- **Contact Management**: Complete vendor contact information

#### Vendor Features
- **Multi-specialty Support**: Vendors can serve multiple categories
- **Insurance Tracking**: Automated expiry notifications
- **Performance Metrics**: Completion rates and quality scores
- **Cost Analysis**: Pricing trends and vendor comparisons

### 4. Cost Center Management

#### Expense Tracking
- **Budget Management**: Departmental budget limits and tracking
- **Expense Categorization**: Labor, materials, equipment, permits
- **Cost Allocation**: Automatic expense assignment to cost centers
- **Reporting**: Detailed expense reports and analysis

#### Cost Center Features
- **Hierarchical Structure**: Multi-level cost center organization
- **Budget Controls**: Automatic alerts for budget overruns
- **Expense Analytics**: Trend analysis and forecasting
- **Integration**: Seamless integration with work orders

## API Reference

### Authentication
All endpoints require JWT authentication:
```http
Authorization: Bearer <jwt-token>
```

### Maintenance Requests

#### Create Request
```http
POST /api/property-management/requests/
Content-Type: application/json

{
  "title": "Broken AC Unit",
  "description": "Main conference room AC not cooling",
  "priority": "HIGH",
  "category": 1,
  "location": 1,
  "photo_data": ["base64-image-data"]
}
```

#### Update Status
```http
POST /api/property-management/requests/{id}/update_status/
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

#### Assign Vendor
```http
POST /api/property-management/requests/{id}/assign_vendor/
Content-Type: application/json

{
  "vendor_id": 1
}
```

### Assets

#### Create Asset
```http
POST /api/property-management/assets/
Content-Type: application/json

{
  "name": "Conference Room AC",
  "description": "Primary cooling unit",
  "asset_type": 1,
  "location": 1,
  "serial_number": "AC-2024-001",
  "manufacturer": "Carrier",
  "model": "XRV-2400"
}
```

#### Generate QR Code
```http
GET /api/property-management/assets/{id}/qr_code/
```

#### Checkout Asset
```http
POST /api/property-management/assets/{id}/checkout/
Content-Type: application/json

{
  "expected_return_at": "2024-01-20T17:00:00Z",
  "notes": "Temporary loan",
  "condition": "Good working condition"
}
```

### Vendors

#### Create Vendor
```http
POST /api/property-management/vendors/
Content-Type: application/json

{
  "name": "HVAC Professionals",
  "contact_person": "Mike Smith",
  "phone": "+1-555-0123",
  "email": "mike@hvacpros.com",
  "specialty_ids": [1, 2],
  "insurance_verified": false
}
```

#### Verify Insurance
```http
POST /api/property-management/vendors/{id}/verify_insurance/
Content-Type: application/json

{
  "expiry_date": "2024-12-31"
}
```

## Dashboard Analytics

### Overview Endpoint
```http
GET /api/property-management/dashboard/overview/
```

**Response:**
```json
{
  "maintenance_stats": {
    "total": 45,
    "emergency": 2,
    "in_progress": 8,
    "completed_this_month": 12
  },
  "asset_stats": {
    "total": 150,
    "operational": 135,
    "under_maintenance": 8,
    "maintenance_due": 7
  },
  "upcoming_schedules": 5
}
```

### Maintenance Trends
```http
GET /api/property-management/dashboard/maintenance_trends/
```

### Vendor Performance
```http
GET /api/property-management/dashboard/vendor_performance/
```

## Mobile Integration

### React Native Components

#### MaintenanceScreen
- **Location**: `mobile-admin/app/(tabs)/maintenance.tsx`
- **Features**: Request creation, status updates, photo uploads
- **API Integration**: Full CRUD operations for maintenance requests

#### AssetsScreen
- **Location**: `mobile-admin/app/(tabs)/assets.tsx`
- **Features**: Asset viewing, QR code scanning, checkout management
- **Offline Support**: Local caching for offline operation

### Web Components

#### MaintenancePage
- **Location**: `frontend/app/admin/maintenance/page.tsx`
- **Features**: Comprehensive request management dashboard
- **Real-time Updates**: WebSocket integration for live updates

#### AssetsPage
- **Location**: `frontend/app/admin/assets/page.tsx`
- **Features**: Asset inventory, maintenance scheduling, cost tracking
- **Advanced Filtering**: Multi-criteria search and filtering

## Data Seeding

### Comprehensive Seeding
```bash
python manage.py seed_property_management_data
```

### Seeding Options
```bash
# Clear existing data
python manage.py seed_property_management_data --clear

# Custom tenant count
python manage.py seed_property_management_data --tenants 5

# Custom location count
python manage.py seed_property_management_data --locations 10

# Custom request count
python manage.py seed_property_management_data --requests 50
```

### Generated Data
- **Tenants**: Multi-tenant organizations with different tiers
- **Locations**: Various facility types (offices, warehouses, etc.)
- **Users**: Different roles (admin, manager, host, kiosk)
- **Categories**: Comprehensive maintenance categories
- **Vendors**: Qualified service providers with specialties
- **Assets**: Physical assets with maintenance history
- **Requests**: Realistic maintenance requests with photos
- **Work Orders**: Detailed work orders with cost tracking
- **Cost Centers**: Departmental budget tracking

## Testing

### Test Coverage
- **Unit Tests**: Model validation and business logic
- **Integration Tests**: API endpoints and workflows
- **Mobile Tests**: React Native component testing
- **Frontend Tests**: Web component testing

### Running Tests
```bash
# Backend tests
python manage.py test property_management.tests

# Mobile tests
cd mobile-admin && npm test

# Frontend tests
cd frontend && npm test
```

### Test Data
- **Fixtures**: Comprehensive test data fixtures
- **Factories**: Model factories for dynamic test data
- **Mocks**: API mocking for isolated testing

## Configuration

### Settings
```python
# Add to INSTALLED_APPS
INSTALLED_APPS = [
    ...
    'property_management',
]

# URL routing
urlpatterns = [
    ...
    path('api/property-management/', include('property_management.urls')),
]
```

### Environment Variables
```env
# QR Code settings
QR_CODE_BASE_URL=https://your-domain.com/assets/

# Notification settings
MAINTENANCE_NOTIFICATION_EMAIL_ENABLED=True
MAINTENANCE_NOTIFICATION_SMS_ENABLED=False

# File upload settings
MAX_PHOTO_SIZE=5MB
ALLOWED_PHOTO_FORMATS=jpg,jpeg,png
```

## Security

### Permissions
- **IsOwnerOrReadOnly**: Custom permission for request ownership
- **Role-based Access**: Different access levels for different user roles
- **Tenant Isolation**: Complete data separation between tenants

### Data Protection
- **Photo Storage**: Base64 encoding for secure photo storage
- **Audit Logging**: Complete audit trail for all operations
- **Access Control**: Granular permissions for sensitive operations

## Performance

### Optimization
- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Redis caching for frequently accessed data
- **Pagination**: Efficient pagination for large result sets
- **Bulk Operations**: Optimized bulk create/update operations

### Monitoring
- **API Metrics**: Response time and error rate monitoring
- **Database Performance**: Query optimization and monitoring
- **Resource Usage**: Memory and CPU usage tracking

## Troubleshooting

### Common Issues

#### QR Code Generation
```python
# Ensure qrcode package is installed
pip install qrcode[pil]

# Check QR code settings
QR_CODE_BASE_URL must be configured
```

#### Photo Upload
```python
# Check file size limits
MAX_PHOTO_SIZE in settings

# Verify allowed formats
ALLOWED_PHOTO_FORMATS configuration
```

#### Vendor Assignment
```python
# Ensure vendor specialties match request categories
vendor.specialties.all() should include request.category

# Check vendor availability
vendor.is_active must be True
```

### Debug Mode
```python
# Enable debug logging
LOG_LEVEL = DEBUG

# Database query logging
DEBUG = True
```

## Future Enhancements

### Planned Features
- **Predictive Maintenance**: AI-powered maintenance prediction
- **Mobile Offline Mode**: Enhanced offline capabilities
- **Advanced Analytics**: Machine learning insights
- **Integration APIs**: Third-party system integrations
- **Mobile Work Orders**: Vendor mobile app for work order management

### Scalability
- **Microservices**: Service decomposition for better scalability
- **Event Streaming**: Real-time event processing
- **Load Balancing**: Horizontal scaling capabilities
- **Database Sharding**: Multi-database architecture

## Support

### Documentation
- **API Documentation**: Complete API reference
- **User Guides**: Step-by-step user instructions
- **Developer Guide**: Development and integration guide

### Getting Help
- **Issues**: GitHub issue tracking
- **Discussions**: Community discussions and Q&A
- **Support Email**: Direct support contact

---

**Property Management Module v1.0**
*Comprehensive facilities maintenance and asset tracking solution*
