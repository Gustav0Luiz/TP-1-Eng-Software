// Simple test script to verify authentication endpoints
const API_BASE = 'http://localhost:4000/api';

async function testAuth() {
  console.log('Testing authentication endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:4000/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);

    // Test register
    console.log('\n2. Testing user registration...');
    const registerResponse = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'User',
        nickname: 'testuser',
        email: 'test@example.com',
        password: 'test123'
      }),
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('Registration successful:', registerData);
      
      const token = registerData.token;

      // Test /me endpoint
      console.log('\n3. Testing /me endpoint with token...');
      const meResponse = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('User data:', meData);
      } else {
        console.log('Error fetching user data:', await meResponse.text());
      }

      // Test login
      console.log('\n4. Testing login...');
      const loginResponse = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123'
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('Login successful:', loginData);
      } else {
        console.log('Login error:', await loginResponse.text());
      }

    } else {
      const errorData = await registerResponse.json();
      console.log('Registration error:', errorData);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('Make sure the backend server is running on port 4000');
  }
}

testAuth();
