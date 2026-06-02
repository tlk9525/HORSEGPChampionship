export type WorkflowStatus = 'done' | 'current' | 'pending';

export const workflowSteps = [
  {
    id: 'create-tournament',
    title: 'Admin tạo giải đấu',
    owner: 'Admin',
    status: 'done' as WorkflowStatus,
  },
  {
    id: 'open-registration',
    title: 'Mở đăng ký',
    owner: 'Admin',
    status: 'done' as WorkflowStatus,
  },
  {
    id: 'horse-and-jockey-registration',
    title: 'Owner đăng ký ngựa, Jockey đăng ký tài khoản',
    owner: 'Owner / Jockey',
    status: 'done' as WorkflowStatus,
  },
  {
    id: 'approve-profile',
    title: 'Admin duyệt hồ sơ',
    owner: 'Admin',
    status: 'current' as WorkflowStatus,
  },
  {
    id: 'owner-select-jockey',
    title: 'Owner chọn Jockey',
    owner: 'Owner',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'jockey-confirm',
    title: 'Jockey xác nhận',
    owner: 'Jockey',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'admin-confirm-pairing',
    title: 'Admin duyệt ghép Horse-Jockey cho race',
    owner: 'Admin',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'schedule-referee',
    title: 'Admin lập lịch & phân công Referee',
    owner: 'Admin',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'race-confirmation',
    title: 'Owner + Jockey xác nhận race',
    owner: 'Owner / Jockey',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'prediction',
    title: 'Spectator dự đoán kết quả',
    owner: 'Spectator',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'pre-race-check',
    title: 'Referee kiểm tra trước đua',
    owner: 'Referee',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'live-race',
    title: 'Tiến hành cuộc đua',
    owner: 'System',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'referee-result',
    title: 'Referee xác nhận kết quả',
    owner: 'Referee',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'publish-result',
    title: 'Admin công bố kết quả',
    owner: 'Admin',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'rankings-rewards',
    title: 'Cập nhật BXH & tính thưởng dự đoán',
    owner: 'System',
    status: 'pending' as WorkflowStatus,
  },
  {
    id: 'award-close',
    title: 'Trao giải & kết thúc giải đấu',
    owner: 'Admin',
    status: 'pending' as WorkflowStatus,
  },
];

export const currentTournament = {
  id: 1,
  name: 'Summer Derby Classic',
  status: 'approvals',
  phase: 'Admin duyệt hồ sơ',
  registrationWindow: 'May 20 - May 31, 2026',
  startDate: 'June 10, 2026',
  finalDate: 'June 30, 2026',
  location: 'Churchill Downs',
  prizePool: '$750,000',
  round: 'Qualifier',
  image:
    'https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1200',
};

export const tournamentHorses = [
  {
    id: 1,
    name: 'Midnight Storm',
    breed: 'Thoroughbred',
    age: 4,
    owner: 'Sterling Stables',
    profileStatus: 'approved',
    selectedJockey: 'Marcus Sterling',
    jockeyStatus: 'confirmed',
    raceConfirmation: 'pending',
    lane: 1,
    odds: 2.5,
  },
  {
    id: 2,
    name: 'Silver Bullet',
    breed: 'Arabian',
    age: 5,
    owner: 'Phoenix Racing',
    profileStatus: 'approved',
    selectedJockey: 'Sarah Chen',
    jockeyStatus: 'pending',
    raceConfirmation: 'pending',
    lane: 2,
    odds: 3.2,
  },
  {
    id: 3,
    name: 'Racing Thunder',
    breed: 'Quarter Horse',
    age: 3,
    owner: 'Thunder Valley Ranch',
    profileStatus: 'pending',
    selectedJockey: 'Not selected',
    jockeyStatus: 'waiting-owner',
    raceConfirmation: 'blocked',
    lane: null,
    odds: 4.1,
  },
];

export const jockeyApplications = [
  {
    id: 1,
    name: 'Marcus Sterling',
    status: 'approved',
    linkedHorse: 'Midnight Storm',
    confirmation: 'confirmed',
  },
  {
    id: 2,
    name: 'Sarah Chen',
    status: 'approved',
    linkedHorse: 'Silver Bullet',
    confirmation: 'pending',
  },
  {
    id: 3,
    name: 'Diego Martinez',
    status: 'pending',
    linkedHorse: 'Unassigned',
    confirmation: 'waiting-owner',
  },
];

export const raceSchedule = [
  {
    id: 1,
    raceNumber: 'R1',
    name: 'Summer Derby Qualifier R1',
    date: 'June 10, 2026',
    time: '16:30',
    venue: 'Churchill Downs',
    distance: '1400m',
    surface: 'Turf',
    raceClass: 'Class A',
    handicapMin: 0,
    handicapMax: 5,
    registrationClosesAt: 'June 10, 2026 16:20',
    referee: 'Referee Olivia Grant',
    status: 'awaiting-confirmations',
    ownerConfirmed: 1,
    jockeyConfirmed: 1,
    participants: tournamentHorses.length,
  },
  {
    id: 2,
    raceNumber: 'R2',
    name: 'Summer Derby Sprint R2',
    date: 'June 12, 2026',
    time: '15:00',
    venue: 'Churchill Downs',
    distance: '1200m',
    surface: 'Dirt',
    raceClass: 'Class B',
    handicapMin: 2,
    handicapMax: 6,
    registrationClosesAt: 'June 12, 2026 14:50',
    referee: 'Referee Olivia Grant',
    status: 'registration-open',
    ownerConfirmed: 0,
    jockeyConfirmed: 0,
    participants: 0,
  },
  {
    id: 3,
    raceNumber: 'R3',
    name: 'Summer Derby Semi Final R3',
    date: 'June 20, 2026',
    time: '17:00',
    venue: 'Churchill Downs',
    distance: '1600m',
    surface: 'Turf',
    raceClass: 'Class A',
    handicapMin: 4,
    handicapMax: 8,
    registrationClosesAt: 'June 20, 2026 16:50',
    referee: 'Referee Olivia Grant',
    status: 'draft',
    ownerConfirmed: 0,
    jockeyConfirmed: 0,
    participants: 0,
  },
  {
    id: 4,
    raceNumber: 'R4',
    name: 'Summer Derby Final R4',
    date: 'June 30, 2026',
    time: '18:00',
    venue: 'Churchill Downs',
    distance: '1800m',
    surface: 'Turf',
    raceClass: 'Championship',
    handicapMin: 5,
    handicapMax: 10,
    registrationClosesAt: 'June 30, 2026 17:50',
    referee: 'Referee Olivia Grant',
    status: 'draft',
    ownerConfirmed: 0,
    jockeyConfirmed: 0,
    participants: 0,
  },
];

export const refereeChecklist = [
  {
    label: 'Horse identity and health check',
    status: 'pending',
  },
  {
    label: 'Jockey license and gear check',
    status: 'pending',
  },
  {
    label: 'Lane assignment verification',
    status: 'pending',
  },
  {
    label: 'Track and weather clearance',
    status: 'pending',
  },
];

export const predictionMarkets = [
  {
    id: 1,
    raceName: raceSchedule[0].name,
    window: 'June 10, 2026 12:00 - 16:00',
    status: 'opens-after-confirmations',
    horses: tournamentHorses.map((horse) => ({
      name: horse.name,
      odds: horse.odds,
    })),
  },
];

export const resultPipeline = {
  refereeConfirmed: false,
  adminPublished: false,
  rankingsUpdated: false,
  rewardsCalculated: false,
  awardsDelivered: false,
  winner: 'Pending',
};

export const statusLabel = (status: string) =>
  status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
