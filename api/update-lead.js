export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).end();

  const password = req.headers['x-dashboard-password'];
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado' });
  }

  const { id, estado } = req.body || {};
  const VALID_STATES = ['nuevo', 'aplica', 'no_aplica', 'seguimiento'];

  if (!id || !estado || !VALID_STATES.includes(estado)) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ estado }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase patch error:', err);
      return res.status(502).json({ error: 'Error al actualizar lead' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('update-lead error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
