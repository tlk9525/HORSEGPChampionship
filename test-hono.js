import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

serve({ fetch: app.fetch, port: 4001 }, () => {
  console.log('Test server running at http://127.0.0.1:4001');
});
