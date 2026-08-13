import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001';
let userId = '';
let token = '';

async function run() {
  console.log('--- E2E Test: Orb Orchestration Flow ---');
  
  // Wait for server to be up
  console.log('Waiting for API server to start...');
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(API_URL);
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // 1. Create a dummy user
  const username = `test_user_${Date.now()}`;
  console.log(`\n[1] Registering user: ${username}`);
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      phoneNumber: `+1555${Math.floor(100000 + Math.random() * 900000)}`,
      password: 'password123',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) {
    console.error('Registration failed:', regData);
    return;
  }
  userId = regData.user.id;
  token = regData.accessToken;
  console.log(`User created. Token: ${token.substring(0, 10)}...`);

  // 2. Setup AI Agent with travel and internet permissions
  console.log('\n[2] Setting up AI Agent (giving travel permissions)');
  const setupRes = await fetch(`${API_URL}/ai/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Aura',
      permissions: { 'travel.read': true, 'travel.write': true, 'core.basic': true, 'internet.search': false },
      onboarded: true,
    }),
  });
  const setupData = await setupRes.json();
  console.log('AI Agent setup:', setupRes.ok ? 'Success' : setupData);

  // 3. Send message to Orb
  const message1 = 'I need a flight to Cape Town tomorrow.';
  console.log(`\n[3] User: "${message1}"`);
  
  const chatRes1 = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message1 }],
    }),
  });
  const chatData1 = await chatRes1.json();
  
  console.log('--- AI Response ---');
  console.log('Active Agent:', chatData1.activeAgent ? chatData1.activeAgent.id : 'None (Orb)');
  console.log('Reply:', chatData1.reply);
  if (chatData1.widgets && chatData1.widgets.length > 0) {
    console.log(`Returned ${chatData1.widgets.length} widget(s).`);
  }
  
  // 4. Send another message to trigger yield back to Orb
  const message2 = 'Actually, forget travel. Can you check my wallet balance?';
  console.log(`\n[4] User: "${message2}"`);
  
  // Update agent permissions to include wallet
  await fetch(`${API_URL}/ai/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      permissions: { 'travel.read': true, 'travel.write': true, 'wallet.read': true, 'core.basic': true },
    }),
  });
  
  // Append new message to conversation history
  const history = [...chatData1.conversation, { role: 'user', content: message2 }];
  
  const chatRes2 = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messages: history,
    }),
  });
  const chatData2 = await chatRes2.json();
  
  console.log('--- AI Response ---');
  console.log('Active Agent:', chatData2.activeAgent ? chatData2.activeAgent.id : 'None (Orb)');
  console.log('Reply:', chatData2.reply);

  console.log('\n--- Test Complete ---');
}

run().catch(console.error);
