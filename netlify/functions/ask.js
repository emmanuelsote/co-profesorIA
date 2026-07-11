// Netlify Function: /.netlify/functions/ask
// Acá vive toda la conversación con la IA. El material del curso se lee
// del lado del servidor y JAMÁS se manda al navegador del alumno —
// solo la respuesta de la IA sale para afuera. Cada consulta queda
// guardada con el nombre del alumno para el reporte del docente.

import { getStore } from '@netlify/blobs';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function modeInstruction(mode) {
  switch (mode) {
    case 'simple': return 'El alumno pidió que le expliques el tema de forma muy simple, como si tuviera 12 años, con ejemplos cotidianos.';
    case 'pista': return 'El alumno no quiere la respuesta completa, quiere solo una pista, sin resolverle el tema.';
    case 'evaluame': return 'En vez de responder directamente, generá una pregunta de evaluación sobre el tema, basada en el material.';
    case 'resumen': return 'Generá un resumen breve y ordenado del tema consultado, basado exclusivamente en el material.';
    default: return '';
  }
}

const MAX_CONSULTAS_POR_CURSO = 300;
const MAX_MENSAJES_EN_MEMORIA = 16;

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'Falta configurar ANTHROPIC_API_KEY en Netlify.' }, 500);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'Body inválido' }, 400); }
  const { materiaId, studentName, pregunta, modo, historial } = body;
  if (!materiaId || !pregunta) return json({ error: 'Faltan datos.' }, 400);

  const cursos = getStore('cursos');
  const raw = await cursos.get('curso:' + materiaId);
  if (!raw) return json({ error: 'Curso no encontrado.' }, 404);
  const curso = JSON.parse(raw);

  const material = (curso.documentos || []).map((d) => `--- Fuente: ${d.nombre} ---\n${d.texto}`).join('\n\n');
  if (!material) return json({ error: 'Este curso todavía no tiene material cargado.' }, 400);

  const rawConsultas = await cursos.get('consultas:' + materiaId);
  const consultas = rawConsultas ? JSON.parse(rawConsultas) : [];
  if (consultas.length >= MAX_CONSULTAS_POR_CURSO) {
    return json({ limite: true, respuesta: 'Este curso llegó al límite de consultas habilitadas para el piloto. Avisale a tu profesor para ampliarlo.' });
  }

  const system = `Sos el asistente del curso "${curso.nombre}" (nivel: ${curso.nivel}).
Reglas estrictas, sin excepción:
1. SOLO podés responder utilizando el MATERIAL AUTORIZADO de más abajo. Nunca inventes información ni bibliografía que no esté ahí.
2. Si la consulta no puede responderse con el material, respondé EXACTAMENTE (sin agregar nada antes ni después): "Ese tema no forma parte del material proporcionado por el profesor."
3. Nunca respondas como si fueras el profesor ni des opinión personal fuera del material.
4. Cuando la respuesta esté en el material, indicá brevemente en qué documento o parte te basaste.
5. Tono: ${curso.tono === 'formal' ? 'formal y académico' : curso.tono === 'directo' ? 'directo y sin rodeos' : 'cercano y motivador'}.
${modeInstruction(modo) ? '6. Instrucción del modo elegido: ' + modeInstruction(modo) : ''}
Tenés memoria de los mensajes anteriores de esta conversación: usalos para entender preguntas de seguimiento, pero seguí sin salirte nunca del material autorizado.

MATERIAL AUTORIZADO (única fuente permitida):
"""
${material}
"""`;

  const historialSeguro = Array.isArray(historial) ? historial.slice(-MAX_MENSAJES_EN_MEMORIA) : [];
  const messages = [...historialSeguro, { role: 'user', content: pregunta }];

  let respText, grounded = true;
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system, messages })
    });
    const data = await anthropicRes.json();
    if (!anthropicRes.ok) throw new Error(data.error?.message || 'Error llamando a la API de Claude.');
    respText = (data.content || []).map((b) => b.text || '').join('\n').trim() || 'No obtuve respuesta, intentá de nuevo.';
    grounded = !respText.toLowerCase().includes('no forma parte del material');
  } catch (e) {
    return json({ error: e.message });
  }

  consultas.push({
    studentName: (studentName || 'Anónimo').trim().slice(0, 60),
    pregunta, respuesta: respText, enMaterial: grounded, modo: modo || 'normal',
    timestamp: new Date().toISOString()
  });
  await cursos.set('consultas:' + materiaId, JSON.stringify(consultas));

  return json({ respuesta: respText, grounded });
};
