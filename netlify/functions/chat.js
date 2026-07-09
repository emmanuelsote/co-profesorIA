// Función de Netlify: /.netlify/functions/chat
// Recibe { system, message } desde el navegador y llama a la API de Anthropic
// usando la clave API guardada como variable de entorno (nunca viaja al cliente).

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { estado: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // --- LOG TEMPORAL DE DIAGNÓSTICO: borrar estas 3 líneas cuando funciona ---
  console.log('DEBUG apiKey existe:', !!apiKey);
  console.log('DEBUG apiKey longitud:', apiKey ? apiKey.length : 0);
  console.log('DEBUG apiKey ultimos 4:', apiKey ? apiKey.slice(-4) : 'N/A');
  // --- REGISTRO TEMPORAL FINAL ---

  si (!apiKey) {
    devolver nueva Respuesta(
      JSON.stringify({ error: 'Falta configurar la variable de entorno ANTHROPIC_API_KEY en Netlify.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  intentar {
    const { sistema, mensaje } = await req.json();
    si (!mensaje) {
      return new Response(JSON.stringify({ error: 'Falta el mensaje.' }), { estado: 400 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      método: 'POST',
      encabezados: {
        'Content-Type': 'application/json',
        'x-api-key': clave de API,
        'versión antrópica': '2023-06-01'
      },
      cuerpo: JSON.stringify({
        modelo: 'claude-soneto-4-6',
        tokens_máximos: 1000,
        sistema: sistema || '',
        mensajes: [{ rol: 'usuario', contenido: mensaje }]
      })
    });

    const data = await anthropicRes.json();
    si (!anthropicRes.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error llamando a la API de Claude.' }), {
        estado: anthropicRes.status,
        encabezados: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      estado: 200,
      encabezados: { 'Content-Type': 'application/json' }
    });
  } capturar (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      estado: 500,
      encabezados: { 'Content-Type': 'application/json' }
    });
  }
};
