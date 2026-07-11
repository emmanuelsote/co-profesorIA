export default async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const diagnostico = {
    variable_existe: !!apiKey,
    longitud: apiKey ? apiKey.length : 0,
    empieza_con: apiKey ? apiKey.slice(0, 10) + '...' : null,
    termina_con: apiKey ? '...' + apiKey.slice(-6) : null,
    tiene_espacios_o_saltos_de_linea: apiKey ? /\s/.test(apiKey) : null
  };

  if (!apiKey) {
    return new Response(JSON.stringify({ diagnostico, prueba_real: 'No se probó porque no hay key.' }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let pruebaReal;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'di solo la palabra ok' }]
      })
    });
    const data = await r.json();
    pruebaReal = { status_http: r.status, respuesta_de_anthropic: data };
  } catch (e) {
    pruebaReal = { error_de_red: e.message };
  }

  return new Response(JSON.stringify({ diagnostico, prueba_real: pruebaReal }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
