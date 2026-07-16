import { SESSION_COOKIE_NAME } from '../config/constants.js';

// Trả về thông tin user công khai, loại bỏ trường password để tránh lộ thông tin nhạy cảm
export const publicUser = ({ password, emailVerificationTokenHash, emailVerificationExpiresAt, emailVerificationSentAt, ...user }) => user;

const cookieToken = (req) => {
  const cookieHeader =
    (typeof req.headers?.get === 'function'
      ? req.headers.get('cookie')
      : req.headers?.cookie) || '';

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1) || '';
};

// Xác thực bằng HttpOnly cookie; Bearer token vẫn được chấp nhận trong giai đoạn chuyển đổi.
export const authenticate = async (req, db) => {
  const header =
    (typeof req.headers?.get === 'function'
      ? req.headers.get('authorization')
      : req.headers?.authorization) || '';
  const token = cookieToken(req) || (header.startsWith('Bearer ') ? header.slice(7) : '');
  const session = db.sessions.find((item) => item.token === token);

  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = db.users.find((item) => item.id === session.userId);
  return user?.status === 'active' ? publicUser(user) : null;
};

// Kiểm tra xác thực và phân quyền, trả về user nếu có role hợp lệ, null nếu không được phép
export const requireRole = async (req, db, roles) => {
  const user = await authenticate(req, db);

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return user;
};
