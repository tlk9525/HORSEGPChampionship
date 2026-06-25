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
  
  const ref = await request('POST', '/api/login', { email: 'referee1@test.com', password: 'password123' });
  const refToken = ref.data.token;

  const { readDb, writeDb } = await import('../backend/src/sqlDb.js');
  const db = await readDb();
  
  const race = db.races[0];
  race.status = 'published';
  race.resultStatus = 'draft';
  race.awardsPublished = false;
  const entries = db.raceEntries.filter(e => e.raceId === race.id);
  entries.forEach(e => {
    e.preRaceStatus = 'pending';
    e.resultStatus = 'draft';
    e.position = null;
    e.finishTime = null;
    e.disqualified = false;
  });
  await writeDb(db);
  
  console.log('Setup race', race.id, 'to published state');

  for (const entry of entries) {
    const res = await request('PATCH', `/api/referee/races/${race.id}/entries/${entry.id}/readiness`, { status: 'ready' }, refToken);
    console.log('Referee check-in entry:', entry.id, res.status);
  }

  let res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'start-race' }, adminToken);
  console.log('Admin start-race:', res.status, res.data);

  res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'finish-race' }, adminToken);
  console.log('Admin finish-race:', res.status, res.data);

  const results = entries.map((e, idx) => ({ id: e.id, position: idx + 1, finishTime: '01:23.45', notes: '' }));
  res = await request('POST', `/api/referee/races/${race.id}/results`, { results }, refToken);
  console.log('Referee submit-results:', res.status, res.data);

  res = await request('PATCH', `/api/admin/tournaments/${race.tournamentId}/races/${race.id}/action`, { action: 'complete-results' }, adminToken);
  console.log('Admin complete-results:', res.status, res.data);
}
run().catch(console.error);
