
async function test() {
  try {
    const response = await fetch('http://localhost:3002/api/conversations');
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Request failed:', err);
  }
}

test();
