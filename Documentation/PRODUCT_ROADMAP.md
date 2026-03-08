# 🚀 Product Roadmap: Visitor & Property Management

This document outlines the strategic roadmap for future feature development and system enhancements to reach production-grade excellence.

---

## 📈 Phase 1: Security & Compliance (Immediate)

### **Strict Tenant Isolation**
- **Goal**: Ensure no data leakage between different companies/tenants.
- **Action**: Implement `get_queryset` overrides in all Django viewsets to filter by `request.user.profile.tenant`.

### **Enhanced Audit Logs**
- **Goal**: High accountability for security actions.
- **Action**: Add `approved_by` and `approved_at` to the `Visitor` model. Implement a `ChangeLog` for `WorkOrders` and `MaintenanceRequests`.

### **Watchlist Service Implementation**
- **Goal**: Proactive security screening.
- **Action**: Integrate the pending `WatchlistService` into the visitor check-in flow to automatically flag or block high-risk individuals.

---

## 🔄 Phase 2: Visitor Experience & Automation (Short-Term)

### **Recurring Invitations**
- **Goal**: Support regular contractors and frequent visitors.
- **Action**: Implement a scheduling system for pre-registrations (e.g., Weekly on Mondays) that generates unique tokens for each occurrence.

### **Pre-screening Questionnaires**
- **Goal**: Compliance and health screening.
- **Action**: Allow hosts to define custom questions (e.g., health declaration, safety training) that visitors must answer during pre-registration.

### **Emergency Broadcast System**
- **Goal**: Critical safety and communication.
- **Action**: A "One-Tap" broadcast to notify all currently checked-in visitors and hosts via SMS/Push/Email during an evacuation or emergency.

---

## 🏢 Phase 3: Advanced Property Insights (Medium-Term)

### **Asset Lifecycle & Analytics**
- **Goal**: Predictive maintenance and cost optimization.
- **Action**: Implement deep metrics on asset reliability, calculating Total Cost of Ownership (TCO) and predicting failure based on maintenance history.

### **Smart Gate & IOT Integration**
- **Goal**: Modern access control.
- **Action**: Integrate with smart lock systems (e.g., Kisi, Salto) to automatically grant mobile access keys to approved visitors for their scheduled duration.

### **Advanced Parcel Management**
- **Goal**: Efficient logistics.
- **Action**: Add support for parcel weight, dimensions, and automated storage unit assignment. Integrate with barcode scanners for faster intake.

---

## 🗺️ Long-Term Vision (Strategic)

- **AI-Powered Resource Planning**: Predict peak visitor times and maintenance staffing needs using historical data.
- **Cross-Tenant Benchmarking**: Allow anonymous benchmarking of maintenance costs across similar property types.
- **Full Financial Suite**: Integrated rent collection, lease management, and automated financial reporting for landlords.

---

*Last Updated: March 2026*
