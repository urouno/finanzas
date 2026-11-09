// Finanzas: widget para iPhone (app Scriptable)
//
// Muestra un consejo para hoy calculado con tus datos reales: qué hacer, qué evitar y cuánto falta para tus
// metas. Usa el mismo motor de cálculo que la app (lo descarga de tu index.html), así dice lo mismo que la app.
//
// Instalación
//   1. Instala Scriptable desde la App Store.
//   2. En Scriptable toca +, pega este archivo completo y nómbralo "Finanzas".
//   3. Tócalo una vez para configurarlo: pega la URL de tu script (la que termina en /exec) y tu clave.
//      Se guardan en el llavero del iPhone, no en este archivo.
//   4. En la pantalla de inicio: mantén presionado, +, Scriptable, elige tamaño, toca el widget y en
//      "Script" elige Finanzas. Funciona en chico, mediano y grande.
//
// Solo lee tus datos: no registra ni cambia nada en tu hoja.

const APP_URL_DEF = 'https://urouno.github.io/finanzas/'; // donde abres la app; se puede cambiar al configurar
const LLAVE = 'finanzas.widget.cfg';
const fm = FileManager.local();
const DIR = fm.joinPath(fm.documentsDirectory(), 'finanzas-widget');
if (!fm.fileExists(DIR)) fm.createDirectory(DIR);
const ruta = (n) => fm.joinPath(DIR, n);

const COL = {
  fondo1: new Color('#0F172A'), fondo2: new Color('#16213A'), texto: Color.white(), gris: new Color('#94A3B8'), linea: new Color('#334155'),
  alerta: new Color('#F87171'), aviso: new Color('#FBBF24'), guia: new Color('#60A5FA'), logro: new Color('#34D399')
};
const SIMBOLO = {
  alert: 'exclamationmark.triangle.fill', card: 'creditcard.fill', speed: 'speedometer', cal: 'calendar', shield: 'shield.fill',
  flag: 'flag.fill', refresh: 'arrow.triangle.2.circlepath', trend: 'chart.line.uptrend.xyaxis', pie: 'chart.pie.fill', target: 'target'
};
const FASES = ['Equilibrio', 'Colchón', 'Deudas', 'Fondo', 'Crecer'];
const IDX_FASE = { estabilizar: 0, colchon: 1, deudas: 2, fondo: 3, crecer: 4 };

/* ---------- configuración en el llavero ---------- */
function leeCfg() { return Keychain.contains(LLAVE) ? JSON.parse(Keychain.get(LLAVE)) : null; }
async function configurar(prev) {
  const a = new Alert();
  a.title = 'Conectar con tu hoja';
  a.message = 'La misma URL y clave que usas en la app. Se guardan solo en el llavero de este iPhone.';
  a.addTextField('https://script.google.com/macros/s/…/exec', prev ? prev.url : '');
  a.addSecureTextField('Clave', prev ? prev.clave : '');
  a.addTextField('Dirección de la app', prev ? prev.app : APP_URL_DEF);
  a.addAction('Guardar');
  a.addCancelAction('Cancelar');
  if (await a.presentAlert() < 0) return prev;
  const c = { url: a.textFieldValue(0).trim(), clave: a.textFieldValue(1), app: a.textFieldValue(2).trim() || APP_URL_DEF };
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(c.url)) { await aviso('La URL debe empezar con https://script.google.com/ y terminar en /exec.'); return prev; }
  Keychain.set(LLAVE, JSON.stringify(c));
  return c;
}
async function aviso(t) { const a = new Alert(); a.message = t; a.addAction('OK'); await a.presentAlert(); }

/* ---------- datos y motor (con copia para cuando no hay señal) ---------- */
async function bajaTexto(url) { const r = new Request(url); r.timeoutInterval = 20; return await r.loadString(); }
async function datos(cfg) {
  try {
    const t = await bajaTexto(cfg.url + (cfg.url.includes('?') ? '&' : '?') + 'accion=datos&clave=' + encodeURIComponent(cfg.clave) + '&t=' + Date.now());
    const d = JSON.parse(t);
    if (!d || !d.ok) throw new Error(d && d.error === 'clave' ? 'La clave no coincide' : 'Respuesta inesperada');
    fm.writeString(ruta('datos.json'), t);
    return { d, fresco: true, fecha: new Date() };
  } catch (e) {
    if (fm.fileExists(ruta('datos.json'))) return { d: JSON.parse(fm.readString(ruta('datos.json'))), fresco: false, fecha: fm.modificationDate(ruta('datos.json')), error: e.message };
    throw e;
  }
}
async function motor(cfg) {
  let codigo = null;
  const guardado = ruta('motor.js');
  // se actualiza a lo más cada 12 horas: el motor cambia poco y así el widget carga rápido
  const viejo = !fm.fileExists(guardado) || (Date.now() - fm.modificationDate(guardado).getTime() > 12 * 36e5);
  if (viejo) {
    try {
      const base = cfg.app.endsWith('/') ? cfg.app : cfg.app + '/';
      const html = await bajaTexto(base + 'index.html?t=' + Date.now());
      const m = /<script>([\s\S]*?)<\/script>/.exec(html);
      if (m && m[1].includes('var M =')) { codigo = m[1]; fm.writeString(guardado, codigo); }
    } catch (e) { /* sin señal: se usa la copia */ }
  }
  if (!codigo && fm.fileExists(guardado)) codigo = fm.readString(guardado);
  if (!codigo) throw new Error('No pude descargar la app desde ' + cfg.app);
  const modulo = { exports: {} };
  return new Function('module', codigo + '\n;return M;')(modulo);
}

/* ---------- piezas visuales ---------- */
function colorDe(c) { return c.tipo === 'logro' ? COL.logro : c.tipo === 'guia' ? COL.guia : c.prio >= 80 ? COL.alerta : COL.aviso; }
function simbolo(stack, nombre, color, tam) {
  const s = SFSymbol.named(SIMBOLO[nombre] || 'lightbulb.fill') || SFSymbol.named('lightbulb.fill');
  const img = stack.addImage(s.image);
  img.imageSize = new Size(tam, tam);
  img.tintColor = color;
  return img;
}
function texto(stack, t, tam, color, peso, lineas) {
  const x = stack.addText(t);
  x.font = peso === 'b' ? Font.boldSystemFont(tam) : peso === 's' ? Font.semiboldSystemFont(tam) : Font.systemFont(tam);
  x.textColor = color || COL.texto;
  if (lineas) x.lineLimit = lineas;
  x.minimumScaleFactor = 0.8;
  return x;
}
function pasos(stack, idx, ancho) {
  const fila = stack.addStack();
  fila.spacing = 4;
  const w = Math.floor((ancho - 16) / 5);
  for (let i = 0; i < 5; i++) {
    const s = fila.addStack();
    s.size = new Size(w, 5);
    s.cornerRadius = 3;
    s.backgroundColor = i < idx ? COL.logro : i === idx ? COL.aviso : COL.linea;
  }
}
function consejo(stack, c, tamT, tamX, lineasX) {
  const fila = stack.addStack();
  fila.layoutHorizontally();
  fila.spacing = 8;
  fila.topAlignContent();
  simbolo(fila, c.ico, colorDe(c), tamT + 2);
  const col = fila.addStack();
  col.layoutVertically();
  col.spacing = 2;
  texto(col, c.t, tamT, COL.texto, 's', 2);
  if (lineasX) texto(col, c.x, tamX, COL.gris, '', lineasX);
}

/* ---------- widget ---------- */
// El primer consejo es el más urgente; si nada es urgente, rota entre los tres primeros cada dos horas
// para que el widget no repita siempre lo mismo.
function ordena(lista) {
  if (!lista.length || lista[0].prio >= 80) return lista;
  const n = Math.min(3, lista.length), k = Math.floor(Date.now() / 72e5) % n;
  return [lista[k]].concat(lista.filter((_, i) => i !== k));
}
function fondo(w) {
  const g = new LinearGradient();
  g.colors = [COL.fondo1, COL.fondo2];
  g.locations = [0, 1];
  w.backgroundGradient = g;
}
function cabecera(w, fase, chico) {
  const h = w.addStack();
  h.centerAlignContent();
  texto(h, chico ? 'FINANZAS' : 'TU PLAN', 10, COL.gris, 's');
  h.addSpacer();
  if (fase >= 0) texto(h, (chico ? '' : 'Paso ' + (fase + 1) + ' · ') + FASES[fase], 10, COL.aviso, 's');
}
function pie(w, info) {
  const f = w.addStack();
  const hora = info.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  texto(f, info.fresco ? 'Actualizado ' + hora : 'Sin señal · datos de las ' + hora, 9, COL.gris);
}

function arma(M, info, cfg, familia) {
  M.usar(M.norm(info.d));
  M.regenerar();
  const P = M.plan();
  const lista = ordena(M.consejos(P));
  const fase = P.fase in IDX_FASE ? IDX_FASE[P.fase] : -1;
  const w = new ListWidget();
  fondo(w);
  w.url = cfg.app;
  w.refreshAfterDate = new Date(Date.now() + 30 * 6e4);
  const c0 = lista[0] || { prio: 0, tipo: 'logro', ico: 'trend', t: 'Todo en orden', x: 'No hay pendientes por ahora. Sigue así.' };

  if (familia === 'small') {
    w.setPadding(12, 12, 12, 12);
    cabecera(w, fase, true);
    w.addSpacer(8);
    simbolo(w, c0.ico, colorDe(c0), 18);
    w.addSpacer(6);
    texto(w, c0.t, 13, COL.texto, 'b', 3);
    w.addSpacer(3);
    texto(w, c0.x, 10, COL.gris, '', 3);
    w.addSpacer();
    return w;
  }

  w.setPadding(14, 16, 12, 16);
  cabecera(w, fase, false);
  w.addSpacer(8);
  consejo(w, c0, familia === 'large' ? 16 : 14, 12, familia === 'large' ? 4 : 3);

  if (familia === 'large') {
    w.addSpacer(12);
    pasos(w, fase, 300);
    w.addSpacer(12);
    lista.slice(1, 4).forEach((c) => { consejo(w, c, 13, 11, 2); w.addSpacer(10); });
    w.addSpacer();
    const pos = M.posicion(null);
    const s = w.addStack();
    s.spacing = 14;
    [['Débito y efectivo', M.fmt0(pos.dinero)], ['Deuda en tarjetas', M.fmt0(pos.tarjetas)], ['Fondo', P.fondoMeses.toFixed(1) + ' meses']].forEach((x) => {
      const k = s.addStack(); k.layoutVertically();
      texto(k, x[0], 9, COL.gris); texto(k, x[1], 13, COL.texto, 's');
    });
    w.addSpacer(8);
  } else {
    w.addSpacer();
    const sig = lista[1];
    if (sig) {
      const f = w.addStack(); f.spacing = 6; f.centerAlignContent();
      simbolo(f, sig.ico, colorDe(sig), 11);
      texto(f, sig.t, 11, COL.gris, '', 1);
    }
    w.addSpacer(4);
  }
  pie(w, info);
  return w;
}

function error(msg, cfg) {
  const w = new ListWidget();
  fondo(w);
  w.setPadding(14, 14, 14, 14);
  if (cfg) w.url = cfg.app;
  texto(w, 'FINANZAS', 10, COL.gris, 's');
  w.addSpacer(6);
  texto(w, msg, 13, COL.texto, 's', 4);
  w.addSpacer();
  return w;
}

async function main() {
  let cfg = leeCfg();
  if (config.runsInApp) {
    if (cfg) {
      const a = new Alert();
      a.title = 'Widget de Finanzas';
      ['Vista previa mediana', 'Vista previa grande', 'Vista previa chica', 'Cambiar conexión'].forEach((t) => a.addAction(t));
      a.addCancelAction('Cerrar');
      const op = await a.presentSheet();
      if (op < 0) return;
      if (op === 3) { await configurar(cfg); return; }
      config.widgetFamily = ['medium', 'large', 'small'][op];
    } else {
      cfg = await configurar(null);
      if (!cfg) return;
      config.widgetFamily = 'medium';
    }
  }
  let w;
  if (!cfg) w = error('Abre Scriptable y toca "Finanzas" para conectarlo con tu hoja.');
  else {
    try {
      const [M, info] = await Promise.all([motor(cfg), datos(cfg)]);
      w = arma(M, info, cfg, config.widgetFamily || 'medium');
    } catch (e) {
      w = error('No pude cargar tus datos: ' + e.message, cfg);
    }
  }
  if (config.runsInWidget) Script.setWidget(w);
  else if (config.widgetFamily === 'large') await w.presentLarge();
  else if (config.widgetFamily === 'small') await w.presentSmall();
  else await w.presentMedium();
  Script.complete();
}

await main();
