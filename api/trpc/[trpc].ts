import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';

const handler = createHTTPHandler({
  router: appRouter,
  createContext,
});

export default async function (req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return handler(req, res);
}
