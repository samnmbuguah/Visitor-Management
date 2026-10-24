# Visitor Management System

A comprehensive enterprise visitor management system adhering strictly to the Vizmo specifications. Built with a Django REST Framework backend, Next.js frontend styled with Material UI (MUI), and mobile applications.

## 🏢 Features (Vizmo Specifications)

### 1. Visitor Entry & Experience
- **Touchless Check-in / Out**: QR code scanning via mobile devices or self-service kiosks.
- **Self-Service Kiosk**: Tablet-optimized kiosk workflow for visitor sign-in, photo capture, and NDA signing.
- **Pre-Registration & Invites**: Host pre-registration with automated email/SMS invitations containing personalized QR access passes.
- **Returning Visitor Recognition**: Instant lookup and autofill by mobile number or email.
- **Bulk Pre-Registration**: CSV import for inviting corporate event attendees or large groups.
- **Digital Signatures & NDAs**: Digital signing pad for Non-Disclosure Agreements, safety rules, and compliance forms.

### 2. Security & Verification
- **Host Approval Workflow**: Real-time notifications for hosts to approve or reject walk-in visitors before entry is granted.
- **Watchlist & Blocklist Screening**: Automated real-time matching with customizable algorithms (Exact, Contains) to flag or block barred individuals.
- **Photo Capture & Badge Printing**: Live webcam capture and instant visitor badge preview and printing.
- **Overstay & Security Alerts**: Automated notifications when a guest exceeds their scheduled visit duration.
- **CCTV & Gate Integration**: Camera streaming support (RTSP/IP) and gate access control.

### 3. Communication & Notifications
- **Multi-Channel Alerts**: Instant notifications via Email and SMS upon visitor arrival, host approval, or check-out.
- **Notification Template Engine**: Customizable message templates with dynamic variable interpolation.
- **Audit Logs**: Delivery history and real-time logs for all dispatched communications.

### 4. Administration & Compliance
- **Centralized Admin Dashboard**: Real-time visitor register, occupancy stats, and status filtering.
- **Front Desk Receptionist Portal**: Fast lookups, badge generation, walk-in registration, and manual checkout.
- **Host Self-Service Portal**: Quick guest approvals, upcoming visit timeline, and personal guest pre-registration.
- **Multi-Location Management**: Multi-building facility configurations with independent security policies and tablet kiosk registers.
- **Analytics & Reporting**: Foot-traffic charts, peak hour histograms, overstay metrics, and CSV audit exports.
- **Multi-Tenant White-Labeling**: Custom branding with logos, theme primary colors, and subdomain routing.

## 🏗️ Architecture

### Backend (Django REST Framework)
- **Framework**: Django 6.0 with Django REST Framework
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: JWT tokens with role-based access control (Super Admin, Admin, Host, Receptionist)
- **API Documentation**: RESTful APIs with OpenAPI/Swagger

### Frontend (Next.js & MUI)
- **Framework**: Next.js 16 with TypeScript
- **Design System**: Material UI (MUI v6 / 9.5) with custom Material 3 theme and dark mode support
- **State & Data**: TanStack React Query, Zustand, Axios
- **Form & Validation**: Zod v4 schemas

### Mobile Apps (React Native)
- **Framework**: Expo with React Native
- **Navigation**: Expo Router with stack navigation
- **Features**: Host visitor approvals, kiosk self-service mode, and admin logs

## � Documentation

### 📖 Comprehensive Guide
- **[Complete System Guide](./COMPREHENSIVE_GUIDE.md)** - Full documentation covering all aspects
- **[API Documentation](./API_DOCUMENTATION.md)** - Detailed API reference
- **[Architecture Guide](./ARCHITECTURE.md)** - System design and patterns
- **[SOLID Implementation](./SOLID_IMPLEMENTATION_SUMMARY.md)** - Code organization principles

### 🔍 Analysis & Improvements
- **[Logic Gaps Analysis](./LOGIC_GAPS_ANALYSIS.md)** - Identified issues and recommendations
- **[Critical Fixes Guide](./CRITICAL_FIXES_IMPLEMENTATION.md)** - Step-by-step security fixes
- **[Production Readiness](./PRODUCTION_READINESS_REPORT.md)** - Deployment preparation checklist

### 📋 Feature Documentation
- **[Invitation System](./INVITATION_FEATURE_DOCUMENTATION.md)** - Pre-registration workflow
- **[Security Report](./RBAC_SECURITY_REPORT.md)** - Role-based access control
- **[System Testing](./SYSTEM_TEST_REPORT.md)** - Testing procedures and results

### 🛠️ Development Resources
- **[Receptionist Workflow](./RECEPTIONIST_PENDING_APPROVAL_WORKFLOW.md)** - Front desk procedures
- **[Kiosk UI Improvements](./KIOSK_UI_IMPROVEMENTS.md)** - Self-service interface
- **[Registration Fix Guide](./RECEPTIONIST_MANUAL_REGISTRATION_FIX.md)** - Manual check-in process

### 📋 Documentation Summary
- **[Documentation Enhancement Summary](./DOCUMENTATION_SUMMARY.md)** - Complete overview of all documentation improvements and implementation roadmap

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.12+ (for local development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd visitormanagement
   ```

2. **Start all services**
   ```bash
   bash scripts/deploy-docker.sh
   ```

3. **Access the applications**
   - Web Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - Mobile Admin: http://localhost:8084
   - Mobile Host: http://localhost:8085
   - Mobile Kiosk: http://localhost:8086

### Local Development

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Mobile Apps Setup
```bash
# Admin App
cd mobile-admin
npm install
npx expo start

# Host App
cd mobile-host
npm install
npx expo start

# Kiosk App
cd mobile-kiosk
npm install
npx expo start
```

## 📊 Database Schema

### Core Models
- **Tenant**: Multi-tenant organization management
- **Location**: Physical sites/office locations
- **Host**: Employees who can receive visitors
- **Visitor**: People visiting the premises
- **PreRegistration**: Advance visitor invitations

### Property Management Models
- **MaintenanceRequest**: Repair and maintenance requests
- **Asset**: Equipment and property assets
- **Vendor**: Approved service providers
- **WorkOrder**: Detailed maintenance work orders
- **CostCenter**: Expense tracking and budgeting

### Supporting Models
- **Notification**: Email/SMS/push notifications
- **Security**: Gate access and incident tracking
- **Payment**: Subscriptions and billing
- **Analytics**: Reporting and metrics

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=visitormanagement
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

# Email Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
```

### Docker Environment
Copy `.env.docker.example` to `.env.docker` and configure as needed.

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test visitors.tests
```

### Frontend Tests
```bash
cd frontend
pnpm test
```

### Mobile App Tests
```bash
cd mobile-admin
npm test

cd mobile-host
npm test

cd mobile-kiosk
npm test
```

## 📱 Mobile Applications

### Admin App
- **Purpose**: Visitor logs and gate monitoring for security administrators
- **Features**: Visitor pass verification, real-time alerts, parcel handoffs
- **Access**: Role-based (Admin, Security)

### Host App
- **Purpose**: Visitor approvals for employees
- **Features**: Pre-registration, visitor notifications, check-in approval
- **Access**: Host role

### Kiosk App
- **Purpose**: Self-service visitor check-in
- **Features**: QR code scanning, photo capture, NDA signing
- **Access**: Public kiosk mode

## 🔐 Security

### Authentication
- JWT tokens with refresh rotation
- Role-based access control
- Multi-tenant data isolation

### Data Protection
- Encrypted sensitive data
- Audit logging
- Session management

### Security Features
- Watchlist screening
- NDA compliance
- Gate access integration
- Security incident reporting

## 📈 Analytics & Reporting

### Dashboard Metrics
- Visitor statistics and trends
- Maintenance request analytics
- Asset performance metrics
- Cost center reporting

### Export Options
- CSV data export
- PDF report generation
- Real-time dashboard
- Custom date ranges

## 🔄 Data Seeding

### Comprehensive Data Setup
```bash
cd backend
python manage.py seed_comprehensive_data
```

This creates:
- Sample tenants and locations
- Test users with different roles
- Maintenance categories and vendors
- Sample assets and maintenance requests
- Historical data for analytics

## 🚀 Deployment

### Production Deployment
1. Configure production environment variables
2. Set up PostgreSQL database
3. Configure SSL certificates
4. Set up reverse proxy (nginx)
5. Deploy with Docker Compose

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
- **Development**: SQLite, debug mode, hot reload
- **Staging**: PostgreSQL, optimized settings
- **Production**: PostgreSQL, SSL, monitoring

## 📚 API Documentation

### Backend APIs
- **Visitor Management**: `/api/visitors/`
- **Property Management**: `/api/property-management/`
- **Authentication**: `/api/auth/`
- **Analytics**: `/api/analytics/`

### API Authentication
All APIs require JWT authentication:
```bash
# Login
POST /api/auth/login/
{
  "username": "user@example.com",
  "password": "password"
}

# Use token in headers
Authorization: Bearer <jwt-token>
```

## 🛠️ Development Guide

### Code Structure
```
backend/
├── visitors/          # Visitor management models, views, serializers, tests
├── config/            # Django settings & URLs
└── requirements.txt   # Python dependencies

frontend/
├── app/               # Next.js App Router (MUI-based pages)
├── components/        # Reusable MUI components & theme registry
├── theme/             # Material UI theme & color configurations
├── services/          # Visitor management API service
├── hooks/             # TanStack Query & auth hooks
└── lib/               # Types, validations, and utilities

mobile-admin/          # Security & visitor logs mobile app
mobile-host/           # Employee host mobile app
mobile-kiosk/          # Self-service kiosk mobile app
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Ensure CI/CD passes

### Coding Standards
- Python: PEP 8 compliance
- TypeScript: ESLint + Prettier
- React Native: Expo guidelines
- Git: Conventional commits

## 🐛 Troubleshooting

### Common Issues
- **Database migrations**: Run `python manage.py migrate`
- **Node modules**: Clear cache with `npm cache clean`
- **Docker ports**: Check for conflicts with `netstat -tulpn`
- **API errors**: Check logs with `docker logs <container>`

### Debug Mode
Enable debug logging:
```env
DEBUG=True
LOG_LEVEL=DEBUG
```

### Performance Monitoring
- Django Debug Toolbar (development)
- Sentry error tracking (production)
- Docker resource monitoring
- Database query optimization

## 📞 Support

### Documentation
- API docs: http://localhost:8001/api/docs/
- Django admin: http://localhost:8001/admin/
- Mobile app logs: Expo development tools

### Getting Help
- Check GitHub issues
- Review API documentation
- Enable debug logging
- Check container logs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

We welcome contributions! Please see our Contributing Guide for details.

### Development Team
- Backend Developers: Django/Python expertise
- Frontend Developers: React/Next.js expertise  
- Mobile Developers: React Native/Expo expertise
- DevOps: Docker/CI/CD expertise

---

**Built with ❤️ for modern visitor and property management**
