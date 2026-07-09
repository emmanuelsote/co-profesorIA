// Netlify Function: /.netlify/functions/storage
// Guarda y lee datos (cursos, documentos, consultas) usando Netlify Blobs,
// para que persistan online entre docentes y alumnos distintos.

import { getStore } from '@netlify/blobs';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  try {
    const store = getStore('coprofesor');
    const body = await req.json();
    const { action, key, value, prefix } = body;

    if (!action || !key && action !== 'list') {
      return json({ error: 'Falta action o key.' }, 400);
    }

    if (action === 'get') {
      const v = await store.get(key);
      return json({ key, value: v });
    }

    if (action === 'set') {
      await store.set(key, value);
      return json({ key, value });
    }

    if (action === 'delete') {
      await store.delete(key);
      return json({ key, deleted: true });
    }

    if (action === 'list') {
      const { blobs } = await store.list({ prefix: prefix || '' });
      return json({ keys: blobs.map((b) => b.key) });
    }

    return json({ error: 'Acción desconocida: ' + action }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};
