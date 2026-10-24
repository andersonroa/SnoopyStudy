// ===== Configuración: URL de tu backend (Node + Express + MongoDB) =====
const API_URL = "";   // ej: http://localhost:3000 o https://tu-api.onrender.com
// Si queda vacía, la web funciona en MODO DEMO (datos en el navegador).

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const IMG = f => encodeURI('img/' + f);
const pic = (f, cls = '') => /\.(png|jpe?g|webp|gif)$/i.test(f) ? `<img class="sn ${cls}" src="${IMG(f)}" alt="Snoopy">` : esc(f);
const DEFAULT_CATALOG = [
  {id:1, name:'Emblema Estudioso', description:'Muestra tu constancia.', price_xp:50, emoji:'estudiando.png'},
  {id:2, name:'Collar Morado', description:'Estilo para Snoopy.', price_xp:80, emoji:'conforme.png'},
  {id:3, name:'Avatar Piloto', description:'Snoopy as del aire.', price_xp:120, emoji:'idea.png'},
  {id:4, name:'Corona Experto', description:'Para nivel 5 o más.', price_xp:200, emoji:'nivel experto.png'}];

// ===== Backend: tu API Express + MongoDB (o localStorage en modo demo) =====
const tok = () => localStorage.getItem('token');
async function call(path, method = 'GET', body) {
  const r = await fetch(API_URL + path, {method, headers: {'Content-Type': 'application/json', ...(tok() ? {Authorization: 'Bearer ' + tok()} : {})}, body: body ? JSON.stringify(body) : undefined});
  if (!r.ok) throw new Error(r.status); return r.json();
}
const api = {
  async catalog() { if (API_URL) { try { return await call('/api/catalog'); } catch {} } return ls('catalog', DEFAULT_CATALOG); },
  async addItem(i) { if (API_URL) { try { await call('/api/catalog', 'POST', i); return true; } catch { return false; } } const c = ls('catalog', DEFAULT_CATALOG); c.push({...i, id: Date.now()}); save('catalog', c); return true; },
  async delItem(id) { if (API_URL) { try { await call('/api/catalog/' + id, 'DELETE'); } catch {} return; } save('catalog', ls('catalog', DEFAULT_CATALOG).filter(x => x.id != id)); },
  async sendMsg(m) { if (API_URL) { try { await call('/api/messages', 'POST', m); return true; } catch { return false; } } const a = ls('messages', []); a.push({...m, id: Date.now(), created_at: new Date().toISOString()}); save('messages', a); return true; },
  async messages() { if (API_URL) { try { return await call('/api/messages'); } catch { return []; } } return ls('messages', []).slice().reverse(); },
  async login(e, p) { if (API_URL) { try { const r = await call('/api/login', 'POST', {email: e, password: p}); localStorage.setItem('token', r.token); return true; } catch { return false; } } const ok = e === 'admin@snoopy.com' && p === 'snoopy123'; if (ok) save('admin', true); return ok; },
  async logout() { localStorage.removeItem('token'); if (!API_URL) save('admin', false); },
  async isAdmin() { return API_URL ? !!tok() : ls('admin', false); }
};

// ===== Estado del estudiante (gamificación) =====
let st = ls('state', {xp: 0, goals: [], owned: []});
const level = () => Math.floor(st.xp / 100) + 1;
function renderGoals() {
  save('state', st);
  $('#xpBadge').textContent = `⭐ ${st.xp} XP · Nivel ${level()}`;
  $('#hello').textContent = '¡Hola! Tus metas';
  $('#bar').style.width = (st.xp % 100) + '%';
  $('#lvl').textContent = `${100 - st.xp % 100} XP para el nivel ${level() + 1}`;
  $('#goals').innerHTML = st.goals.length ? st.goals.map(g => `<li class="${g.done ? 'done' : ''}"><span>${esc(g.materia)}: ${esc(g.tema)} (${g.min} min · ${esc(g.nivel)})</span><button data-done="${g.id}">${g.done ? 'Deshacer' : '✔ +20 XP'}</button></li>`).join('') : `<li>${pic('dormido.png', 'md')} Aún no tienes metas. Crea la primera.</li>`;
  $('#mascot').src = IMG(st.xp >= 200 ? 'nivel experto.png' : st.xp >= 100 ? 'celebrando.png' : st.goals.length ? 'estudiando.png' : 'saludando.png');
}
async function renderCatalog() {
  const items = await api.catalog();
  $('#catalog').innerHTML = items.map(i => `<div class="card item"><div class="e">${pic(i.emoji)}</div><h3>${esc(i.name)}</h3><p>${esc(i.description || '')}</p><button class="btn" data-buy="${i.id}">${st.owned.includes(i.id) ? 'Tuyo ✔' : i.price_xp + ' XP'}</button></div>`).join('');
}
async function renderAdmin() {
  const ok = await api.isAdmin();
  $('#loginForm').hidden = ok; $('#panel').hidden = !ok;
  if (!ok) return;
  const [msgs, items] = [await api.messages(), await api.catalog()];
  $('#msgs').innerHTML = msgs.length ? msgs.map(m => `<li><span><b>${esc(m.name)}</b> (${esc(m.email)})<br>${esc(m.text)}</span></li>`).join('') : '<li>Sin mensajes todavía.</li>';
  $('#adminItems').innerHTML = items.map(i => `<li><span>${pic(i.emoji, 'sm')} ${esc(i.name)}</span><button data-del="${i.id}">Borrar</button></li>`).join('');
}

// ===== IA aplicada: Snoopy AI (tutor de estudio, funciona sin API externa) =====
function cloze(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.split(' ').length > 4).slice(0, 5).map(s => {
    const w = s.replace(/[.,;:!?]/g, '').split(' ').filter(x => x.length > 5).sort((a, b) => b.length - a.length)[0];
    return w ? {q: s.replace(w, '_____'), a: w} : null;
  }).filter(Boolean);
}
function reply(t) {
  const l = t.toLowerCase().trim();
  if (l.startsWith('tarjetas:')) {
    const c = cloze(t.slice(9));
    return c.length ? '📇 Tarjetas de estudio:\n' + c.map((x, i) => `${i + 1}. ${x.q}\n   → ${x.a}`).join('\n') : 'Pega un texto con varias oraciones después de "tarjetas:" y te armo las tarjetas.';
  }
  if (l.startsWith('plan')) {
    const tema = t.slice(4).trim() || 'tu tema';
    const g = st.goals.find(x => x.tema.toLowerCase() === tema.toLowerCase() || x.materia.toLowerCase() === tema.toLowerCase());
    const m = g ? g.min : 45;
    return `📅 Plan para ${tema} (${m} min/día):\n• Día 1: lectura rápida + mapa mental (${m} min)\n• Día 2: resumen con tus palabras y tarjetas (${m} min)\n• Día 3: ejercicios o preguntas sin mirar los apuntes\n• Día 4: repaso de lo que fallaste\n• Día 5: simulacro corto y celebrar 🎉`;
  }
  if (/pomodoro/.test(l)) return '🍅 Pomodoro: 25 min de enfoque total, 5 de descanso. Cada 4 rondas, descanso de 20 min. Guarda el celular lejos.';
  if (/memor|recordar/.test(l)) return '🧠 Para recordar: explícalo en voz alta, hazte preguntas sin mirar (recuperación activa) y repasa a los 1, 3 y 7 días.';
  if (/examen|prueba/.test(l)) return '📝 Antes del examen: lista los temas, prioriza los que menos dominas, haz un simulacro y duerme bien la noche anterior.';
  if (/hola|buenas/.test(l)) return `¡Hola! Soy Snoopy. Estás en nivel ${level()}. Escribe "plan <tema>" o "tarjetas: <texto>".`;
  return 'Puedo armarte un plan ("plan Historia"), crear tarjetas ("tarjetas: tu texto") o darte técnicas (pomodoro, memorizar, examen).';
}
function say(txt, who, img) { const d = document.createElement('div'); d.className = 'm ' + who; if (who === 'b') { const a = document.createElement('img'); a.className = 'av'; a.src = IMG(img || 'pensativo.png'); a.alt = ''; d.append(a); } const s = document.createElement('span'); s.textContent = txt; d.append(s); $('#log').append(d); $('#log').scrollTop = 1e9; }
const moodOf = t => { const l = t.toLowerCase(); return l.startsWith('tarjetas') ? 'estudiando2.png' : l.startsWith('plan') ? 'idea.png' : /pomodoro/.test(l) ? 'estudiando.png' : /hola|buenas/.test(l) ? 'saludando.png' : /examen|prueba/.test(l) ? 'conforme.png' : 'pensativo.png'; };

// ===== Eventos =====
document.addEventListener('DOMContentLoaded', () => {
  say('¡Hola! Soy Snoopy AI. ¿Qué quieres estudiar hoy?', 'b', 'saludando.png');
  renderGoals(); renderCatalog(); renderAdmin();
  $('#goalForm').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); st.goals.push({id: Date.now(), ...f, min: +f.min, done: false}); e.target.reset(); renderGoals(); };
  document.addEventListener('click', async e => {
    const d = e.target.dataset;
    if (d.done) { const g = st.goals.find(x => x.id == d.done); g.done = !g.done; st.xp = Math.max(0, st.xp + (g.done ? 20 : -20)); renderGoals(); renderCatalog(); }
    if (d.buy) { const it = (await api.catalog()).find(x => x.id == d.buy); if (st.owned.includes(it.id)) return; if (st.xp >= it.price_xp) { st.xp -= it.price_xp; st.owned.push(it.id); renderGoals(); renderCatalog(); } else alert(`Te faltan ${it.price_xp - st.xp} XP. ¡Cumple más metas!`); }
    if (d.del) { await api.delItem(d.del); renderAdmin(); renderCatalog(); }
  });
  $('#chatForm').onsubmit = e => { e.preventDefault(); const t = $('#msg').value; say(t, 'u'); $('#msg').value = ''; setTimeout(() => say(reply(t), 'b', moodOf(t)), 400); };
  $('#contactForm').onsubmit = async e => { e.preventDefault(); const ok = await api.sendMsg(Object.fromEntries(new FormData(e.target))); $('#cImg').src = IMG(ok ? 'feliz.png' : 'triste.png'); $('#cStatus').textContent = ok ? '¡Mensaje enviado! Gracias.' : 'No se pudo enviar. Intenta de nuevo.'; if (ok) e.target.reset(); };
  $('#loginForm').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const ok = await api.login(f.get('email'), f.get('pass')); $('#lStatus').textContent = ok ? '' : 'Correo o contraseña incorrectos.'; renderAdmin(); };
  $('#logout').onclick = async () => { await api.logout(); renderAdmin(); };
  $('#itemForm').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.price_xp = +f.price_xp; await api.addItem(f); e.target.reset(); renderAdmin(); renderCatalog(); };
});
