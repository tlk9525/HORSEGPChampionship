const http = require('http');

const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const req = http.request({
    hostname: '127.0.0.1', port: 4000, path, method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
      catch(e) { resolve({ status: res.statusCode, data }); }
    });
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

async function run() {
  const admin = await request('POST', '/api/login', { email: 'admin@test.com', password: 'password123' });
  const adminToken = admin.data.token;
  console.log('Admin login:', admin.status);
  
  const ref = await request('POST', '/api/login', { email: 'referee1@test.com', password: 'password123' });
  const refToken = ref.data.token;
  console.log('Referee login:', ref.status);

  // Get bootstrap data
  const bs = await request('GET', '/api/bootstrap');
  const db = bs.data;
  
  // Find a published race
  const race = db.races.find(r => r.status === 'published');
  if (!race) {
    console.log('No published race found to test. DB state:', db.races.map(r => r.status));
    return;
  }
  console.log('Testing race:', race.id);

  // Referee checks in
  const entries = db.raceEntries.filter(e => e.raceId === race.id);
  console.log('Race entries:', entries.length);
  for (const entry of entries) {
    if (entry.preRaceStatus !== 'ready') {
      const res = await request('PATCH', `/api/referee/races/${race.id}/entries/${entry.id}/readiness`, { status: 'ready' }, refToken);
      console.log('Referee check-in entry:', entry.id, res.status);
    }
  }

  // Admin starts race
  let res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'start-race' }, adminToken);
  console.log('Admin start-race:', res.status, res.data);

  // Admin finishes race
  res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'finish-race' }, adminToken);
  console.log('Admin finish-race:', res.status, res.data);

  // Referee submits results
  const results = entries.map((e, idx) => ({ id: e.id, position: idx + 1, finishTime: '01:23.45', notes: '' }));
  res = await request('POST', `/api/referee/races/${race.id}/results`, { results }, refToken);
  console.log('Referee submit-results:', res.status, res.data);

  // Admin completes race
  res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'complete-results' }, adminToken);
  console.log('Admin complete-results:', res.status, res.data);
}
run().catch(console.error);
