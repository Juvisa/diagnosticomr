export const config = { runtime: 'edge' };

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Guarda el lead directamente en Supabase desde el servidor ──
async function saveLeadToSupabase(leadData) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Supabase env vars missing');
    return;
  }
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(leadData),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Supabase save error:', res.status, err);
    }
  } catch (err) {
    console.error('Supabase fetch error:', err);
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo de solicitud inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const {
    cuestionario,
    nombre, telefono, nombre_negocio, industria,
    ingresos_actuales, meta_ingresos, cuestionario_completo,
  } = body || {};

  if (!cuestionario || typeof cuestionario !== 'string' || cuestionario.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'Cuestionario inválido o vacío' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8000,
        stream: true,
        messages: [
          {
            role: 'user',
            content: `${PROMPT_MAESTRO}\n\n---\nCUESTIONARIO DEL EMPRENDEDOR:\n\n${cuestionario.trim()}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      console.error('Anthropic API error:', anthropicRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Error al conectar con el motor de análisis' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAnalysis = '';  // acumula el análisis completo en el servidor

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6).trim();
              if (!data || data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (
                  parsed.type === 'content_block_delta' &&
                  parsed.delta?.type === 'text_delta' &&
                  parsed.delta?.text
                ) {
                  const text = parsed.delta.text;
                  fullAnalysis += text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  );
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }

          // ✅ Guardado en Supabase desde el servidor — siempre se ejecuta
          await saveLeadToSupabase({
            nombre: nombre || null,
            telefono: telefono || null,
            nombre_negocio: nombre_negocio || null,
            industria: industria || null,
            ingresos_actuales: ingresos_actuales || null,
            meta_ingresos: meta_ingresos || null,
            cuestionario_completo: cuestionario_completo || null,
            analisis_generado: fullAnalysis,
          });

        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('Handler error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
