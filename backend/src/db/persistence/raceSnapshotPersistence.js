import { createHash } from 'node:crypto';
import { nowIso, rowTimestamps } from './persistenceHelpers.js';

const derivedRefereeAssignmentId = (raceId, refereeUserId) => {
  const digest = createHash('sha1')
    .update(`${raceId}:${refereeUserId}`)
    .digest('hex')
    .slice(0, 24);

  return `rra_${digest}`;
};

// Ghi snapshot tournament, horse, race và toàn bộ dữ liệu đăng ký/kết quả liên quan.
export const writeRaceSnapshot = async ({ db, writeRows }) => {
  await writeRows(
    'tournaments',
    [
      'id',
      'name',
      'status',
      'startDate',
      'finalDate',
      'location',
      'prizePool',
      'createdAt',
      'updatedAt',
    ],
    (db.tournaments || []).map((tournament) => ({
      ...tournament,
      startDate: tournament.startDate || null,
      finalDate: tournament.finalDate || null,
      ...rowTimestamps(tournament),
    })),
  );

  await writeRows(
    'horses',
    [
      'id',
      'name',
      'breed',
      'species',
      'age',
      'sex',
      'color',
      'weightLb',
      'heightCm',
      'baseHandicap',
      'speedRating',
      'staminaRating',
      'formRating',
      'healthRating',
      'overallRating',
      'healthStatus',
      'profileNotes',
      'ownerUserId',
      'status',
      'jockeyConfirmation',
      'veterinaryCertificateUrl',
      'createdAt',
      'updatedAt',
    ],
    (db.horses || []).map((horse) => ({
      ...horse,
      species: horse.species || '',
      sex: horse.sex || '',
      color: horse.color || '',
      weightLb: horse.weightLb ?? 0,
      heightCm: horse.heightCm ?? 0,
      baseHandicap: horse.baseHandicap ?? 0,
      speedRating: horse.speedRating ?? 75,
      staminaRating: horse.staminaRating ?? 75,
      formRating: horse.formRating ?? 75,
      healthRating: horse.healthRating ?? 75,
      overallRating: horse.overallRating ?? 75,
      healthStatus: horse.healthStatus || '',
      profileNotes: horse.profileNotes || '',
      createdAt: horse.createdAt || null,
      updatedAt: horse.updatedAt || horse.createdAt || null,
    })),
  );

  await writeRows(
    'races',
    [
      'id',
      'tournamentId',
      'name',
      'round',
      'raceNumber',
      'raceDate',
      'raceTime',
      'venue',
      'distance',
      'surface',
      'raceClass',
      'ratingMin',
      'ratingMax',
      'handicapMin',
      'handicapMax',
      'totalPrize',
      'status',
      'participants',
      'ownerConfirmed',
      'jockeyConfirmed',
      'registrationOpensAt',
      'registrationClosesAt',
      'resultStatus',
      'awardsPublished',
      'replayTimeline',
      'createdBy',
      'createdAt',
      'updatedAt',
    ],
    (db.races || []).map((race) => ({
      ...race,
      raceDate: race.raceDate || race.date || null,
      raceTime: race.raceTime || race.time || null,
      registrationOpensAt: race.registrationOpensAt || null,
      registrationClosesAt: race.registrationClosesAt || null,
      resultStatus: race.resultStatus || 'draft',
      awardsPublished: race.awardsPublished ?? false,
      replayTimeline: race.replayTimeline || null,
      ratingMin: race.ratingMin ?? 0,
      ratingMax: race.ratingMax ?? 140,
      handicapMin: race.handicapMin ?? null,
      handicapMax: race.handicapMax ?? null,
      raceNumber: race.raceNumber || '',
      createdAt: race.createdAt || null,
      updatedAt: race.updatedAt || race.createdAt || null,
    })),
  );

  await writeRows(
    'jockeyRaceRegistrations',
    ['id', 'raceId', 'jockeyUserId', 'status', 'createdAt', 'reviewedAt'],
    (db.jockeyRaceRegistrations || []).map((registration) => ({
      ...registration,
      reviewedAt: registration.reviewedAt || null,
    })),
  );

  await writeRows(
    'jockeyInvitations',
    [
      'id',
      'horseId',
      'ownerUserId',
      'jockeyUserId',
      'tournamentId',
      'raceId',
      'status',
      'adminStatus',
      'createdAt',
      'respondedAt',
    ],
    (db.jockeyInvitations || []).map((invitation) => ({
      ...invitation,
      tournamentId: invitation.tournamentId || null,
      raceId: invitation.raceId || null,
      adminStatus: invitation.adminStatus || null,
      respondedAt: invitation.respondedAt || null,
    })),
  );

  await writeRows(
    'horseRaceRegistrations',
    [
      'id',
      'tournamentId',
      'raceId',
      'horseId',
      'ownerUserId',
      'jockeyUserId',
      'invitationId',
      'status',
      'notes',
      'createdAt',
      'reviewedAt',
    ],
    (db.horseRaceRegistrations || []).map((registration) => ({
      ...registration,
      raceId: registration.raceId || null,
      jockeyUserId: registration.jockeyUserId || null,
      invitationId: registration.invitationId || null,
      status: registration.status || 'pending-jockey',
      notes: registration.notes || '',
      createdAt: registration.createdAt || nowIso(),
      reviewedAt: registration.reviewedAt || null,
    })),
  );

  const derivedRefereeAssignments = (db.raceRefereeAssignments || []).length
    ? db.raceRefereeAssignments
    : (db.races || []).flatMap((race) =>
        Array.from(
          new Set(
            String(race.refereeUserIds || race.refereeUserId || '')
              .split(',')
              .map((refereeUserId) => refereeUserId.trim())
              .filter(Boolean),
          ),
        ).map((refereeUserId) => ({
          id: derivedRefereeAssignmentId(race.id, refereeUserId),
          raceId: race.id,
          refereeUserId,
          assignedBy: race.createdBy || null,
          status: 'assigned',
          assignedAt:
            race.createdAt ||
            race.registrationOpensAt ||
            new Date().toISOString(),
        })),
      );

  await writeRows(
    'raceRefereeAssignments',
    ['id', 'raceId', 'refereeUserId', 'assignedBy', 'status', 'assignedAt'],
    derivedRefereeAssignments.map((assignment) => ({
      ...assignment,
      status: assignment.status || 'assigned',
      assignedAt: assignment.assignedAt || new Date().toISOString(),
    })),
  );

  await writeRows(
    'raceEntries',
    [
      'id',
      'raceId',
      'horseId',
      'jockeyUserId',
      'invitationId',
      'status',
      'lane',
      'handicap',
      'ratingSnapshot',
      'ratingChange',
      'postRaceRating',
      'ownerConfirmed',
      'jockeyConfirmed',
      'preRaceStatus',
      'disqualified',
      'resultStatus',
      'resultOutcome',
      'position',
      'finishTime',
      'notes',
      'incidentReason',
      'violationNotes',
      'createdAt',
    ],
    (db.raceEntries || []).map((entry) => ({
      ...entry,
      lane: entry.lane ?? null,
      handicap: entry.handicap ?? 0,
      ratingSnapshot: entry.ratingSnapshot ?? 0,
      ratingChange: entry.ratingChange ?? 0,
      postRaceRating: entry.postRaceRating ?? 0,
      ownerConfirmed: entry.ownerConfirmed ?? false,
      jockeyConfirmed: entry.jockeyConfirmed ?? false,
      preRaceStatus: entry.preRaceStatus || 'pending',
      disqualified: entry.disqualified ?? false,
      resultStatus: entry.resultStatus || 'draft',
      resultOutcome: entry.resultOutcome || 'finished',
      position: entry.position ?? null,
      finishTime: entry.finishTime || '',
      notes: entry.notes || '',
      incidentReason: entry.incidentReason || '',
      violationNotes: entry.violationNotes || '',
      invitationId: entry.invitationId || null,
      createdAt: entry.createdAt || null,
    })),
  );

  await writeRows(
    'raceActionLogs',
    [
      'id',
      'raceId',
      'userId',
      'action',
      'fromStatus',
      'toStatus',
      'details',
      'createdAt',
    ],
    (db.raceActionLogs || []).map((log) => ({
      ...log,
      userId: log.userId || null,
      fromStatus: log.fromStatus || null,
      toStatus: log.toStatus || null,
      details: log.details || '',
      createdAt: log.createdAt || nowIso(),
    })),
  );

  await writeRows(
    'refereeReports',
    [
      'id',
      'raceId',
      'raceEntryId',
      'refereeUserId',
      'reportType',
      'description',
      'violation',
      'status',
      'createdAt',
      'reviewedAt',
    ],
    (db.refereeReports || []).map((report) => ({
      ...report,
      raceEntryId: report.raceEntryId || null,
      reportType: report.reportType || 'incident',
      violation: report.violation || '',
      status: report.status || 'submitted',
      reviewedAt: report.reviewedAt || null,
    })),
  );

  await writeRows(
    'raceClasses',
    [
      'id',
      'name',
      'ratingMin',
      'ratingMax',
      'handicapMin',
      'handicapMax',
      'sortOrder',
      'isActive',
      'createdAt',
      'updatedAt',
      'updatedBy',
    ],
    (db.raceClasses || []).map((raceClass) => ({
      ...raceClass,
      ratingMin: Number(raceClass.ratingMin),
      ratingMax: Number(raceClass.ratingMax),
      handicapMin: Number(raceClass.handicapMin),
      handicapMax: Number(raceClass.handicapMax),
      sortOrder: Number(raceClass.sortOrder || 0),
      isActive: raceClass.isActive !== false,
      createdAt: raceClass.createdAt || nowIso(),
      updatedAt: raceClass.updatedAt || nowIso(),
      updatedBy: raceClass.updatedBy || null,
    })),
  );
};
