# Horse Racing Tournament Management System - ERD

> This ERD is based on the current PostgreSQL schema in `database/postgres/schema.sql`.
> Some relationships are logical relationships from ID columns because the current schema does not declare explicit foreign key constraints.

```mermaid
erDiagram
  USERS {
    varchar id PK
    varchar name
    varchar email UK
    varchar password
    varchar role
    varchar status
  }

  TOURNAMENTS {
    varchar id PK
    varchar name
    varchar status
    varchar registrationWindow
    varchar startDate
    varchar finalDate
    varchar location
    numeric prizePool
  }

  HORSES {
    varchar id PK
    varchar name
    varchar breed
    varchar species
    int age
    varchar sex
    varchar color
    numeric weightKg
    numeric heightCm
    numeric baseHandicap
    numeric speedRating
    numeric staminaRating
    numeric formRating
    numeric healthRating
    numeric overallRating
    varchar healthStatus
    text profileNotes
    varchar ownerUserId FK
    varchar status
    varchar selectedJockeyUserId FK
    varchar jockeyConfirmation
    text veterinaryCertificateUrl
    varchar createdAt
  }

  JOCKEY_PROFILES {
    varchar id PK
    varchar userId FK_UK
    text bio
    text certificate
    varchar competitionLevel
    numeric weight
    varchar status
    varchar updatedAt
  }

  JOCKEY_TOURNAMENT_REGISTRATIONS {
    varchar id PK
    varchar tournamentId FK
    varchar jockeyUserId FK
    varchar status
    varchar createdAt
    varchar reviewedAt
  }

  RACES {
    varchar id PK
    varchar tournamentId FK
    varchar raceNumber
    varchar name
    varchar round
    varchar date
    varchar time
    varchar venue
    varchar distance
    varchar surface
    varchar raceClass
    numeric handicapMin
    numeric handicapMax
    numeric totalPrize
    varchar refereeUserId FK
    text refereeUserIds
    varchar referee
    varchar status
    int participants
    int ownerConfirmed
    int jockeyConfirmed
    int registrationPeriodMinutes
    varchar registrationOpensAt
    varchar registrationClosesAt
    varchar resultStatus
    boolean awardsPublished
    varchar createdBy FK
    varchar createdAt
  }

  JOCKEY_INVITATIONS {
    varchar id PK
    varchar horseId FK
    varchar ownerUserId FK
    varchar jockeyUserId FK
    varchar tournamentId FK
    varchar raceId FK
    varchar status
    varchar adminStatus
    varchar createdAt
    varchar respondedAt
  }

  RACE_ENTRIES {
    varchar id PK
    varchar raceId FK
    varchar horseId FK
    varchar jockeyUserId FK
    varchar invitationId FK
    varchar status
    int lane
    numeric handicap
    numeric ratingSnapshot
    boolean ownerConfirmed
    boolean jockeyConfirmed
    varchar preRaceStatus
    boolean disqualified
    varchar resultStatus
    int position
    varchar finishTime
    text notes
    text violationNotes
    varchar createdAt
  }

  NOTIFICATIONS {
    varchar id PK
    varchar userId FK
    varchar title
    text message
    boolean isRead
    varchar createdAt
  }

  SESSIONS {
    varchar token PK
    varchar userId FK
    varchar createdAt
  }

  USERS ||--o{ HORSES : "owns"
  USERS ||--o| JOCKEY_PROFILES : "has profile"
  USERS ||--o{ JOCKEY_TOURNAMENT_REGISTRATIONS : "joins as jockey"
  USERS ||--o{ JOCKEY_INVITATIONS : "owner sends"
  USERS ||--o{ JOCKEY_INVITATIONS : "jockey receives"
  USERS ||--o{ RACE_ENTRIES : "rides as jockey"
  USERS ||--o{ RACES : "creates or referees"
  USERS ||--o{ NOTIFICATIONS : "receives"
  USERS ||--o{ SESSIONS : "logs in"

  TOURNAMENTS ||--o{ RACES : "contains"
  TOURNAMENTS ||--o{ JOCKEY_TOURNAMENT_REGISTRATIONS : "approves jockeys"
  TOURNAMENTS ||--o{ JOCKEY_INVITATIONS : "context"

  HORSES ||--o{ JOCKEY_INVITATIONS : "invited for"
  HORSES ||--o{ RACE_ENTRIES : "competes in"

  RACES ||--o{ RACE_ENTRIES : "has entries"
  RACES ||--o{ JOCKEY_INVITATIONS : "registration request"

  JOCKEY_INVITATIONS ||--o| RACE_ENTRIES : "can create"
```

## Main Business Meaning

- `users` stores all roles: Admin, Owner, Jockey, Referee, Spectator.
- `tournaments` is the parent event.
- `races` belongs to a tournament. One tournament can have multiple races.
- `horses` belongs to an owner.
- `jockeyProfiles` stores public jockey information.
- `jockeyTournamentRegistrations` stores jockey requests to join a tournament.
- `raceEntries` stores approved or pending horse participation in a race.
- `jockeyInvitations` supports owner-to-jockey invitations before race entry approval.
- `notifications` stores messages sent to users.
- `sessions` stores login sessions.

## Important Business Rules Reflected

- One owner can own many horses.
- One jockey can have one jockey profile.
- One tournament can have many races.
- One race can have many race entries.
- Each race entry links one race, one horse, and one jockey.
- Jockeys must be approved in `jockeyTournamentRegistrations` before owners can select them for the same tournament.
- Race results are stored on `raceEntries` through `position`, `finishTime`, `resultStatus`, `notes`, and `violationNotes`.
