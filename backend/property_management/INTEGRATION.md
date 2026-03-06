# Property Management Integration with Visitor Management

This document outlines the integration between the Property Management modules and the existing Visitor Management system.

## Database Relationships

### Shared Models
- **Tenant**: Both systems use the same Tenant model for multi-tenancy
- **Location**: Property management assets and maintenance requests are linked to visitor locations
- **Host**: Hosts can submit maintenance requests and manage assets in their areas

### Integration Points

1. **Contractor Check-in**: Vendors from the property management system can be processed through the visitor system
2. **Location-based Access**: Maintenance requests and assets are tied to the same locations as visitor management
3. **User Permissions**: The same user roles and permissions system is used across both modules

## API Endpoints

### Property Management APIs
- `/api/property-management/requests/` - Maintenance requests
- `/api/property-management/assets/` - Asset management
- `/api/property-management/vendors/` - Vendor management
- `/api/property-management/dashboard/` - Analytics and reporting

### Visitor Management APIs (Existing)
- `/api/visitors/` - Visitor management
- `/api/visitors/locations/` - Location management
- `/api/visitors/hosts/` - Host management

## Cross-Module Features

### Contractor Integration
```python
# Example: Creating a vendor visit through visitor system
def create_contractor_visit(vendor_id, purpose):
    vendor = Vendor.objects.get(id=vendor_id)
    # Create visitor record for contractor
    visitor = Visitor.objects.create(
        name=vendor.contact_person,
        email=vendor.email,
        phone=vendor.phone,
        company=vendor.company,
        purpose=f"Maintenance: {purpose}",
        # ... other fields
    )
    return visitor
```

### Location-based Filtering
```python
# Filter maintenance requests by user's location
def get_user_maintenance_requests(user):
    if user.profile.location:
        return MaintenanceRequest.objects.filter(
            location=user.profile.location
        )
    return MaintenanceRequest.objects.none()
```

## Mobile App Integration

### Shared Navigation
The mobile admin app now includes:
- Dashboard (existing)
- Visitors (existing)
- Parcels (existing)
- **Maintenance** (new)
- **Assets** (new)

### Unified Authentication
Both modules use the same JWT authentication system, allowing seamless switching between visitor and property management features.

## Data Flow

1. **Maintenance Request Creation**
   - Host submits request through mobile app
   - System assigns to vendor
   - Vendor checks in through visitor system
   - Work order is created and tracked

2. **Asset Management**
   - Assets are tied to specific locations
   - QR codes can be scanned by maintenance staff
   - Check-in/check-out tracked for tools

## Security Considerations

- Property management data respects the same tenant isolation as visitor data
- Users can only access maintenance requests and assets for their assigned locations
- Vendor information is kept separate from visitor records but can be linked for contractor visits

## Future Enhancements

### Phase 2 Integration
- Space & Facility Management
- Communication Module
- Enhanced Vendor Management

### Phase 3 Integration
- Compliance & Safety Module
- Energy & Sustainability Module
- Advanced Analytics

## Migration Notes

When deploying the property management modules:

1. Run migrations: `python manage.py migrate property_management`
2. Create initial categories and asset types
3. Set up cost centers for expense tracking
4. Configure notification templates for maintenance alerts

The integration is designed to be non-disruptive to the existing visitor management system while providing comprehensive property management capabilities.
