// Test login functionality
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
      credentials: 'include'
    });

    if (response.redirected) {
      console.log('✅ Login successful - redirected to:', response.url);
      return true;
    } else {
      console.log('❌ Login failed - no redirect');
      const text = await response.text();
      console.log('Response:', text.substring(0, 500));
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
};

testLogin();
