import { BootstrapPayload, BootstrapScope } from './types';

const API_URL = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

const BOOTSTRAP_CACHE_TTL_MS = 10_000;
const bootstrapCache = new Map<
  BootstrapScope,
  { data: BootstrapPayload; fetchedAt: number }
>();
const bootstrapRequests = new Map<BootstrapScope, Promise<BootstrapPayload>>();

// Xóa toàn bộ scoped read model sau mỗi mutation để màn hình kế tiếp đọc dữ liệu mới.
const invalidateBootstrapCache = () => {
  bootstrapCache.clear();
  bootstrapRequests.clear();
};

// Tạo URL kết nối Server-Sent Events (SSE) để theo dõi cập nhật trực tiếp của một cuộc đua.
export const getLiveRaceEventsUrl = (raceId: string) =>
  `${API_URL}/live/races/${encodeURIComponent(raceId)}/events`;

// HTTP client chung: gửi session cookie, chuẩn hóa lỗi và invalidate read cache sau mutation.
export const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const method = String(options.method || 'GET').toUpperCase();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  if (method !== 'GET') {
    invalidateBootstrapCache();
  }

  return data;
};

// Lấy read model theo màn hình; mỗi scope có cache và request đang chạy riêng.
export const getBootstrap = async ({
  force = false,
  scope = 'full',
}: { force?: boolean; scope?: BootstrapScope } = {}) => {
  const now = Date.now();
  const cached = bootstrapCache.get(scope);

  if (!force && cached && now - cached.fetchedAt < BOOTSTRAP_CACHE_TTL_MS) {
    return cached.data;
  }

  const pendingRequest = bootstrapRequests.get(scope);
  if (!force && pendingRequest) {
    return pendingRequest;
  }

  const path = scope === 'full' ? '/bootstrap' : `/bootstrap/${scope}`;
  const bootstrapRequest = request<BootstrapPayload>(path)
    .then((data) => {
      bootstrapCache.set(scope, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      bootstrapRequests.delete(scope);
    });

  bootstrapRequests.set(scope, bootstrapRequest);
  return bootstrapRequest;
};
