export default async function handler(request) {
  function reply(body, status = 200) {
    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return reply({ message: 'Método no permitido.' }, 405);
  const { APPS_SCRIPT_URL, API_SECRET } = process.env;
  if (!APPS_SCRIPT_URL || !API_SECRET) {
    return reply({ message: 'Falta configurar la conexión con Google Sheets.' }, 503);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return reply({ message: 'Solicitud demasiado larga.' }, 413);
    input = JSON.parse(raw);
  } catch {
    return reply({ message: 'Solicitud inválida.' }, 400);
  }
  if (!input || !['podio', 'login', 'perfil', 'scan', 'logout'].includes(input.action)) {
    return reply({ message: 'Acción inválida.' }, 400);
  }
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, secret: API_SECRET }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error('Apps Script no disponible');
    const data = await response.json();
    return reply(data, data.ok ? 200 : data.code === 'AUTH' ? 401 : 400);
  } catch {
    return reply({ message: 'No se pudo consultar Google Sheets. Intenta de nuevo.' }, 502);
  }
}
