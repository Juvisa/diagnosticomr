export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dashboard-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const password = req.headers['x-dashboard-password'];
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado' });
  }

  try {
    const { estado } = req.query;
    let url = `${process.env.SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`;
    if (estado && estado !== 'todos') {
      url += `&estado=eq.${encodeURIComponent(estado)}`;
    }

    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase get error:', err);
      return res.status(502).json({ error: 'Error al obtener leads' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('get-leads error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
