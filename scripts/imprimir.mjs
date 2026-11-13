import { readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const input = process.argv[2];
if (!input) throw new Error('Uso: node scripts/imprimir.mjs codigos.csv');
const lines = (await readFile(input, 'utf8')).replace(/^\uFEFF/, '').trim().split(/\r?\n/);
const entries = lines.slice(1).map(line => line.split(',').map(value => value.trim()));
const ordered = Array.from({ length: 20 }, (_, i) => entries.find(([label]) => label === 'Qr' + (i + 1)));
if (entries.length !== 20 || ordered.some(entry => !entry || !/^CAMP-[a-f0-9]{64}$/.test(entry[1])) ||
    new Set(ordered.map(entry => entry[1])).size !== 20) {
  throw new Error('Descarga la pestaña CodigosQR original en CSV con sus 20 filas.');
}
const cards = await Promise.all(ordered.map(async ([label, value]) => {
  const image = await QRCode.toDataURL(value, { width: 420, margin: 4, errorCorrectionLevel: 'M' });
  return '<article><h2>' + label + '</h2><img alt="' + label + '" src="' + image + '"></article>';
}));
await writeFile('qr-para-imprimir.html', '<!doctype html><html lang="es"><meta charset="utf-8">' +
  '<title>QR del V Campamento Interno</title><style>body{font:16px system-ui;text-align:center}' +
  'main{display:grid;grid-template-columns:repeat(2,1fr)}article{break-inside:avoid;border:1px dashed #888;padding:12px}' +
  'img{width:100%;max-width:220px}h2{margin:0}</style><h1>V Campamento Interno</h1><main>' +
  cards.join('') + '</main></html>');
console.log('Abre qr-para-imprimir.html y usa la opción Imprimir del navegador.');
