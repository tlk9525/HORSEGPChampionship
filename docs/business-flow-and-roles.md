# Horse Racing Tournament Business Flow and Role Permissions

## 1. Overall Business Flow

1. Admin creates a Tournament.
2. Admin creates multiple Races under that Tournament, for example 10 races.
3. Each Race has its own independent registration lifecycle.
4. Admin opens registration for a Race.
5. Owner registers an approved Horse for that Race.
6. Jockey registers availability for the same Race, or Owner invites a Jockey who is available for that Race.
7. Jockey accepts or rejects the riding invitation.
8. Admin approves the Horse race registration or Owner-Jockey pairing.
9. When registration closes, the system automatically snapshots horse rating, calculates assigned weight, randomizes lane assignment, and creates the start list.
10. Admin publishes the start list.
11. Referee performs check-in for assigned races, including horse, jockey, equipment, and carried-weight checks.
12. Referee marks each participant as Ready, Absent, Scratched, or Incident as needed.
13. Admin starts the Race after at least one participant is Ready and all participants are checked.
14. Admin finishes the Race.
15. Referee records position, finish time, notes, violations, and penalties.
16. Referee submits draft results for Admin review.
17. Admin approves official results.
18. The system updates horse rating from official results.
19. The Race moves to Completed.

## 2. Role Permissions

### Admin

- Create and manage Tournaments.
- Create and configure Races.
- Select Race Class and assigned weight bounds.
- Assign Referees.
- Approve Owner, Jockey, Horse, Jockey race registration, Horse race registration, and Owner-Jockey pairing requests.
- Open and close Race registration.
- Publish the start list.
- Start and finish a Race.
- Approve official results.

### Owner

- Register an Owner account.
- Create Horse profiles.
- Register an approved Horse into an open Race.
- Invite or select a Jockey who is available for the same Race.
- Submit Horse race registration requests.
- Cannot start or finish races.
- Cannot submit or approve results.

### Jockey

- Register a Jockey account.
- Create and maintain a Jockey profile, including weight, certificate, and experience.
- Register availability for a Race.
- Accept or reject Owner invitations.
- Cannot create official Race Entries alone.
- Cannot manage races.
- Cannot submit or approve results.

### Referee

- View assigned Races.
- Perform check-in.
- Mark participants Ready, Absent, Scratched, or Incident.
- Record position, finish time, notes, violations, and penalties after Admin finishes the Race.
- Submit draft results for Admin review.
- Cannot start or finish races.
- Cannot approve official results.

### System

- Applies top weight and minimum weight from Race Class.
- Snapshots Horse Rating when registration closes.
- Calculates Assigned Weight.
- Assigns random lanes.
- Generates the start list.
- Updates Horse Rating only after Admin approves official results.

### Spectator

- View public Tournaments.
- View Race Cards.
- View published start lists.
- View live race status.
- View official results.

## 3. Race Lifecycle

Race state is separate from entry approval, check-in, and result state.

```text
Draft
Registration Open
Registration Closed
Published
Check-in
In Progress
Finished
Results Submitted
Completed
Cancelled
```

Implementation note: the current app represents `Check-in` through `published` Race status plus per-entry `preRaceStatus`. It represents `Results Submitted` through Race `status = finished` plus `resultStatus = submitted`.

## 4. Race Registration Approval Lifecycle

Registration approval state describes whether the horse and selected jockey are accepted into the race.

```text
Pending Jockey Acceptance
Pending Admin Approval
Approved
Rejected
Cancelled
```

## 5. Check-in Status

Check-in status belongs to each Race Entry.

```text
Pending Check-in
Ready
Absent
Incident
Scratched
```

## 6. Result Status

Result status belongs to the Race and each Race Entry.

```text
Draft
Submitted
Official
Disqualified
```

## 7. Important Business Rules

- A Tournament contains many Races.
- Horses register for individual Races, not for the Tournament globally.
- Each Race has its own registration window and approval process.
- A Horse cannot enter another active Race in the same Tournament until its current Race is Completed or Cancelled.
- A Jockey must be available or approved for the same Race before Owner can select them.
- Referee submits draft results only.
- Admin approval is required before results become official and before Horse Rating changes.
- `horseRaceRegistrations` handles approval before a row is created in the official start list.
- `raceEntries` is the official start-list row after Admin approval.
- `Scratched` is used after publishing or during check-in because of absence, health, equipment, weight, or other referee/admin decision.
