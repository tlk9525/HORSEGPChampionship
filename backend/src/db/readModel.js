export const readTableOrder = {
  users: [{ column: 'id' }],
  tournaments: [{ column: 'id' }],
  horses: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  races: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  jockeyProfiles: [{ column: 'id' }],
  jockeyRaceRegistrations: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  jockeyInvitations: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  horseRaceRegistrations: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  raceEntries: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  raceRefereeAssignments: [
    { column: 'assignedAt', direction: 'DESC' },
    { column: 'id' },
  ],
  raceActionLogs: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  refereeReports: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  notifications: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  sessions: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'token' },
  ],
  bets: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  wallets: [{ column: 'userId' }],
  creditTransactions: [
    { column: 'createdAt', direction: 'DESC' },
    { column: 'id' },
  ],
  systemSettings: [{ column: 'key' }],
  raceClasses: [
    { column: 'sortOrder' },
    { column: 'name' },
  ],
};

// Chuyển một giá trị database sang kiểu boolean.
const bool = (value) => Boolean(value);

// Trả về thời điểm hiện tại theo định dạng ISO cho các giá trị mặc định.
const nowIso = () => new Date().toISOString();

// Chuẩn hóa giờ của race về định dạng HH:mm.
const formatRaceTime = (value) => {
  if (!value) return '';
  const [hours = '00', minutes = '00'] = String(value).split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Chuẩn hóa một giá trị ngày về định dạng YYYY-MM-DD.
const formatDateOnly = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
};

// Chuyển các row PostgreSQL thành read model thống nhất cho route và service.
export const buildReadModel = (rowsByTable = {}) => {
  const {
    users = [],
    tournaments = [],
    horses = [],
    races = [],
    jockeyProfiles = [],
    jockeyRaceRegistrations = [],
    jockeyInvitations = [],
    horseRaceRegistrations = [],
    raceEntries = [],
    raceRefereeAssignments = [],
    raceActionLogs = [],
    refereeReports = [],
    notifications = [],
    sessions = [],
    bets = [],
    wallets = [],
    creditTransactions = [],
    systemSettings = [],
    raceClasses = [],
  } = rowsByTable;

  const walletCreditsByUserId = new Map(
    wallets.map((wallet) => [wallet.userId, Number(wallet.credits ?? 0)])
  );
  const racesWithAssignments = races.map((race) => {
    const assignedReferees = raceRefereeAssignments.filter(
      (assignment) =>
        assignment.raceId === race.id && assignment.status !== 'removed'
    );
    const refereeIds = assignedReferees.map((assignment) => assignment.refereeUserId);

    return {
      ...race,
      date: formatDateOnly(race.raceDate || race.date),
      time: formatRaceTime(race.raceTime || race.time),
      refereeUserId: refereeIds[0] || race.refereeUserId || '',
      refereeUserIds: refereeIds.join(',') || race.refereeUserIds || race.refereeUserId || '',
      referee:
        assignedReferees.length > 0
          ? assignedReferees
              .map(
                (assignment) =>
                  users.find((user) => user.id === assignment.refereeUserId)?.name
              )
              .filter(Boolean)
              .join(', ')
          : race.referee,
    };
  });

  return {
    users: users.map((user) => ({
      ...user,
      loginStreak: Number(user.loginStreak || 0),
      lastLoginRewardDate: formatDateOnly(user.lastLoginRewardDate) || null,
      credits:
        user.role === 'spectator'
          ? walletCreditsByUserId.has(user.id)
            ? walletCreditsByUserId.get(user.id)
            : 100
          : null,
    })),
    wallets: wallets.map((wallet) => ({
      userId: wallet.userId,
      credits: Number(wallet.credits ?? 0),
      updatedAt: wallet.updatedAt || nowIso(),
    })),
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      startDate: formatDateOnly(tournament.startDate),
      finalDate: formatDateOnly(tournament.finalDate),
    })),
    horses,
    races: racesWithAssignments,
    jockeyProfiles,
    jockeyRaceRegistrations,
    jockeyInvitations,
    horseRaceRegistrations,
    raceEntries: raceEntries.map((entry) => ({
      ...entry,
      ownerConfirmed: bool(entry.ownerConfirmed),
      jockeyConfirmed: bool(entry.jockeyConfirmed),
      disqualified: bool(entry.disqualified),
    })),
    notifications: notifications.map((notification) => ({
      ...notification,
      type: notification.type || 'general',
      read: bool(notification.isRead),
      isRead: undefined,
    })),
    raceRefereeAssignments,
    raceActionLogs,
    refereeReports,
    sessions,
    bets: bets.map((bet) => ({
      ...bet,
      amount: Number(bet.amount),
      payout: Number(bet.payout ?? 0),
    })),
    creditTransactions: creditTransactions.map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
      balanceAfter: Number(transaction.balanceAfter),
    })),
    systemSettings,
    raceClasses: raceClasses.map((raceClass) => ({
      ...raceClass,
      ratingMin: Number(raceClass.ratingMin),
      ratingMax: Number(raceClass.ratingMax),
      handicapMin: Number(raceClass.handicapMin),
      handicapMax: Number(raceClass.handicapMax),
      sortOrder: Number(raceClass.sortOrder || 0),
      isActive: bool(raceClass.isActive),
    })),
  };
};
