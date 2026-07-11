// Netlify Function: /.netlify/functions/docente
// Todas las acciones acá requieren un login válido de Netlify Identity
// (header Authorization: Bearer <token>). Cada docente solo puede ver y
// modificar los cursos que le pertenecen a SU email verificado — nunca
// se confía en un email que venga del navegador.

import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const user = await getUser();
  if (!user || !user.email) {
    return json({ error: 'No autenticado. Iniciá sesión de nuevo.' }, 401);
  }
  const email = user.email.toLowerCase();

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'Body inválido' }, 400); }
  const { action } = body;

  const cursos = getStore('cursos');
  const indices = getStore('indices');

  async function misCursosIds() {
    const raw = await indices.get('docente:' + email);
    return raw ? JSON.parse(raw) : [];
  }
  async function guardarMisCursosIds(ids) {
    await indices.set('docente:' + email, JSON.stringify(ids));
  }

  if (action === 'misCursos') {
    const ids = await misCursosIds();
    const lista = [];
    for (const id of ids) {
      const raw = await cursos.get('curso:' + id);
      if (raw) lista.push(JSON.parse(raw));
    }
    return json({ cursos: lista });
  }

  if (action === 'crearCurso') {
    const { nombre, nivel, tono } = body;
    if (!nombre) return json({ error: 'Falta el nombre del curso.' }, 400);
    const id = randomUUID();
    let joinCode = genJoinCode();
    for (let i = 0; i < 5; i++) {
      const existe = await indices.get('joincode:' + joinCode);
      if (!existe) break;
      joinCode = genJoinCode();
    }
    const curso = {
      id, docenteEmail: email, nombre, nivel: nivel || 'Secundario', tono: tono || 'cercano',
      joinCode, documentos: [], createdAt: new Date().toISOString()
    };
    await cursos.set('curso:' + id, JSON.stringify(curso));
    await indices.set('joincode:' + joinCode, id);
    const ids = await misCursosIds();
    ids.push(id);
    await guardarMisCursosIds(ids);
    return json({ curso });
  }

  // El resto de las acciones necesitan materiaId y verificar que el curso sea del docente logueado
  const { materiaId } = body;
  if (!materiaId) return json({ error: 'Falta materiaId.' }, 400);
  const raw = await cursos.get('curso:' + materiaId);
  if (!raw) return json({ error: 'Curso no encontrado.' }, 404);
  const curso = JSON.parse(raw);
  if (curso.docenteEmail !== email) {
    return json({ error: 'No tenés permiso sobre este curso.' }, 403);
  }

  if (action === 'eliminarCurso') {
    await cursos.delete('curso:' + materiaId);
    await cursos.delete('consultas:' + materiaId);
    await indices.delete('joincode:' + curso.joinCode);
    const ids = (await misCursosIds()).filter((x) => x !== materiaId);
    await guardarMisCursosIds(ids);
    return json({ ok: true });
  }

  if (action === 'agregarDocumento') {
    const { nombreDoc, texto } = body;
    if (!texto) return json({ error: 'Falta el texto del documento.' }, 400);
    curso.documentos = curso.documentos || [];
    curso.documentos.push({ nombre: nombreDoc || 'Documento', texto, chars: texto.length, addedAt: new Date().toISOString() });
    await cursos.set('curso:' + materiaId, JSON.stringify(curso));
    return json({ curso });
  }

  if (action === 'quitarDocumento') {
    const { idx } = body;
    curso.documentos.splice(idx, 1);
    await cursos.set('curso:' + materiaId, JSON.stringify(curso));
    return json({ curso });
  }

  if (action === 'stats') {
    const rawC = await cursos.get('consultas:' + materiaId);
    const consultas = rawC ? JSON.parse(rawC) : [];
    return json({ consultas });
  }

  return json({ error: 'Acción desconocida: ' + action }, 400);
};
