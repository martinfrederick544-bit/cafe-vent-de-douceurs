// Mode démo hors-ligne pour tester l'interface sans backend : ouvrir /?mock (dev/mock.js n'est pas déployé en production)
if (location.search.indexOf("mock") !== -1) document.write('<script src="/dev/mock.js"><\/script>');
