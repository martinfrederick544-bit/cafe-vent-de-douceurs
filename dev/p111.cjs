const fs=require("fs");
function sub(f,a,b){let s=fs.readFileSync(f,"utf8"); if(!s.includes(a)) throw new Error("absent "+f+": "+a.slice(0,80)); s=s.replace(a,()=>b); fs.writeFileSync(f,s);}
sub("js/help.js","choisis **livraison ou ramassage**, vérifie ton local, puis **Envoyer la commande**","choisis **livraison ou ramassage**, vérifie ton **local et ton étage** (seulement pour une livraison), puis **Envoyer la commande**");
sub("js/help.js",`  { r: "client", q: "Je préfère aller chercher ma boisson"`,`  { r: "client", q: "Pourquoi on me demande mon étage ?", a: "Pour que les élèves qui livrent trouvent ton local plus vite : **RDC, 1er étage, 1R ou 2e étage**. Il est demandé à l'inscription et **seulement pour une livraison** (pas pour un ramassage). Il est prérempli dans ton panier avec celui de ton compte ; tu peux le changer pour une commande, ou dans **Mon compte** pour le garder." },
  { r: "client", q: "Je préfère aller chercher ma boisson"`);
sub("api/help.js","Le champ « Local / endroit de livraison » est prérempli avec le local du compte et n'est demandé QUE pour une livraison","Les champs « Local / endroit de livraison » et « Étage » (RDC, 1er étage, 1R, 2e étage) sont préremplis avec ceux du compte et ne sont demandés QUE pour une livraison (l'étage est obligatoire pour livrer ; il se choisit aussi à l'inscription et dans Mon compte)");
console.log("ok");
