# Deployment Testing Summary
Demo environment successfully purged and repopulated. See `walkthrough.md` for client presentation details.

## Fixed Authentication Issues
- Changed the backend authenticating protocol to allow both `email` and `username`.
- Corrected Kiosk API payload to map `email` under the `username` key for SimpleJWT.
- Replaced hardcoded external IP addresses `213.199.50.129` with `10.0.2.2` (Android emulator localhost) or variables across `mobile-admin`, `mobile-host`, and `mobile-kiosk`.
