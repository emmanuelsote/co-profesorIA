// Netlify Function: /.netlify/functions/alumno
// Pública (los alumnos no se registran). Dado un código de curso, devuelve
// SOLO lo mínimo necesario para mostrar el chat — nunca el material ni el
// email del docente ni datos de otros cursos.

import { getStore } from '@netlify/blobs';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'Body inválido' }, 400); }
  const { joinCode } = body;
  if (!joinCode) return json({ error: 'Falta el código del curso.' }, 400);

  const indices = getStore('indices');
  const cursos = getStore('cursos');

  const materiaId = await indices.get('joincode:' + joinCode.trim().toUpperCase());
  if (!materiaId) return json({ error: 'No encontramos ningún curso con ese código.' }, 404);

  const raw = await cursos.get('curso:' + materiaId);
  if (!raw) return json({ error: 'Curso no encontrado.' }, 404);
  const curso = JSON.parse(raw);

  return json({
    materiaId: curso.id,
    nombre: curso.nombre,
    nivel: curso.nivel,
    tieneMaterial: (curso.documentos || []).length > 0
  });
};
