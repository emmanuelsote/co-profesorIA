// Netlify Function: /.netlify/functions/chat
// Recibe { system, messages } desde el navegador y llama a la API de Anthropic
// usando la API key guardada como variable de entorno (nunca viaja al cliente).
// "messages" es el historial completo de la conversación (para que la IA
// tenga memoria de lo que se habló antes en ese chat).

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Falta configurar la variable de entorno ANTHROPIC_API_KEY en Netlify.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { system, messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Falta el historial de mensajes.' }), { status: 400 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system || '',
        messages
      })
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error llamando a la API de Claude.' }), {
        status: anthropicRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

