# Horse Racing Tournament ERD

```mermaid
erDiagram
  users {
    VARCHAR id PK
    VARCHAR name
    VARCHAR email UK
    VARCHAR password
    VARCHAR role
    VARCHAR status
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ updatedAt
  }

  tournaments {
    VARCHAR id PK
    VARCHAR name
    VARCHAR status
    DATE startDate
    DATE finalDate
    VARCHAR location
    NUMERIC prizePool
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ updatedAt
  }

  horses {
    VARCHAR id PK
    VARCHAR name
    VARCHAR breed
    VARCHAR species
    INTEGER age
    VARCHAR sex
    VARCHAR color
    NUMERIC weightLb
    NUMERIC heightCm
    NUMERIC baseHandicap
    NUMERIC speedRating
    NUMERIC staminaRating
    NUMERIC formRating
    NUMERIC healthRating
    NUMERIC overallRating
    VARCHAR healthStatus
    TEXT profileNotes
    VARCHAR ownerUserId FK
    VARCHAR status
    VARCHAR jockeyConfirmation
    TEXT veterinaryCertificateUrl
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ updatedAt
  }

  races {
    VARCHAR id PK
    VARCHAR tournamentId FK
    VARCHAR raceNumber
    VARCHAR name
    VARCHAR round
    DATE raceDate
    TIME raceTime
    VARCHAR venue
    VARCHAR distance
    VARCHAR surface
    VARCHAR raceClass
    NUMERIC ratingMin
    NUMERIC ratingMax
    NUMERIC handicapMin
    NUMERIC handicapMax
    NUMERIC totalPrize
    VARCHAR status
    INTEGER participants
    INTEGER ownerConfirmed
    INTEGER jockeyConfirmed
    TIMESTAMPTZ registrationOpensAt
    TIMESTAMPTZ registrationClosesAt
    VARCHAR resultStatus
    BOOLEAN awardsPublished
    JSONB replayTimeline
    VARCHAR createdBy FK
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ updatedAt
  }

  raceRefereeAssignments {
    VARCHAR id PK
    VARCHAR raceId FK
    VARCHAR refereeUserId FK
    VARCHAR assignedBy FK
    VARCHAR status
    TIMESTAMPTZ assignedAt
  }

  jockeyProfiles {
    VARCHAR id PK
    VARCHAR userId FK
    TEXT bio
    TEXT certificate
    VARCHAR competitionLevel
    NUMERIC weightLb
    VARCHAR status
    TIMESTAMPTZ updatedAt
  }

  jockeyRaceRegistrations {
    VARCHAR id PK
    VARCHAR raceId FK
    VARCHAR jockeyUserId FK
    VARCHAR status
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ reviewedAt
  }

  jockeyInvitations {
    VARCHAR id PK
    VARCHAR horseId FK
    VARCHAR ownerUserId FK
    VARCHAR jockeyUserId FK
    VARCHAR tournamentId FK
    VARCHAR raceId FK
    VARCHAR status
    VARCHAR adminStatus
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ respondedAt
  }

  horseRaceRegistrations {
    VARCHAR id PK
    VARCHAR tournamentId FK
    VARCHAR raceId FK
    VARCHAR horseId FK
    VARCHAR ownerUserId FK
    VARCHAR jockeyUserId FK
    VARCHAR invitationId FK
    VARCHAR status
    TEXT notes
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ reviewedAt
  }

  raceEntries {
    VARCHAR id PK
    VARCHAR raceId FK
    VARCHAR horseId FK
    VARCHAR jockeyUserId FK
    VARCHAR invitationId FK
    VARCHAR status
    INTEGER lane
    NUMERIC handicap
    NUMERIC ratingSnapshot
    NUMERIC ratingChange
    NUMERIC postRaceRating
    BOOLEAN ownerConfirmed
    BOOLEAN jockeyConfirmed
    VARCHAR preRaceStatus
    BOOLEAN disqualified
    VARCHAR resultStatus
    INTEGER position
    VARCHAR finishTime
    TEXT notes
    TEXT violationNotes
    TIMESTAMPTZ createdAt
  }

  refereeReports {
    VARCHAR id PK
    VARCHAR raceId FK
    VARCHAR raceEntryId FK
    VARCHAR refereeUserId FK
    VARCHAR reportType
    TEXT description
    TEXT violation
    VARCHAR status
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ reviewedAt
  }

  notifications {
    VARCHAR id PK
    VARCHAR userId FK
    VARCHAR type
    VARCHAR title
    TEXT message
    BOOLEAN isRead
    TIMESTAMPTZ createdAt
  }

  sessions {
    VARCHAR token PK
    VARCHAR userId FK
    TIMESTAMPTZ createdAt
    TIMESTAMPTZ expiresAt
  }

  users ||--o{ horses : owns
  users ||--o| jockeyProfiles : has_profile
  users ||--o{ sessions : has_sessions
  users ||--o{ notifications : receives
  users ||--o{ races : creates

  tournaments ||--o{ races : contains
  tournaments ||--o{ jockeyInvitations : scopes
  tournaments ||--o{ horseRaceRegistrations : contains

  races ||--o{ raceRefereeAssignments : has_referees
  users ||--o{ raceRefereeAssignments : assigned_referee
  users ||--o{ raceRefereeAssignments : assigned_by

  races ||--o{ jockeyRaceRegistrations : has_jockey_availability
  users ||--o{ jockeyRaceRegistrations : registers_as_jockey

  horses ||--o{ jockeyInvitations : invited_for
  users ||--o{ jockeyInvitations : owner_sends
  users ||--o{ jockeyInvitations : jockey_receives
  races ||--o{ jockeyInvitations : invitation_for

  races ||--o{ horseRaceRegistrations : has_horse_registrations
  horses ||--o{ horseRaceRegistrations : registered_for
  users ||--o{ horseRaceRegistrations : owner_registers
  users ||--o{ horseRaceRegistrations : jockey_selected
  jockeyInvitations ||--o| horseRaceRegistrations : backs_pairing

  races ||--o{ raceEntries : has_entries
  horses ||--o{ raceEntries : competes
  users ||--o{ raceEntries : rides
  jockeyInvitations ||--o| raceEntries : becomes_entry

  races ||--o{ refereeReports : has_reports
  raceEntries ||--o{ refereeReports : reported_entry
  users ||--o{ refereeReports : referee_reports
```

## Notes

- `raceRefereeAssignments` is the real link between `races` and referee users. The old duplicated referee fields were removed from `races`.
- `jockeyRaceRegistrations` stores Jockey availability/approval per Race, not per Tournament.
- `horseRaceRegistrations` stores Owner Horse registration and later Owner-Jockey pairing approval for a specific Race.
- `raceEntries` is the official start-list row after Admin approval. It links a Race, Horse, and Jockey.
- Race state, entry approval state, check-in state, and result state are intentionally separate:
  - Race state: `draft`, `registration-open`, `registration-closed`, `published`, `in-progress`, `finished`, `completed`, `cancelled`.
  - Horse race registration approval: `pending-jockey`, `pending-admin`, `approved`, `rejected`, `cancelled`.
  - Race entry status: `approved`, `scratched`.
  - Check-in: `pending`, `ready`, `absent`, `incident`, `scratched`.
  - Result: `draft`, `submitted`, `official`, `disqualified`.
