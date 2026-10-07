// Publie HEAD sur GitHub via l'API (git push est bloqué par le proxy/réseau).
// N'envoie que les fichiers modifiés (comparaison des empreintes git) → peu d'appels, pas de limite de débit.
// Usage : node dev/gh-push.cjs <branche> "<message>"
const { spawnSync, execSync } = require("child_process");
const REPO = "martinfrederick544-bit/cafe-vent-de-douceurs";
const branch = process.argv[2] || "dev";
const message = process.argv[3] || "update";

function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function gh(args, input) {
  // le réseau coupe parfois la réponse : on réessaie avec une pause croissante
  let last = "";
  for (let i = 0; i < 6; i++) {
    const r = spawnSync("gh", ["api", ...args], { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status === 0) {
      try { return r.stdout ? JSON.parse(r.stdout) : null; } catch (_e) { last = "réponse illisible"; }
    } else {
      last = r.stderr || r.stdout;
      if (/404/.test(last) && /Not Found/.test(last)) throw new Error(last); // inutile de réessayer
    }
    sleep(2000 * (i + 1));
  }
  throw new Error("gh api " + args.join(" ") + "\n" + last);
}

// fichiers de HEAD : chemin → empreinte du blob (contenu normalisé tel que commité)
const local = new Map();
execSync("git ls-tree -r HEAD", { encoding: "utf8" }).split("\n").filter(Boolean).forEach((l) => {
  const m = /^(\d+) blob ([0-9a-f]{40})\t(.+)$/.exec(l);
  if (m) local.set(m[3], { mode: m[1], sha: m[2] });
});

// branche cible (ou main si elle n'existe pas encore)
let parentSha;
try { parentSha = gh([`repos/${REPO}/git/ref/heads/${branch}`]).object.sha; }
catch (_e) { parentSha = gh([`repos/${REPO}/git/ref/heads/main`]).object.sha; }
const parentCommit = gh([`repos/${REPO}/git/commits/${parentSha}`]);
const remote = new Map();
gh([`repos/${REPO}/git/trees/${parentCommit.tree.sha}?recursive=1`]).tree.filter((e) => e.type === "blob").forEach((e) => remote.set(e.path, e.sha));

const entries = [];
let uploaded = 0;
for (const [path, info] of local) {
  if (remote.get(path) === info.sha) continue;
  const content = execSync(`git show HEAD:"${path}"`, { maxBuffer: 64 * 1024 * 1024 }).toString("base64");
  const blob = gh([`repos/${REPO}/git/blobs`, "--method", "POST", "--input", "-"], JSON.stringify({ content, encoding: "base64" }));
  entries.push({ path, mode: info.mode, type: "blob", sha: blob.sha });
  uploaded++; sleep(400);
}
for (const path of remote.keys()) if (!local.has(path)) entries.push({ path, mode: "100644", type: "blob", sha: null }); // fichiers supprimés

if (!entries.length) { console.log(`${branch} : déjà à jour (${local.size} fichiers)`); process.exit(0); }

const t = gh([`repos/${REPO}/git/trees`, "--method", "POST", "--input", "-"], JSON.stringify({ base_tree: parentCommit.tree.sha, tree: entries }));
const commit = gh([`repos/${REPO}/git/commits`, "--method", "POST", "--input", "-"], JSON.stringify({
  message: message + "\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>", tree: t.sha, parents: [parentSha],
}));
try {
  gh([`repos/${REPO}/git/refs/heads/${branch}`, "--method", "PATCH", "--input", "-"], JSON.stringify({ sha: commit.sha, force: true }));
} catch (_e) {
  gh([`repos/${REPO}/git/refs`, "--method", "POST", "--input", "-"], JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }));
}
console.log(`${branch} -> ${commit.sha} (${uploaded} fichier(s) envoyé(s), ${entries.length - uploaded} supprimé(s), ${local.size} au total)`);
