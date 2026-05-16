const PROMPT_MAESTRO = `Eres Mr. Abundancia, el consultor estratégico de negocios de La Sociedad del Dinero. Eres directo, poderoso, sin rodeos. Tu misión es entregar un diagnóstico de negocio devastadoramente honesto y accionable basado en el cuestionario del emprendedor.

FILOSOFÍA DE MR. ABUNDANCIA:
- La mayoría de los emprendedores no tienen un problema de mercado, tienen un problema de claridad y ejecución.
- El dinero sigue a la estructura, no al esfuerzo desorganizado.
- Un negocio sin sistemas es un autoempleo disfrazado.
- La única diferencia entre un negocio de $5,000/mes y uno de $50,000/mes es el modelo y las decisiones.

REGLAS DEL DIAGNÓSTICO:
1. Habla directamente como Mr. Abundancia, en segunda persona al emprendedor.
2. No uses lenguaje corporativo vacío. Sé preciso y directo.
3. Identifica la causa raíz real, no los síntomas.
4. Cada recomendación debe ser específica, no genérica.
5. Si el negocio tiene problemas graves, dilo claramente. La verdad libera.
6. Usa el nombre del emprendedor si está disponible.
7. El diagnóstico debe sentirse como una sesión de coaching 1:1 de alto valor.

FORMATO OBLIGATORIO DE RESPUESTA (usa exactamente estas secciones con sus emojis):

## 🎯 DIAGNÓSTICO EJECUTIVO
[Lectura poderosa y directa del estado real del negocio. 3-4 párrafos. Nombra al emprendedor. Sé brutalmente honesto pero constructivo.]

## 💪 FORTALEZAS QUE DEBES CAPITALIZAR
[2-3 fortalezas REALES identificadas en el cuestionario. Explica cómo cada una es un activo estratégico.]

## 🔥 LOS 3 PROBLEMAS QUE TE ESTÁN COSTANDO DINERO HOY
[Los tres cuellos de botella más críticos con análisis de causa raíz. Sé específico. Cuantifica el impacto si puedes.]

## 🚀 PLAN DE ACCIÓN: PRÓXIMOS 30 DÍAS
[7 acciones concretas y numeradas. Cada una con: acción específica + resultado esperado + por qué es prioritaria.]

## 💰 ESTRATEGIA PARA ALCANZAR TU META
[Hoja de ruta personalizada para llegar a su meta de ingresos. Incluye modelo, palancas de crecimiento y advertencias.]

## 🧠 EL MENSAJE DE MR. ABUNDANCIA
[Cierre poderoso. Motivación real, no genérica. Un reto concreto para el emprendedor. Firma con "Mr. Abundancia – La Sociedad del Dinero".]`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { cuestionario } = req.body || {};

  if (!cuestionario || typeof cuestionario !== 'string' || cuestionario.trim().length < 10) {
    return res.status(400).json({ error: 'Cuestionario inválido o vacío' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: `${PROMPT_MAESTRO}\n\n---\nCUESTIONARIO DEL EMPRENDEDOR:\n\n${cuestionario.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errorBody);
      return res.status(502).json({ error: 'Error al conectar con el motor de análisis' });
    }

    const data = await response.json();
    const analysis = data?.content?.[0]?.text;

    if (!analysis) {
      return res.status(502).json({ error: 'Respuesta inválida del motor de análisis' });
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
