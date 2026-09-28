const GATE = "ralph lauren";
const PEN = "titulaire";
const CIPHER = "ralph lauren";

const STORE_LETTERS = "anyssa.letters";
const STORE_NOTES = "anyssa.notes";
const STORE_OATH = "anyssa.oath";
const SESSION_GATE = "anyssa.gate";
const SESSION_PEN = "anyssa.pen";

const DEFAULTS = [
  {
    date: "2026-09-28",
    text: "On m’avait demandé une phrase discrète. Raté. Tu me manques de cette façon calme qui prend toute la pièce, et les kilomètres n’y changent rien."
  }
];

const TITRES = {
  coffre: "Le coffre — Pour Anyssa",
  conditions: "Trois conditions — Pour Anyssa",
  lettre: "La phrase du jour — Pour Anyssa",
  bouquet: "Le bouquet — Pour Anyssa",
  carnet: "Le carnet — Pour Anyssa"
};

const scene = document.getElementById("scene");
const door = document.getElementById("door");
const cadran = document.getElementById("cadran");
const formCoffre = document.getElementById("form-coffre");
const mot = document.getElementById("mot-de-passe");
const erreur = document.getElementById("erreur-coffre");
const formConditions = document.getElementById("form-conditions");
const cases = ["c1", "c2", "c3"].map((id) => document.getElementById(id));
const accepter = document.getElementById("accepter");
const compteur = document.getElementById("compteur");
const dock = document.getElementById("dock");
const notesDix = document.getElementById("notes-dix");
const formNote = document.getElementById("form-note");
const commentaire = document.getElementById("commentaire");
const partager = document.getElementById("partager");
const deja = document.getElementById("deja");
const lettreDate = document.getElementById("lettre-date");
const lettrePhrase = document.getElementById("lettre-phrase");
const lettreVide = document.getElementById("lettre-vide");
const lettreTitre = document.getElementById("lettre-titre");
const carnet = document.getElementById("carnet");
const toastEl = document.getElementById("toast");
const ecrire = document.getElementById("ecrire");
const formTitulaire = document.getElementById("form-titulaire");
const formPhrase = document.getElementById("form-phrase");
const motTitulaire = document.getElementById("mot-titulaire");
const erreurTitulaire = document.getElementById("erreur-titulaire");
const datePhrase = document.getElementById("date-phrase");
const textePhrase = document.getElementById("texte-phrase");
const lienPhrase = document.getElementById("lien-phrase");
const plumeListe = document.getElementById("plume-liste");

let viewing = null;
let score = null;
let opening = false;
let toastTimer = 0;

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSecret(value, secret) {
  const clean = normalize(value);
  return clean === secret || clean.replace(/ /g, "") === secret.replace(/ /g, "");
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadCustom() {
  const data = readJSON(STORE_LETTERS, []);
  if (!Array.isArray(data)) return [];
  return data.filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.text === "string");
}

function letters() {
  const map = new Map();
  DEFAULTS.forEach((letter) => map.set(letter.date, letter));
  loadCustom().forEach((letter) => map.set(letter.date, { date: letter.date, text: letter.text.trim() }));
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function notes() {
  const data = readJSON(STORE_NOTES, {});
  return data && typeof data === "object" ? data : {};
}

function saveLetter(date, text) {
  const next = loadCustom().filter((item) => item.date !== date);
  next.push({ date, text: text.trim().slice(0, 500) });
  localStorage.setItem(STORE_LETTERS, JSON.stringify(next));
}

function saveNote(date, note) {
  const all = notes();
  all[date] = note;
  localStorage.setItem(STORE_NOTES, JSON.stringify(all));
}

function passedGate() {
  return sessionStorage.getItem(SESSION_GATE) === "1";
}

function oathToday() {
  return localStorage.getItem(STORE_OATH) === todayISO();
}

function encodePayload(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const mixed = bytes.map((byte, index) => byte ^ CIPHER.charCodeAt(index % CIPHER.length));
  let binary = "";
  mixed.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePayload(token) {
  try {
    const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4));
    const binary = atob(token.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const plain = bytes.map((byte, index) => byte ^ CIPHER.charCodeAt(index % CIPHER.length));
    const data = JSON.parse(new TextDecoder().decode(plain));
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || typeof data.text !== "string") return null;
    const text = data.text.trim().slice(0, 500);
    if (!text) return null;
    return { date: data.date, text };
  } catch {
    return null;
  }
}

function letterLink(date, text) {
  const url = new URL(location.href);
  url.hash = "m=" + encodePayload({ date, text });
  return url.toString();
}

function messagePourElle(date, text) {
  const code = encodePayload({ date, text });
  return `Le mot du ${formatDate(date)} t’attend dans le coffre.\n\n${code}\n\n${letterLink(date, text)}`;
}

function extractToken(raw) {
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(/#m=([A-Za-z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  return trimmed.split(/\s+/).find((part) => /^[A-Za-z0-9_-]{16,}$/.test(part)) || "";
}

function importToken(raw) {
  const token = extractToken(raw);
  if (!token) return null;
  const data = decodePayload(token);
  if (!data) return null;
  saveLetter(data.date, data.text);
  return data;
}

function absorbHash() {
  if (!location.hash.startsWith("#m=")) return;
  const data = decodePayload(decodeURIComponent(location.hash.slice(3)));
  if (data) saveLetter(data.date, data.text);
  history.replaceState(null, "", location.pathname + location.search);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}

function petals(count, gold) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let index = 0; index < count; index += 1) {
    const petal = document.createElement("i");
    petal.className = gold ? "petal or" : "petal";
    petal.style.left = `${Math.random() * 100}vw`;
    petal.style.animationDuration = `${4 + Math.random() * 4}s`;
    petal.style.animationDelay = `${Math.random() * 0.35}s`;
    petal.style.opacity = String(0.55 + Math.random() * 0.45);
    document.body.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove());
  }
}

function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [392, 523.25, 659.25].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + index * 0.09;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.75);
    });
  } catch {
    /* le silence reste une option élégante */
  }
}

function syncChrome(name) {
  const ready = passedGate() && oathToday();
  dock.hidden = !ready;
  document.body.classList.toggle("has-nav", ready);
  dock.querySelectorAll("[data-go]").forEach((button) => {
    if (button.dataset.go === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function show(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === `ecran-${name}`;
    screen.classList.toggle("is-active", active);
    if (active) {
      const block = screen.querySelector(".rise");
      if (block) {
        block.style.animation = "none";
        void block.offsetWidth;
        block.style.animation = "";
      }
    }
  });
  document.title = TITRES[name] || TITRES.coffre;
  if (name === "lettre") renderLetter(viewing || todayISO());
  if (name === "carnet") renderJournal();
  if (name === "bouquet") petals(18, false);
  if (name === "coffre") {
    scene.classList.remove("is-open", "shake");
    door.classList.remove("spin");
  }
  syncChrome(name);
  window.scrollTo(0, 0);
}

function showConditions() {
  cases.forEach((box) => {
    box.checked = false;
  });
  syncAccept();
  show("conditions");
}

function syncAccept() {
  const count = cases.filter((box) => box.checked).length;
  compteur.textContent = `${count} / 3`;
  accepter.disabled = count !== 3;
}

function paintScore() {
  notesDix.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.score) === score));
  });
}

function renderLetter(date) {
  viewing = date;
  const letter = letters().find((item) => item.date === date);
  const note = notes()[date];
  const isToday = date === todayISO();
  lettreTitre.textContent = isToday ? "La phrase du jour" : "Une phrase gardée";
  lettreDate.textContent = formatDate(date);
  lettreDate.dateTime = date;
  lettrePhrase.hidden = !letter;
  lettreVide.hidden = Boolean(letter);
  formNote.hidden = !letter;
  if (letter) lettrePhrase.textContent = letter.text;
  score = note ? Number(note.score) : null;
  commentaire.value = note && note.comment ? note.comment : "";
  deja.textContent = note ? `Tu as noté ${note.score}/10. Tu peux changer d’avis.` : "";
  partager.hidden = !note;
  paintScore();
}

function renderJournal() {
  carnet.replaceChildren();
  const list = letters();
  const book = notes();
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "lead sombre";
    empty.textContent = "Le carnet est encore vierge.";
    carnet.appendChild(empty);
    return;
  }
  list.forEach((letter) => {
    const card = document.createElement("article");
    card.className = "fiche";
    const time = document.createElement("time");
    time.dateTime = letter.date;
    time.textContent = formatDate(letter.date);
    const quote = document.createElement("p");
    quote.className = "fiche-phrase";
    quote.textContent = letter.text;
    const meta = document.createElement("p");
    meta.className = "fiche-meta";
    const note = book[letter.date];
    meta.textContent = note
      ? (note.comment ? `${note.score}/10 — ${note.comment}` : `${note.score}/10`)
      : "Pas encore notée";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "lien";
    open.dataset.date = letter.date;
    open.textContent = "Ouvrir";
    card.append(time, quote, meta, open);
    carnet.appendChild(card);
  });
}

function renderWriterList() {
  plumeListe.replaceChildren();
  const book = notes();
  letters().forEach((letter) => {
    const card = document.createElement("article");
    const time = document.createElement("time");
    time.textContent = formatDate(letter.date);
    const quote = document.createElement("p");
    quote.textContent = letter.text;
    const meta = document.createElement("p");
    const note = book[letter.date];
    meta.textContent = note
      ? (note.comment ? `Sur cet appareil : ${note.score}/10 — ${note.comment}` : `Sur cet appareil : ${note.score}/10`)
      : "Pas encore de note sur cet appareil.";
    card.append(time, quote, meta);
    plumeListe.appendChild(card);
  });
}

function openWriter() {
  erreurTitulaire.textContent = "";
  datePhrase.value = todayISO();
  const known = sessionStorage.getItem(SESSION_PEN) === "1";
  formTitulaire.hidden = known;
  formPhrase.hidden = !known;
  if (known) renderWriterList();
  ecrire.showModal();
  (known ? textePhrase : motTitulaire).focus();
}

function goAfterGate() {
  chime();
  petals(14, true);
  if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
  window.setTimeout(() => {
    opening = false;
    if (!oathToday()) showConditions();
    else show("lettre");
  }, 700);
}

function unlock() {
  if (opening) return;
  opening = true;
  sessionStorage.setItem(SESSION_GATE, "1");
  erreur.textContent = "";
  scene.classList.remove("shake");
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    door.classList.remove("spin");
    scene.classList.add("is-open");
    goAfterGate();
  };
  door.addEventListener("animationend", finish, { once: true });
  door.classList.add("spin");
  window.setTimeout(finish, 1400);
}

function lock() {
  sessionStorage.removeItem(SESSION_GATE);
  opening = false;
  mot.value = "";
  erreur.textContent = "";
  cadran.style.transform = "";
  show("coffre");
}

for (let value = 1; value <= 10; value += 1) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.score = String(value);
  button.textContent = String(value);
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", `${value} sur 10`);
  button.addEventListener("click", () => {
    score = value;
    paintScore();
  });
  notesDix.appendChild(button);
}

mot.addEventListener("input", () => {
  cadran.style.transform = `rotate(${mot.value.length * 38}deg)`;
  if (erreur.textContent) erreur.textContent = "";
});

formCoffre.addEventListener("submit", (event) => {
  event.preventDefault();
  if (opening) return;
  if (!mot.value.trim()) {
    erreur.textContent = "Écris le mot.";
    return;
  }
  if (!sameSecret(mot.value, GATE)) {
    erreur.textContent = "Ce n’est pas ça. Le coffre ne bouge pas.";
    scene.classList.remove("shake");
    void scene.offsetWidth;
    scene.classList.add("shake");
    return;
  }
  unlock();
});

cases.forEach((box) => box.addEventListener("change", syncAccept));

formConditions.addEventListener("submit", (event) => {
  event.preventDefault();
  if (accepter.disabled) return;
  localStorage.setItem(STORE_OATH, todayISO());
  viewing = todayISO();
  petals(12, true);
  show("lettre");
});

formNote.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!score) {
    notesDix.classList.remove("shake");
    void notesDix.offsetWidth;
    notesDix.classList.add("shake");
    toast("Choisis une note, de 1 à 10.");
    return;
  }
  saveNote(viewing, { score, comment: commentaire.value.trim().slice(0, 400) });
  deja.textContent = `Tu as noté ${score}/10. Tu peux changer d’avis.`;
  partager.hidden = false;
  toast("C’est noté.");
  if (score >= 8) petals(22, false);
});

partager.addEventListener("click", async () => {
  const note = notes()[viewing];
  if (!note) {
    toast("Note d’abord, ensuite tu pourras lui envoyer.");
    return;
  }
  const lines = [`Pour la phrase du ${formatDate(viewing)}`, `Note : ${note.score}/10`];
  if (note.comment) lines.push(note.comment);
  const text = lines.join("\n");
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }
  const ok = await copyText(text);
  toast(ok ? "Note copiée. Tu peux lui envoyer." : "Impossible de copier.");
});

carnet.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  viewing = button.dataset.date;
  show("lettre");
});

dock.addEventListener("click", (event) => {
  const button = event.target.closest("[data-go]");
  if (!button) return;
  if (button.dataset.go === "ecrire") {
    openWriter();
    return;
  }
  if (button.dataset.go === "lettre") viewing = todayISO();
  show(button.dataset.go);
});

document.querySelectorAll(".suite [data-go], .bouquet-texte [data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.go === "lettre") viewing = todayISO();
    show(button.dataset.go);
  });
});

document.getElementById("refermer").addEventListener("click", lock);
document.getElementById("ouvrir-ecrire").addEventListener("click", openWriter);
document.getElementById("fermer-ecrire").addEventListener("click", () => ecrire.close());

function bindImport(formId, fieldId) {
  document.getElementById(formId).addEventListener("submit", (event) => {
    event.preventDefault();
    const field = document.getElementById(fieldId);
    const data = importToken(field.value);
    if (!data) {
      toast("Ce code ne s’ouvre pas.");
      return;
    }
    field.value = "";
    viewing = data.date;
    if (!passedGate()) {
      toast("C’est rangé. Le mot de passe d’abord.");
      return;
    }
    if (data.date === todayISO() && !oathToday()) {
      toast("C’est rangé. Les trois conditions d’abord.");
      showConditions();
      return;
    }
    toast("C’est rangé.");
    show("lettre");
  });
}

bindImport("form-code-coffre", "code-coffre");
bindImport("form-code-lettre", "code-lettre");

formTitulaire.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!sameSecret(motTitulaire.value, PEN)) {
    erreurTitulaire.textContent = "Ce mot n’ouvre pas la plume.";
    return;
  }
  sessionStorage.setItem(SESSION_PEN, "1");
  erreurTitulaire.textContent = "";
  formTitulaire.hidden = true;
  formPhrase.hidden = false;
  renderWriterList();
  textePhrase.focus();
});

formPhrase.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = datePhrase.value;
  const text = textePhrase.value.trim();
  if (!date || !text) {
    toast("Le jour et la phrase, tous les deux.");
    return;
  }
  saveLetter(date, text);
  lienPhrase.value = messagePourElle(date, text);
  renderWriterList();
  if (document.getElementById("ecran-lettre").classList.contains("is-active")) renderLetter(viewing || date);
  const ok = await copyText(lienPhrase.value);
  toast(ok ? "Message copié. Envoie-le-lui." : "Copie le message à la main.");
});

absorbHash();
viewing = todayISO();
if (!passedGate()) show("coffre");
else if (!oathToday()) showConditions();
else show("lettre");
