# CoProfesor IA — Despliegue en Netlify

## Qué incluye este proyecto
- `public/index.html` → la web (landing, panel docente, chat del alumno)
- `netlify/functions/chat.js` → intermediario seguro hacia la API de Claude (tu API key nunca llega al navegador)
- `netlify/functions/storage.js` → guarda cursos, documentos y consultas en Netlify Blobs (persiste online)

## Paso 1 — Conseguir una API key de Anthropic
1. Entrá a https://console.anthropic.com
2. Creá una cuenta (es distinta de tu cuenta de Claude.ai) y cargá crédito (unos USD 5-10 alcanzan de sobra para un piloto de varias semanas).
3. Generá una API key en la sección "API Keys". Guardala, la vas a necesitar en el paso 3.

## Paso 2 — Subir el proyecto a Netlify
Este proyecto usa **funciones serverless**, así que no sirve arrastrar una carpeta a Netlify (eso solo publica archivos estáticos). Las dos formas simples:

**Opción A — Netlify CLI (más rápida, sin usar GitHub):**
```
npm install -g netlify-cli
cd coprofesor-netlify
netlify login
netlify init
netlify deploy --prod
```

**Opción B — GitHub + Netlify (recomendada si vas a seguir iterando):**
1. Subí esta carpeta a un repositorio de GitHub.
2. En https://app.netlify.com → "Add new site" → "Import an existing project" → elegí el repo.
3. Netlify va a detectar automáticamente `netlify.toml` (publish: `public`, functions: `netlify/functions`).
4. Deploy.

## Paso 3 — Configurar la API key en Netlify
En el panel del sitio: **Site configuration → Environment variables → Add a variable**
- Key: `ANTHROPIC_API_KEY`
- Value: la key que generaste en el paso 1

Volvé a desplegar el sitio para que tome la variable (Deploys → Trigger deploy).

## Paso 4 — Probar
Entrá a la URL que te da Netlify (algo como `tu-sitio.netlify.app`). Cualquier docente puede entrar con su propio código y cualquier alumno con el código de curso — ya no hace falta cuenta de Claude, funciona para cualquiera con el link.

## Costos esperados para un piloto chico
- Netlify: gratis (el plan free cubre esto de sobra).
- Netlify Blobs: incluido en el plan free.
- Anthropic API: se paga por uso, centavos de dólar por conversación con Claude Sonnet. Para 2-3 docentes probando con sus cursos por unas semanas, unos pocos dólares alcanzan.

## Si más adelante querés login real (email/contraseña) en vez de códigos
Hoy el "código de docente" y el "código de curso" son la forma simple de separar datos sin pedirle a nadie que se registre. Si el piloto funciona y querés pasar a cuentas reales con contraseña, el siguiente paso natural es sumar Netlify Identity o Supabase Auth — decime cuando llegue ese momento y lo armamos.
