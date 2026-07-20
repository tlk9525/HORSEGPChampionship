import { randomUUID } from 'node:crypto';
import { USER_ROLES } from '../../config/constants.js';
import { publicUser } from '../../services/authService.js';
import { raceCarriedWeightRange } from '../../services/handicapService.js';
import {
  sanitizeSystemSettings,
  settingsToRows,
  systemSettingsFromDb,
} from '../../services/systemSettingsService.js';

const userRoleValues = Object.values(USER_ROLES);
const userStatuses = ['pending', 'active', 'rejected', 'suspended', 'locked'];

const sortedPublicUsers = (db) =>
  [...(db.users || [])]
    .sort((first, second) => {
      const firstDate = new Date(first.createdAt || 0).getTime();
      const secondDate = new Date(second.createdAt || 0).getTime();
      return secondDate - firstDate || first.name.localeCompare(second.name);
    })
    .map(publicUser);

const activeAdminCount = (db) =>
  (db.users || []).filter((user) => user.role === 'admin' && user.status === 'active').length;

export const sortedRaceClasses = (db, { activeOnly = false } = {}) =>
  [...(db.raceClasses || [])]
    .filter((raceClass) => !activeOnly || raceClass.isActive !== false)
    .sort(
      (first, second) =>
        Number(first.sortOrder || 0) - Number(second.sortOrder || 0) ||
        String(first.name).localeCompare(String(second.name))
    );

const sanitizeRaceClass = (input, current = {}) => {
  const raceClass = {
    name: String(input.name ?? current.name ?? '').trim(),
    ratingMin: Number(input.ratingMin ?? current.ratingMin),
    ratingMax: Number(input.ratingMax ?? current.ratingMax),
    handicapMin: Number(input.handicapMin ?? current.handicapMin),
    handicapMax: Number(input.handicapMax ?? current.handicapMax),
    sortOrder: Number(input.sortOrder ?? current.sortOrder ?? 0),
    isActive:
      input.isActive === undefined
        ? current.isActive !== false
        : input.isActive === true,
  };

  if (!raceClass.name) return { message: 'Race class name is required' };
  if (raceClass.name.length > 128) return { message: 'Race class name is too long' };
  if (
    !Number.isFinite(raceClass.ratingMin) ||
    !Number.isFinite(raceClass.ratingMax) ||
    raceClass.ratingMin < 0 ||
    raceClass.ratingMax > 140 ||
    raceClass.ratingMin > raceClass.ratingMax
  ) {
    return { message: 'Rating range must be between 0 and 140' };
  }
  if (!raceCarriedWeightRange(raceClass)) {
    return { message: 'Assigned weights must be positive and minimum cannot exceed top weight' };
  }
  if (!Number.isInteger(raceClass.sortOrder) || raceClass.sortOrder < 0) {
    return { message: 'Display order must be a non-negative whole number' };
  }

  return { raceClass };
};

// Đăng ký các route quản lý user, system settings và race class catalog.
export const registerAdminConfigurationRoutes = (
  app,
  { writeDb, persistSystemSettings }
) => {
  app.get('/users', (c) => {
    const db = c.get('db');
    return c.json({ users: sortedPublicUsers(db) });
  });

  app.get('/settings', (c) => {
    const db = c.get('db');
    return c.json({ settings: systemSettingsFromDb(db) });
  });

  app.patch('/settings', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const current = systemSettingsFromDb(db);
    const input = await c.req.json();
    const settings = sanitizeSystemSettings(input, current);
    const settingsRows = settingsToRows(settings, user.id, new Date().toISOString());

    if (persistSystemSettings) {
      await persistSystemSettings(settingsRows);
    } else {
      db.systemSettings = settingsRows;
      await writeDb(db);
    }

    return c.json({ settings });
  });

  app.get('/race-classes', (c) => {
    return c.json({ raceClasses: sortedRaceClasses(c.get('db')) });
  });

  app.post('/race-classes', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const result = sanitizeRaceClass(await c.req.json());
    if (result.message) return c.json({ message: result.message }, 400);

    const duplicate = (db.raceClasses || []).some(
      (item) => item.name.toLowerCase() === result.raceClass.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: 'Race class name already exists' }, 409);

    const now = new Date().toISOString();
    const raceClass = {
      id: randomUUID(),
      ...result.raceClass,
      createdAt: now,
      updatedAt: now,
      updatedBy: user.id,
    };
    db.raceClasses = db.raceClasses || [];
    db.raceClasses.push(raceClass);
    await writeDb(db);

    return c.json({ raceClass, raceClasses: sortedRaceClasses(db) }, 201);
  });

  app.patch('/race-classes/:raceClassId', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const raceClass = (db.raceClasses || []).find(
      (item) => item.id === c.req.param('raceClassId')
    );
    if (!raceClass) return c.json({ message: 'Race class not found' }, 404);

    const result = sanitizeRaceClass(await c.req.json(), raceClass);
    if (result.message) return c.json({ message: result.message }, 400);

    const duplicate = db.raceClasses.some(
      (item) =>
        item.id !== raceClass.id &&
        item.name.toLowerCase() === result.raceClass.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: 'Race class name already exists' }, 409);

    Object.assign(raceClass, result.raceClass, {
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    });
    await writeDb(db);

    return c.json({ raceClass, raceClasses: sortedRaceClasses(db) });
  });

  app.patch('/users/:id', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const { role, status } = await c.req.json();
    const target = (db.users || []).find((user) => user.id === id);

    if (!target) return c.json({ message: 'User not found' }, 404);
    if (!userRoleValues.includes(role)) return c.json({ message: 'Invalid role' }, 400);
    if (!userStatuses.includes(status)) return c.json({ message: 'Invalid status' }, 400);
    if (target.id === currentUser.id && (role !== 'admin' || status !== 'active')) {
      return c.json({ message: 'You cannot remove your own active admin access' }, 400);
    }
    if (
      target.role === 'admin' &&
      target.status === 'active' &&
      (role !== 'admin' || status !== 'active') &&
      activeAdminCount(db) <= 1
    ) {
      return c.json({ message: 'At least one active admin is required' }, 400);
    }

    target.role = role;
    target.status = status;
    target.updatedAt = new Date().toISOString();
    await writeDb(db);

    return c.json({ user: publicUser(target), users: sortedPublicUsers(db) });
  });

  app.delete('/users/:id', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const target = (db.users || []).find((user) => user.id === id);

    if (!target) return c.json({ message: 'User not found' }, 404);
    if (target.id === currentUser.id) {
      return c.json({ message: 'You cannot disable your own account' }, 400);
    }
    if (target.role === 'admin' && target.status === 'active' && activeAdminCount(db) <= 1) {
      return c.json({ message: 'At least one active admin is required' }, 400);
    }

    target.status = 'suspended';
    target.updatedAt = new Date().toISOString();
    await writeDb(db);

    return c.json({ user: publicUser(target), users: sortedPublicUsers(db) });
  });
};
