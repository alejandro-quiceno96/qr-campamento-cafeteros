import { readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const input = process.argv[2];
if (!input) {
  throw new Error('Uso: node scripts/imprimir.mjs codigos.csv');
}

const csv = await readFile(input, 'utf8').catch(error => {
  if (error.code === 'ENOENT') {
    throw new Error(`No se encontró "${input}". Indica la ruta del CSV descargado.`);
  }
  throw error;
});

const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const entries = lines.slice(1).map(line =>
  line.split(',').map(value => value.trim())
);
const ordered = Array.from({ length: 20 }, (_, i) =>
  entries.find(([label]) => label === `Qr${i + 1}`)
);

if (
  entries.length !== 20 ||
  ordered.some(entry => !entry || !/^CAMP-[a-f0-9]{64}$/.test(entry[1])) ||
  new Set(ordered.map(([, value]) => value)).size !== 20
) {
  throw new Error('Descarga la pestaña CodigosQR original en CSV con sus 20 filas.');
}

const cards = await Promise.all(
  ordered.map(async ([, value], index) => {
    const number = String(index + 1).padStart(2, '0');
    const image = await QRCode.toDataURL(value, {
      width: 420,
      margin: 4,
      errorCorrectionLevel: 'M',
    });

    return `
      <article class="card">
        <h2>V Campamento Interno</h2>
        <p class="number">QR ${number}</p>
        <img src="${image}" alt="Código QR ${number}" width="420" height="420">
        <p class="motto">«Luces que brillan, sombras que acechan»</p>
      </article>`;
  })
);

// Cuatro tarjetas por página al imprimir en tamaño carta.
const pages = [];
for (let i = 0; i < cards.length; i += 4) {
  pages.push(`<section class="page">${cards.slice(i, i + 4).join('')}</section>`);
}

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Códigos QR | V Campamento Interno</title>
  <style>
    :root {
      --red: #b90910;
      --ink: #241a1a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, sans-serif;
      color: var(--ink);
      background: #f6f1f1;
    }

    main {
      max-width: 760px;
      margin: 0 auto;
    }

    .page {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .page + .page { margin-top: 14px; }

    .card {
      padding: 20px 12px;
      border: 1.5px solid var(--red);
      border-top-width: 5px;
      border-radius: 12px;
      background: #fff;
      text-align: center;
      break-inside: avoid;
    }

    h2 {
      margin: 0;
      color: var(--red);
      font-size: 1.25rem;
    }

    .number {
      margin: 8px 0 0;
      font-size: .78rem;
      font-weight: bold;
      letter-spacing: .14em;
    }

    img {
      display: block;
      width: 100%;
      max-width: 200px;
      height: auto;
      margin: 4px auto;
    }

    .motto {
      margin: 4px auto 0;
      max-width: 24ch;
      font-size: .95rem;
      font-style: italic;
      line-height: 1.35;
    }

    @media screen and (max-width: 480px) {
      body { padding: 12px; }
      .page { grid-template-columns: 1fr; }
    }

    @page {
      size: letter portrait;
      margin: 12mm;
    }

    @media print {
      body { padding: 0; background: #fff; }
      main { max-width: none; }
      .page { gap: 6mm; }
      .page + .page { margin-top: 0; }
      .page:not(:last-child) { break-after: page; }
      .card { padding: 6mm 3mm; }
      img { max-width: 52mm; }
    }
  </style>
</head>
<body>
  <main>${pages.join('')}</main>
</body>
</html>`;

await writeFile('qr-para-imprimir.html', html, 'utf8');
console.log('Abre qr-para-imprimir.html y presiona Ctrl+P para imprimir.');