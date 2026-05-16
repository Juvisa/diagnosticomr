export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado' });
  }

  const {
    nombre, telefono, nombre_negocio, industria,
    ingresos_actuales, meta_ingresos,
    cuestionario_completo, analisis_generado,
  } = req.body || {};

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        nombre, telefono, nombre_negocio, industria,
        ingresos_actuales, meta_ingresos,
        cuestionario_completo, analisis_generado,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase save error:', err);
      return res.status(502).json({ error: 'Error al guardar lead' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('save-lead error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
