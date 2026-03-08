# Visitor Management API Documentation

## Overview

The Visitor Management System provides comprehensive RESTful APIs for visitor management, property management, and administrative functions. All APIs use JWT authentication and follow RESTful conventions.

## Base URLs

- **Development**: `http://localhost:8001/api/`
- **Production**: `https://your-domain.com/api/`

## Authentication

All API endpoints require JWT authentication (except login/register).

### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "user@example.com",
    "role": "HOST",
    "location": {
      "id": 1,
      "name": "Main Office"
    }
  }
}
```

### Using Tokens
Include the access token in the Authorization header:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Visitor Management APIs

### Locations

#### Get All Locations
```http
GET /api/visitors/locations/
```

**Response:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Main Office",
      "address": "123 Main St, City, State",
      "floor": "5th Floor",
      "timezone": "America/New_York",
      "is_active": true,
      "require_visitor_approval": false,
      "require_nda": false
    }
  ]
}
```

#### Create Location
```http
POST /api/visitors/locations/
Content-Type: application/json

{
  "name": "Branch Office",
  "address": "456 Oak Ave, City, State",
  "floor": "2nd Floor",
  "timezone": "America/New_York",
  "require_visitor_approval": true,
  "require_nda": false
}
```

### Hosts

#### Get All Hosts
```http
GET /api/visitors/hosts/
```

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@company.com",
      "department": "Engineering",
      "phone": "+1-555-0123",
      "location": {
        "id": 1,
        "name": "Main Office"
      },
      "is_active": true,
      "receive_notifications": true
    }
  ]
}
```

#### Create Host
```http
POST /api/visitors/hosts/
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane.smith@company.com",
  "department": "Marketing",
  "phone": "+1-555-0456",
  "location": 1,
  "receive_notifications": true
}
```

### Visitors

#### Get All Visitors
```http
GET /api/visitors/visitors/
```

**Query Parameters:**
- `status`: Filter by status (CHECKED_IN, CHECKED_OUT, PENDING, REJECTED)
- `location`: Filter by location ID
- `host`: Filter by host ID
- `date`: Filter by date (YYYY-MM-DD)
- `search`: Search by name, email, or company

**Response:**
```json
{
  "count": 25,
  "next": "http://localhost:8001/api/visitors/visitors/?page=2",
  "results": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "email": "alice@client.com",
      "phone": "+1-555-0789",
      "company": "Client Corp",
      "purpose": "Business Meeting",
      "host": {
        "id": 1,
        "name": "John Doe"
      },
      "location": {
        "id": 1,
        "name": "Main Office"
      },
      "status": "CHECKED_IN",
      "checkin_time": "2024-01-15T09:30:00Z",
      "checkout_time": null,
      "expected_duration": 60,
      "badge_number": "B001",
      "photo": "base64-encoded-image-data"
    }
  ]
}
```

#### Check In Visitor
```http
POST /api/visitors/visitors/checkin/
Content-Type: application/json

{
  "name": "Bob Wilson",
  "email": "bob@vendor.com",
  "phone": "+1-555-0321",
  "company": "Vendor Inc",
  "purpose": "Equipment Installation",
  "host": 1,
  "location": 1,
  "expected_duration": 120,
  "photo": "base64-encoded-photo-data",
  "signature": "base64-encoded-signature-data"
}
```

#### Check Out Visitor
```http
POST /api/visitors/visitors/{id}/checkout/
```

### Pre-registrations

#### Get Pre-registrations
```http
GET /api/visitors/pre-registrations/
```

#### Create Pre-registration
```http
POST /api/visitors/pre-registrations/
Content-Type: application/json

{
  "visitor_name": "Carol Davis",
  "visitor_email": "carol@partner.com",
  "visitor_phone": "+1-555-0654",
  "visitor_company": "Partner LLC",
  "host": 1,
  "location": 1,
  "expected_arrival": "2024-01-20T14:00:00Z",
  "expected_duration": 60,
  "purpose": "Partner Meeting"
}
```

## Property Management APIs

### Maintenance Categories

#### Get Categories
```http
GET /api/property-management/categories/
```

**Response:**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "name": "HVAC",
      "description": "Heating, ventilation, and air conditioning",
      "is_active": true
    },
    {
      "id": 2,
      "name": "Plumbing",
      "description": "Plumbing fixtures and pipes",
      "is_active": true
    }
  ]
}
```

### Maintenance Requests

#### Get Maintenance Requests
```http
GET /api/property-management/requests/
```

**Query Parameters:**
- `status`: REQUESTED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
- `priority`: EMERGENCY, HIGH, MEDIUM, LOW
- `location`: Location ID
- `category`: Category ID
- `assigned_to`: Vendor ID

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "id": 1,
      "title": "Broken AC Unit",
      "description": "Main conference room AC not cooling",
      "priority": "HIGH",
      "status": "ASSIGNED",
      "location": {
        "id": 1,
        "name": "Main Office"
      },
      "category": {
        "id": 1,
        "name": "HVAC"
      },
      "host": {
        "id": 1,
        "name": "John Doe"
      },
      "assigned_to": {
        "id": 1,
        "name": "HVAC Pros",
        "contact_person": "Mike Smith"
      },
      "requested_at": "2024-01-15T10:30:00Z",
      "assigned_at": "2024-01-15T11:00:00Z",
      "estimated_cost": "500.00",
      "actual_cost": null,
      "photos": [
        {
          "id": 1,
          "photo": "base64-image-data",
          "caption": "Broken AC unit",
          "is_before_photo": true
        }
      ]
    }
  ]
}
```

#### Create Maintenance Request
```http
POST /api/property-management/requests/
Content-Type: application/json

{
  "title": "Leaky Faucet",
  "description": "Kitchen sink faucet dripping continuously",
  "priority": "MEDIUM",
  "category": 2,
  "location": 1,
  "photo_data": ["base64-image-1", "base64-image-2"]
}
```

#### Update Request Status
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

#### Add Photo
```http
POST /api/property-management/requests/{id}/add_photo/
Content-Type: application/json

{
  "photo": "base64-image-data",
  "caption": "Work in progress",
  "is_before_photo": false
}
```

### Vendors

#### Get Vendors
```http
GET /api/property-management/vendors/
```

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "name": "HVAC Pros",
      "contact_person": "Mike Smith",
      "phone": "+1-555-0123",
      "email": "mike@hvacpros.com",
      "company": "HVAC Professionals Inc",
      "specialties": [
        {
          "id": 1,
          "name": "HVAC"
        }
      ],
      "is_active": true,
      "insurance_verified": true,
      "insurance_expiry": "2024-12-31",
      "rating": "4.5"
    }
  ]
}
```

#### Create Vendor
```http
POST /api/property-management/vendors/
Content-Type: application/json

{
  "name": "Plumbing Experts",
  "contact_person": "Sarah Johnson",
  "phone": "+1-555-0456",
  "email": "sarah@plumbingexperts.com",
  "company": "Plumbing Experts LLC",
  "specialty_ids": [2],
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

### Assets

#### Get Assets
```http
GET /api/property-management/assets/
```

**Query Parameters:**
- `status`: OPERATIONAL, UNDER_MAINTENANCE, OUT_OF_SERVICE, RETIRED
- `location`: Location ID
- `asset_type`: Asset type ID
- `search`: Search by name, serial number, or description

**Response:**
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "name": "Main Conference Room AC",
      "description": "Primary air conditioning unit for conference room",
      "asset_type": {
        "id": 1,
        "name": "HVAC"
      },
      "location": {
        "id": 1,
        "name": "Main Office"
      },
      "status": "OPERATIONAL",
      "serial_number": "AC-2024-001",
      "qr_code": "QR-123456789",
      "manufacturer": "Carrier",
      "model": "XRV-2400",
      "purchase_date": "2024-01-01",
      "warranty_expiry": "2026-01-01",
      "last_maintenance_date": "2024-01-15",
      "next_maintenance_date": "2024-02-15",
      "days_since_last_maintenance": 30,
      "days_until_next_maintenance": 5
    }
  ]
}
```

#### Create Asset
```http
POST /api/property-management/assets/
Content-Type: application/json

{
  "name": "Server Room UPS",
  "description": "Uninterruptible power supply for server room",
  "asset_type": 3,
  "location": 1,
  "serial_number": "UPS-2024-001",
  "manufacturer": "APC",
  "model": "Smart-UPS 1500",
  "purchase_date": "2024-01-01",
  "warranty_expiry": "2027-01-01",
  "expected_lifespan_years": 5,
  "location_detail": "Server Rack A-1"
}
```

#### Generate QR Code
```http
GET /api/property-management/assets/{id}/qr_code/
```

**Response:**
```json
{
  "qr_code": "base64-encoded-qr-image",
  "qr_value": "QR-123456789"
}
```

#### Checkout Asset
```http
POST /api/property-management/assets/{id}/checkout/
Content-Type: application/json

{
  "expected_return_at": "2024-01-20T17:00:00Z",
  "notes": "Temporary loan to maintenance team",
  "condition": "Good working condition"
}
```

#### Check In Asset
```http
POST /api/property-management/assets/{id}/checkin/
Content-Type: application/json

{
  "condition": "Returned in good condition"
}
```

### Asset Types

#### Get Asset Types
```http
GET /api/property-management/asset-types/
```

**Response:**
```json
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "name": "HVAC",
      "description": "Heating, ventilation, and air conditioning equipment",
      "requires_maintenance": true,
      "maintenance_interval_days": 30,
      "is_active": true
    }
  ]
}
```

### Maintenance Schedules

#### Get Schedules
```http
GET /api/property-management/schedules/
```

#### Get Upcoming Schedules
```http
GET /api/property-management/schedules/upcoming/
```

#### Create Schedule
```http
POST /api/property-management/schedules/
Content-Type: application/json

{
  "asset": 1,
  "title": "Quarterly HVAC Maintenance",
  "description": "Regular maintenance and filter replacement",
  "scheduled_date": "2024-02-15T09:00:00Z",
  "estimated_duration_hours": 2.0,
  "assigned_to": 1
}
```

### Cost Centers

#### Get Cost Centers
```http
GET /api/property-management/cost-centers/
```

#### Create Cost Center
```http
POST /api/property-management/cost-centers/
Content-Type: application/json

{
  "name": "IT Department",
  "code": "IT001",
  "description": "IT equipment and infrastructure",
  "budget_limit": 50000.00,
  "manager": 1
}
```

#### Get Cost Center Expenses
```http
GET /api/property-management/cost-centers/{id}/expenses/
```

**Response:**
```json
{
  "total_expenses": 15430.50,
  "by_type": [
    {
      "expense_type": "LABOR",
      "total": 8750.00,
      "count": 15
    },
    {
      "expense_type": "MATERIALS",
      "total": 6680.50,
      "count": 23
    }
  ],
  "recent_expenses": [
    {
      "id": 1,
      "maintenance_request": {
        "id": 1,
        "title": "Server Room AC Repair"
      },
      "expense_type": "LABOR",
      "amount": 450.00,
      "description": "Emergency repair service",
      "created_at": "2024-01-15T16:30:00Z"
    }
  ]
}
```

## Dashboard APIs

### Overview
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

## Error Handling

### Standard Error Response
```json
{
  "error": "Validation failed",
  "details": {
    "field": "email",
    "message": "This field is required."
  },
  "code": "validation_error"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Rate Limiting

- **Authenticated users**: 1000 requests per hour
- **Anonymous users**: 100 requests per hour
- **Login endpoint**: 10 requests per minute

## Pagination

List endpoints support pagination:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 50, max: 100)

**Response:**
```json
{
  "count": 150,
  "next": "http://localhost:8001/api/visitors/visitors/?page=2",
  "previous": null,
  "results": [...]
}
```

> [!NOTE]
> Client applications should always check for the `results` key. If absent, the response might be a direct list (for smaller payloads or specific non-paginated actions).

## Filtering and Search

Most list endpoints support filtering:
- **Exact match**: `?field=value`
- **Multiple values**: `?field=value1&field=value2`
- **Search**: `?search=query`
- **Date range**: `?date_after=2024-01-01&date_before=2024-01-31`

## Webhooks

### Payment Webhooks
```http
POST /api/payments/webhooks/
Content-Type: application/json
Stripe-Signature: signature

{
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_1234567890",
      "customer": "cus_1234567890",
      "amount_paid": 5000
    }
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```javascript
const API_BASE = 'http://localhost:8001/api';

class VisitorManagementAPI {
  constructor(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async getVisitors(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/visitors/visitors/?${params}`);
  }

  async checkInVisitor(visitorData) {
    return this.request('/visitors/visitors/checkin/', {
      method: 'POST',
      body: JSON.stringify(visitorData)
    });
  }
}
```

### Python
```python
import requests

class VisitorManagementAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def get_visitors(self, **filters):
        params = '&'.join([f'{k}={v}' for k, v in filters.items()])
        url = f'{self.base_url}/visitors/visitors/'
        if params:
            url += f'?{params}'
        
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def check_in_visitor(self, visitor_data):
        url = f'{self.base_url}/visitors/visitors/checkin/'
        response = requests.post(url, json=visitor_data, headers=self.headers)
        response.raise_for_status()
        return response.json()
```

## Testing APIs

### Using curl
```bash
# Login
curl -X POST http://localhost:8001/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"password"}'

# Get visitors
curl -X GET http://localhost:8001/api/visitors/visitors/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create maintenance request
curl -X POST http://localhost:8001/api/property-management/requests/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Broken AC","description":"Not cooling","priority":"HIGH","category":1,"location":1}'
```

### Using Postman
1. Import the API collection
2. Set environment variables:
   - `base_url`: http://localhost:8001/api
   - `token`: Your JWT token
3. Use pre-configured requests for each endpoint

## Support

For API support:
- Check the API documentation at `/api/docs/`
- Review error messages in responses
- Enable debug logging for detailed error information
- Contact the development team for assistance
