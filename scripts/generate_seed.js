const fs = require('fs');

const horses = Array.from({length: 15}, (_, i) => ({
  id: `h_${String(i+1).padStart(3, '0')}`,
  name: `Horse ${i+1}`,
  breed: ['Thoroughbred', 'Arabian', 'Quarter Horse'][i%3],
  color: ['Black', 'Bay', 'Grey', 'Chestnut', 'Palomino'][i%5],
  age: 3 + (i%4),
  weightLb: 480 + (i * 5),
  rating: 60 + (i * 2),
  sex: ['Stallion', 'Mare', 'Gelding'][i%3],
  ownerUserId: 'u_owner'
}));

const jockeys = Array.from({length: 10}, (_, i) => ({
  id: `u_jockey_${i+1}`,
  name: `Jockey ${i+1}`,
  email: `jockey${i+1}@test.com`
}));

let seedSql = `
BEGIN;
TRUNCATE "raceEntries", "races", "tournaments", "horses", "users" RESTART IDENTITY CASCADE;

INSERT INTO "users" ("id", "name", "email", "password", "role", "status") VALUES
  ('u_admin', 'Admin User', 'admin@test.com', 'admin123', 'admin', 'active'),
  ('u_owner', 'Sterling Stables', 'owner@test.com', 'owner123', 'owner', 'active'),
  ('u_referee', 'Referee', 'referee@test.com', 'referee123', 'referee', 'active');
`;

jockeys.forEach(j => {
  seedSql += `INSERT INTO "users" ("id", "name", "email", "password", "role", "status") VALUES ('${j.id}', '${j.name}', '${j.email}', 'jockey123', 'jockey', 'active');\n`;
});

seedSql += `INSERT INTO "horses" ("id", "name", "breed", "color", "age", "weightLb", "rating", "sex", "ownerUserId", "status", "createdAt", "updatedAt") VALUES\n`;
seedSql += horses.map(h => `  ('${h.id}', '${h.name}', '${h.breed}', '${h.color}', ${h.age}, ${h.weightLb}, ${h.rating}, '${h.sex}', '${h.ownerUserId}', 'active', NOW(), NOW())`).join(',\n') + ';\n\n';

seedSql += `
INSERT INTO "tournaments" ("id", "name", "status", "startDate", "finalDate", "location", "createdAt") VALUES
  ('t_past', 'Autumn Cup 2025', 'completed', '2025-09-01', '2025-09-30', 'New York', NOW()),
  ('t_active', 'Spring Championship 2026', 'active', '2026-03-01', '2026-05-30', 'London', NOW()),
  ('t_upcoming', 'Summer Derby 2026', 'upcoming', '2026-07-01', '2026-07-30', 'Tokyo', NOW());

INSERT INTO "races" ("id", "tournamentId", "raceNumber", "name", "date", "time", "venue", "distance", "surface", "raceClass", "handicapMin", "handicapMax", "status", "registrationOpensAt", "registrationClosesAt", "createdAt") VALUES
  ('r_past_1', 't_past', 'R1', 'Autumn Qualifier 1', '2025-09-10', '14:00', 'NY Track', '1200m', 'Turf', 'Class 4', 115, 135, 'completed', '2025-08-01', '2025-08-30', NOW()),
  ('r_past_2', 't_past', 'R2', 'Autumn Qualifier 2', '2025-09-15', '14:00', 'NY Track', '1400m', 'Dirt', 'Class 3', 115, 135, 'completed', '2025-08-01', '2025-08-30', NOW()),
  ('r_active_1', 't_active', 'R1', 'Spring Opening', '2026-04-10', '15:00', 'London Track', '1000m', 'Turf', 'Class 2', 115, 135, 'registration-open', '2026-02-01', '2026-03-30', NOW());

INSERT INTO "raceEntries" ("id", "raceId", "horseId", "jockeyUserId", "status", "lane", "handicap", "ratingSnapshot", "ratingChange", "postRaceRating", "resultStatus", "position", "finishTime", "createdAt") VALUES
`;

const entries = [];
let entryId = 1;

// Past Race 1 (Completed)
for(let i=0; i<6; i++) {
  let pos = i+1;
  let rc = pos === 1 ? 5 : pos === 2 ? 2 : pos === 3 ? -1 : -2;
  let pr = horses[i].rating + rc;
  entries.push(`('re_${entryId++}', 'r_past_1', '${horses[i].id}', '${jockeys[i].id}', 'approved', ${i+1}, 125, ${horses[i].rating}, ${rc}, ${pr}, 'official', ${pos}, '01:10.${pos}', NOW() - INTERVAL '6 months')`);
}

// Past Race 2 (Completed)
for(let i=3; i<9; i++) {
  let pos = i-2;
  let rc = pos === 1 ? 5 : pos === 2 ? 2 : pos === 3 ? -1 : -2;
  let pr = horses[i].rating + rc;
  entries.push(`('re_${entryId++}', 'r_past_2', '${horses[i].id}', '${jockeys[i].id}', 'approved', ${i-2}, 125, ${horses[i].rating}, ${rc}, ${pr}, 'official', ${pos}, '01:25.${pos}', NOW() - INTERVAL '5 months')`);
}

// Active Race (Open)
for(let i=0; i<5; i++) {
  entries.push(`('re_${entryId++}', 'r_active_1', '${horses[i].id}', '${jockeys[i].id}', 'approved', ${i+1}, 125, ${horses[i].rating}, 0, 0, 'draft', NULL, NULL, NOW())`);
}

seedSql += entries.join(',\n') + ';\nCOMMIT;\n';

fs.writeFileSync('database/postgres/seed.sql', seedSql);
