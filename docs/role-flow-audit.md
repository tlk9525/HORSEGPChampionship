# Horse Racing Tournament System - Role Flow Audit

## Status

The system now stores operational data in PostgreSQL and the main role flows are aligned with the tournament workflow.

## Admin

Admin can:

- Create tournaments.
- Create races inside a tournament.
- Assign one or more referees to a race.
- Review approvals:
  - Horse registration.
  - Jockey tournament registration.
  - Horse race entry.
  - Horse-jockey pairing invitation.
- Close race registration.
- Publish race.
- Confirm or reject submitted results.
- Complete race and publish awards.

Main backend modules:

- `backend/src/routes/adminRoutes.js`
- `backend/src/services/domainService.js`
- `backend/src/services/handicapService.js`

Main tables:

- `tournaments`
- `races`
- `jockeyTournamentRegistrations`
- `raceEntries`
- `notifications`

## Owner

Owner can:

- Manage owned horses.
- Add up to 5 horses.
- Edit horse profile data.
- View tournaments.
- Register owned horses for races.
- Select only approved jockeys for the same tournament.
- Track race entries and race results.

Main backend module:

- `backend/src/routes/ownerRoutes.js`

Main tables:

- `horses`
- `raceEntries`
- `jockeyInvitations`

## Jockey

Jockey can:

- Publish public profile.
- Join tournament.
- Wait for Admin approval.
- Receive race participation requests.
- Accept or reject invitations.
- View assigned horses.
- View gate, rating, and handicap only after race is published.
- View rankings and results.

Main backend module:

- `backend/src/routes/jockeyRoutes.js`

Main tables:

- `jockeyProfiles`
- `jockeyTournamentRegistrations`
- `jockeyInvitations`
- `raceEntries`

## Referee

Referee can:

- View assigned races.
- Mark participants Ready or Absent.
- Start race only when:
  - Race is Published.
  - At least one participant is Ready.
  - All participants are checked as Ready or Absent.
- Record position, finish time, notes, and violations.
- Submit results to Admin.

Main backend module:

- `backend/src/routes/refereeRoutes.js`

Main tables:

- `races`
- `raceEntries`

## Spectator

Spectator can:

- View tournaments.
- View race schedules.
- View race cards.
- View public jockey profiles.
- View live race status.
- View published results.
- View rankings and awards.

Spectator cannot modify data.

## Google Login

Google login has been added with configurable environment variables.

Required variables:

```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Database fields added to `users`:

- `authProvider`
- `googleId`
- `avatarUrl`

Migration file:

- `database/postgres/migrations/001_google_auth.sql`

## Important Fixes Applied

- Jockey self-registration no longer blocks login.
- Public self-registration no longer allows Admin role.
- `rankings` is protected consistently for all authenticated roles.
- `results` is visible to Admin, Owner, Jockey, Referee, and Spectator.
- `Jockey Portal` is only visible to Jockey role.
- Referee Live Race view now filters to assigned races.
- Results page now reads official results from PostgreSQL instead of static frontend data.
- Google login creates or links users and saves sessions in PostgreSQL.

## Remaining Optional Enhancements

- Add Admin user-management screen for role/status updates.
- Add real foreign key constraints to PostgreSQL schema after confirming all seed and runtime data are clean.
- Add password hashing instead of plain demo passwords.
- Add automated tests for role permissions and race workflow transitions.
