import { EventEmitter } from 'node:events';

const liveRaceEvents = new EventEmitter();
liveRaceEvents.setMaxListeners(100);

// Tạo tên sự kiện SSE theo dạng 'race:{raceId}' để nhận diện cuộc đua cụ thể
const eventName = (raceId) => `race:${raceId}`;

// Phát sóng cập nhật của một cuộc đua tới tất cả client đang lắng nghe qua EventEmitter
export const broadcastRaceUpdate = (raceId) => {
  if (!raceId) return;
  const payload = {
    raceId,
    updatedAt: new Date().toISOString(),
  };

  for (const listener of liveRaceEvents.listeners(eventName(raceId))) {
    try {
      listener(payload);
    } catch (error) {
      console.error('Failed to broadcast race update', error);
      liveRaceEvents.off(eventName(raceId), listener);
    }
  }
};

export const __liveRaceEventsForTest = liveRaceEvents;

// Thiết lập kết nối Server-Sent Events (SSE) để truyền sống cập nhật của cuộc đua đến client
// Trả về một Response chuẩn Web API tương thích với Hono
export const streamRaceUpdates = (req, raceId) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    // Ghi chú: Hàm này mở luồng SSE, gửi dữ liệu ban đầu và đăng ký listener cập nhật race.
    start(controller) {
      // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến send event.
      const sendEvent = (payload) => {
        const text = `event: race-update\ndata: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(text));
      };

      // Gửi sự kiện khởi tạo ngay khi client kết nối
      sendEvent({ raceId, updatedAt: new Date().toISOString(), initial: true });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          liveRaceEvents.off(eventName(raceId), listener);
          controller.close();
        }
      }, 25000);

      // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến listener.
      const listener = (payload) => {
        try {
          sendEvent(payload);
        } catch (error) {
          clearInterval(heartbeat);
          liveRaceEvents.off(eventName(raceId), listener);
          controller.close();
        }
      };
      liveRaceEvents.on(eventName(raceId), listener);

      // Dọn dẹp khi client ngắt kết nối
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        liveRaceEvents.off(eventName(raceId), listener);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
