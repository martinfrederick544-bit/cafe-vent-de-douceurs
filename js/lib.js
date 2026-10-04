/* =========================================================
   Utilitaires : DOM, formats, modales, images
========================================================= */

/** h("div", {class:"x", onClick:fn}, [enfants]) — les chaînes sont insérées en texte (jamais en HTML). */
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value" || k === "checked" || k === "disabled" || k === "selected") el[k] = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(add); return; }
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  };
  add(children);
  return el;
}

const $ = (sel, root) => (root || document).querySelector(sel);

/* ---------- formats ---------- */
function money(cents) {
  const n = (Number(cents) || 0) / 100;
  return n.toFixed(2).replace(".", ",") + " $";
}
function pad2(n) { return String(n).padStart(2, "0"); }
function fmtTime(ms) { const d = new Date(ms); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function fmtDate(ms) { return new Date(ms).toLocaleDateString("fr-CA"); }
function dateKey(ms) { const d = new Date(ms); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function todayKey() { return dateKey(Date.now()); }
function dayRangeMs(key) {
  const [y, m, d] = key.split("-").map(Number);
  return [new Date(y, m - 1, d).getTime(), new Date(y, m - 1, d + 1).getTime()];
}
function normKey(s) {
  try { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  catch (_e) { return String(s || "").toLowerCase().trim(); }
}
function initials(name) {
  const p = String(name || "?").trim().split(/\s+/);
  return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function newOrderId() { return "ord_" + Date.now() + "_" + Math.random().toString(16).slice(2, 8); }

function iconUrl(file) {
  if (!file) return "";
  return VD.ICON_OVERRIDES[file] || (VD.ICON_BASE + file);
}

/** <img> d'un pictogramme. Les images d'origine des boissons (.png 1024×768 avec marges) sont recadrées sur le carré brun. */
function iconImg(file, o) {
  o = o || {};
  const url = iconUrl(file);
  if (!url) return null;
  if (/\.png(\?|$)/i.test(url)) {
    return h("span", { class: "crop " + (o.class || ""), style: o.style || "", onClick: o.onClick, title: o.alt || "" },
      h("img", { src: url, alt: o.alt || "", loading: "lazy" }));
  }
  return h("img", { class: o.class || "", style: o.style || "", src: url, alt: o.alt || "", loading: "lazy", onClick: o.onClick });
}

/* ---------- erreurs ---------- */
const ERRORS_FR = {
  PHOTO_REQUIRED: "Une photo de profil est requise avant de commander. Ajoute-la dans « Mon compte » ou demande au café de le faire.",
  CREDIT_LIMIT_REACHED: "Tu as atteint le découvert maximal autorisé. Passe au café recharger ton portefeuille avant de commander.",
  TOO_MANY_ATTEMPTS: "Trop d'essais. Réessaie dans 15 minutes.",
  STAFF_CODE_NOT_SET: "Le code d'accès staff n'est pas encore configuré.",
  CODE_TOO_SHORT: "Le code doit contenir au moins 6 caractères.",
  CANNOT_CHANGE_SELF: "Tu ne peux pas modifier ton propre accès.",
  NO_FREE_AVAILABLE: "Tu n'as pas de boisson gratuite disponible.",
  LOCATION_REQUIRED: "Entre un local de livraison.",
  BAD_DRINK: "Une boisson de ta commande n'est plus disponible. Mets ton panier à jour.",
  BAD_SYRUP: "Un sirop de ta commande n'est plus disponible. Mets ton panier à jour.",
  BAD_ITEMS: "Ton panier est vide ou trop grand (20 boissons maximum).",
  NOT_STAFF: "Accès réservé au staff.",
  NO_CUP_AVAILABLE: "Aucune tasse disponible.",
  CUP_NOT_AVAILABLE: "Cette tasse n'est pas disponible.",
  CUPS_IN_USE_ABOVE: "Des tasses au-delà de ce nombre sont encore utilisées.",
  ORDER_ALREADY_CANCELLED: "Cette commande est déjà annulée.",
  BAD_PHOTO: "Photo invalide ou trop lourde.",
  BAD_AMOUNT: "Montant invalide.",
  NOT_AUTHENTICATED: "Ta session a expiré. Reconnecte-toi.",
  "Invalid login credentials": "Courriel ou mot de passe incorrect.",
  "User already registered": "Un compte existe déjà avec ce courriel.",
  "Email not confirmed": "Confirme ton courriel avant de te connecter (vérifie ta boîte de réception).",
  "Password should be at least": "Le mot de passe doit contenir au moins 8 caractères.",
  BAD_ID: "Erreur interne (identifiant de commande). Réessaie.",
  "rate limit": "Trop de tentatives. Réessaie dans quelques minutes.",
};
function errText(e, fallback) {
  const msg = String((e && (e.message || e.error_description || e)) || "");
  for (const [k, v] of Object.entries(ERRORS_FR)) if (msg.includes(k)) return v;
  return fallback || "Une erreur est survenue. Réessaie.";
}

/* ---------- toast ---------- */
let _toastTimer = null;
function toast(msg, kind) {
  let el = $("#toast");
  if (!el) { el = h("div", { id: "toast", class: "toast", role: "status" }); document.body.appendChild(el); }
  el.textContent = msg;
  el.className = "toast show " + (kind || "");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = "toast"; }, kind === "bad" ? 4500 : 2600);
}

/* ---------- modales ---------- */
let _sheetClose = null;
function openSheet(title, content, opts) {
  closeSheet();
  const root = $("#sheetRoot");
  const close = () => closeSheet();
  const sheet = h("div", { class: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title }, [
    h("div", { class: "sheetHead" }, [
      h("h3", {}, title),
      h("button", { class: "iconBtn", type: "button", "aria-label": "Fermer", onClick: close }, "✕"),
    ]),
    h("div", { class: "sheetBody" }, content),
  ]);
  const back = h("div", { class: "sheetBack", onClick: (e) => { if (e.target === back) close(); } }, sheet);
  root.appendChild(back);
  document.body.classList.add("noscroll");
  _sheetClose = (opts && opts.onClose) || null;
  return { close, sheet, body: sheet.querySelector(".sheetBody") };
}
function closeSheet() {
  const root = $("#sheetRoot");
  if (root && root.firstChild) { root.innerHTML = ""; }
  document.body.classList.remove("noscroll");
  const cb = _sheetClose; _sheetClose = null;
  if (cb) { try { cb(); } catch (_e) {} }
}
function isSheetOpen() { const r = $("#sheetRoot"); return !!(r && r.firstChild); }

/** Dialogue de confirmation → Promise<boolean> */
function confirmDialog(title, text, okLabel, cancelLabel, danger) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; closeSheet(); resolve(v); };
    const ui = openSheet(title, [
      h("p", { class: "muted", style: "white-space:pre-line;margin:0 0 14px" }, text || ""),
      h("div", { class: "row end" }, [
        h("button", { class: "btn", type: "button", onClick: () => finish(false) }, cancelLabel || "Annuler"),
        h("button", { class: "btn " + (danger ? "bad" : "primary"), type: "button", onClick: () => finish(true) }, okLabel || "Confirmer"),
      ]),
    ], { onClose: () => { if (!done) { done = true; resolve(false); } } });
    return ui;
  });
}

/* ---------- images ---------- */
/** Lit un fichier image, recadre au centre en carré et retourne un data URL JPEG (≈ 256px). */
function resizeImageToDataUrl(file, size, quality) {
  size = size || 256; quality = quality || 0.82;
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality));
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("BAD_PHOTO")); };
    img.src = url;
  });
}

/* ---------- fichiers ---------- */
function csvEsc(v) {
  const s = String(v === null || v === undefined ? "" : v);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadText(filename, text, mime) {
  // BOM UTF-8 pour qu'Excel affiche correctement les accents
  const blob = new Blob(["﻿" + text], { type: mime || "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Avatar rond : photo si dispo, sinon initiales. */
function avatar(name, photo, size, warn) {
  const px = (size || 44) + "px";
  const el = photo
    ? h("img", { class: "avatar", src: photo, alt: name || "", style: `width:${px};height:${px}` })
    : h("div", { class: "avatar ph" + (warn ? " warn" : ""), style: `width:${px};height:${px};font-size:${Math.round((size || 44) / 2.6)}px`, title: warn ? "Photo manquante" : "" }, initials(name));
  return el;
}
