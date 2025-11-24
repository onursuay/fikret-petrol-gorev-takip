import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Supabase Auth callback handler
  // This will be implemented with Supabase authentication
  
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  // TODO: Exchange code for session with Supabase
  // For now, redirect to home
  res.redirect('/');
}
