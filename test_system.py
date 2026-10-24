#!/usr/bin/env python3
"""
Comprehensive System Test Script

This script tests all aspects of the visitor management system:
- Authentication
- API endpoints
- Frontend accessibility
- Mobile apps
- Data integrity
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"
FRONTEND_URL = "http://localhost:3000"
MOBILE_URLS = {
    "admin": "http://localhost:8084",
    "host": "http://localhost:8085", 
    "kiosk": "http://localhost:8086"
}

# Test credentials
CREDENTIALS = {
    "admin": {"username": "admin", "password": "admin123"},
    "host": {"username": "host", "password": "host123"},
    "kiosk": {"username": "kiosk", "password": "kiosk123"}
}

def print_section(title):
    print(f"\n{'='*60}")
    print(f" {title}")
    print('='*60)

def print_test_result(test_name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"  {status} {test_name}")
    if details:
        print(f"      {details}")

def test_api_connectivity():
    """Test if backend API is accessible"""
    try:
        response = requests.get(f"{BASE_URL}/auth/login/", timeout=5)
        return response.status_code != 000
    except requests.exceptions.RequestException as e:
        return False

def test_authentication():
    """Test authentication endpoints"""
    results = {}
    
    for user_type, creds in CREDENTIALS.items():
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login/",
                json=creds,
                timeout=5
            )
            success = response.status_code == 200
            results[user_type] = success
            
            if success:
                data = response.json()
                results[f"{user_type}_token"] = data.get('access', '')
                results[f"{user_type}_refresh"] = data.get('refresh', '')
            
        except Exception as e:
            results[user_type] = False
    
    return results

def test_visitor_management_endpoints(token):
    """Test visitor management API endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = [
        "/visitors/",
        "/locations/", 
        "/invites/",
        "/hosts/",
        "/watchlist/",
        "/analytics/dashboard/"
    ]
    
    results = {}
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
            success = response.status_code == 200
            results[endpoint] = {
                "success": success,
                "status_code": response.status_code,
                "data_count": len(response.json()) if success and response.headers.get('content-type', '').startswith('application/json') else 0
            }
        except Exception as e:
            results[endpoint] = {"success": False, "error": str(e)}
    
    return results

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        return response.status_code == 200
    except Exception as e:
        return False

def test_mobile_apps():
    """Test mobile app accessibility"""
    results = {}
    for app_name, url in MOBILE_URLS.items():
        try:
            response = requests.get(url, timeout=5)
            results[app_name] = {
                "success": response.status_code == 200,
                "status_code": response.status_code
            }
        except Exception as e:
            results[app_name] = {"success": False, "error": str(e)}
    
    return results

def test_data_integrity():
    """Test data integrity by checking counts"""
    try:
        # Get token for testing
        auth_response = requests.post(
            f"{BASE_URL}/auth/login/",
            json=CREDENTIALS["admin"],
            timeout=5
        )
        
        if auth_response.status_code != 200:
            return {"success": False, "error": "Authentication failed"}
        
        token = auth_response.json().get('access', '')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test data counts
        endpoints = {
            "visitors": "/visitors/",
            "locations": "/locations/",
            "invites": "/invites/",
            "hosts": "/hosts/",
            "watchlist": "/watchlist/",
            "tenants": "/tenants/"
        }
        
        results = {}
        for name, endpoint in endpoints.items():
            try:
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else 0
                    results[name] = {"success": True, "count": count}
                else:
                    results[name] = {"success": False, "status_code": response.status_code}
            except Exception as e:
                results[name] = {"success": False, "error": str(e)}
        
        return {"success": True, "data": results}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_comprehensive_tests():
    """Run all tests and generate report"""
    print_section("COMPREHENSIVE SYSTEM TESTS")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test API Connectivity
    print("\n🔍 Testing API Connectivity...")
    api_up = test_api_connectivity()
    print_test_result("API Connectivity", api_up)
    
    if not api_up:
        print_section("CRITICAL ERROR")
        print("❌ Backend API is not accessible!")
        print("   - Check if backend container is running")
        print("   - Verify port 8001 is available")
        return
    
    # Test Authentication
    print("\n🔐 Testing Authentication...")
    auth_results = test_authentication()
    for user_type, success in auth_results.items():
        if isinstance(success, bool):
            print_test_result(f"{user_type.title()} Login", success)
        else:
            print_test_result(f"{user_type.title()} Login", False, "Unexpected response format")
    
    # Get admin token for API tests
    admin_token = auth_results.get("admin_token", "")
    if not admin_token:
        print_section("AUTHENTICATION ERROR")
        print("❌ Could not obtain admin token for API testing")
        return
    
    # Test Property Management Endpoints
    print("\n🏢 Testing Visitor Management APIs...")
    api_results = test_visitor_management_endpoints(admin_token)
    for endpoint, result in api_results.items():
        endpoint_name = endpoint.replace("/", "").replace("/", "").title()
        if result["success"]:
            print_test_result(f"{endpoint_name} API", True, f"Status: {result['status_code']}, Items: {result['data_count']}")
        else:
            print_test_result(f"{endpoint_name} API", False, f"Status: {result.get('status_code', 'Unknown')}")
    
    # Test Frontend
    print("\n🌐 Testing Frontend...")
    frontend_up = test_frontend_accessibility()
    print_test_result("Frontend Accessibility", frontend_up)
    
    # Test Mobile Apps
    print("\n📱 Testing Mobile Apps...")
    mobile_results = test_mobile_apps()
    for app_name, result in mobile_results.items():
        print_test_result(f"{app_name.title()} App", result["success"], f"Status: {result.get('status_code', 'Unknown')}")
    
    # Test Data Integrity
    print("\n📊 Testing Data Integrity...")
    data_results = test_data_integrity()
    if data_results["success"]:
        print_test_result("Data Integrity Test", True)
        for name, result in data_results["data"].items():
            status = "✅" if result["success"] else "❌"
            count = result.get("count", 0)
            print(f"    {status} {name.title()}: {count} items")
    else:
        print_test_result("Data Integrity Test", False, data_results.get("error", "Unknown error"))
    
    # Generate Summary
    print_section("TEST SUMMARY")
    
    all_tests = [
        ("API Connectivity", api_up),
        ("Admin Authentication", auth_results.get("admin", False)),
        ("Host Authentication", auth_results.get("host", False)),
        ("Kiosk Authentication", auth_results.get("kiosk", False)),
        ("Frontend", frontend_up),
        ("Mobile Admin", mobile_results.get("admin", {}).get("success", False)),
        ("Mobile Host", mobile_results.get("host", {}).get("success", False)),
        ("Mobile Kiosk", mobile_results.get("kiosk", {}).get("success", False)),
        ("Data Integrity", data_results.get("success", False))
    ]
    
    passed = sum(1 for test, success in all_tests if success)
    total = len(all_tests)
    
    print(f"Tests Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! System is fully operational.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review the results above.")
    
    # Recommendations
    print_section("RECOMMENDATIONS")
    
    if not api_up:
        print("🔧 Restart backend service: docker compose restart backend")
    
    if not frontend_up:
        print("🔧 Restart frontend service: docker compose restart web")
    
    if not all(auth_results.get(app, False) for app in ["admin", "host", "kiosk"]):
        print("🔧 Check user credentials in backend database")
    
    failed_apis = [ep for ep, result in api_results.items() if not result["success"]]
    if failed_apis:
        print("🔧 Check visitor management API configuration")
        print("   - Verify visitors app is in INSTALLED_APPS")
        print("   - Check URL routing in config/urls.py")
        print("   - Verify ViewSet registration in visitors/urls.py")
    
    print_section("NEXT STEPS")
    print("1. Access frontend: http://localhost:3000")
    print("2. Login with admin/admin123")
    print("3. Test visitor management features")
    print("4. Test mobile apps at their respective ports")
    print("5. Verify data seeding results")

if __name__ == "__main__":
    run_comprehensive_tests()
