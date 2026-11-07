/*
 * Chargement des fichiers communs.
 * Version légère : les fichiers communs sont chargés depuis COMMUN (GitHub).
 * Les données d'exercices sont en YAML ; un build.py les convertit en .js wrapper
 * chargeables via <script src=""> (compatibles file://).
 */
(function () {
  "use strict";

  var COMMUN = (window.COMMUN || "").replace(/\/?$/, "/");
  var params = new URLSearchParams(location.search);
  var dataFile = params.get("data");

  /* ---------- Mode test local : menu si aucune série demandée ---------- */
  if (!dataFile) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showMenu);
    } else {
      showMenu();
    }
    return;
  }

  function showMenu() {
    if (!document.body) return;
    var menu = document.createElement("div");
    menu.id = "menu-local";
    menu.style.cssText = "padding:40px;font-family:sans-serif;max-width:600px;margin:auto;";
    menu.innerHTML =
      "<h1>Série 02 — Test local</h1>" +
      "<p>Choisissez une série à ouvrir :</p>" +
      "<ul>" +
      "<li><a href=\"?data=serie02a\">Série 02a – Les boucles for (turtle)</a></li>" +
      "<li><a href=\"?data=serie02b\">Série 02b – Boucles for et print (console)</a></li>" +
      "</ul>" +
      "<p style=\"color:#666;font-size:0.9em;margin-top:24px;\">" +
      "En production ces liens sont invisibles ; Moodle charge automatiquement le bon paramètre.</p>";
    document.body.innerHTML = "";
    document.body.appendChild(menu);
  }

  var _scripts = document.getElementsByTagName('script');
  var _thisScript = document.currentScript || _scripts[_scripts.length - 1];
  var _scriptDir = _thisScript.src.substring(0, _thisScript.src.lastIndexOf('/') + 1);
  var DATA_SCRIPT = _scriptDir + "data/" + dataFile + ".js";

  /* ---------- Dépendances ---------- */
  var STYLES = ["vendor/codemirror/codemirror.css", "css/style.css"];
  var SCRIPTS = [
    "vendor/codemirror/codemirror.js",
    "vendor/codemirror/python.js",
    "vendor/codemirror/matchbrackets.js",
    "vendor/skulpt/skulpt.min.js",
    "vendor/skulpt/skulpt-stdlib.js",
    "js/couleurs.js",
    "js/turtle.js",
    "js/engine.js",
    "js/canvas.js",
    "js/checker.js",
    "js/scorm.js"
  ];
  var APP = "js/app.js";
  var DELAI = 10000;

  var base = COMMUN && COMMUN !== "/" ? COMMUN : "";
  window.SOURCE_COMMUN = base ? "github" : "paquet";

  var LIBS = [
    "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js",
    "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"
  ];

  /* ---------- Helpers ---------- */
  function loadLib(index, finish, onFail) {
    if (index >= LIBS.length) { finish(); return; }
    var s = document.createElement("script");
    s.src = LIBS[index];
    s.async = false;
    s.onload = function () { loadLib(index + 1, finish, onFail); };
    s.onerror = function () { onFail(LIBS[index]); };
    document.head.appendChild(s);
  }

  function loadScript(src, ok, ko) {
    var s = document.createElement("script");
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; ko(); } }, DELAI);
    s.src = src;
    s.async = false;
    s.onload = function () { if (!done) { done = true; clearTimeout(timer); ok(); } };
    s.onerror = function () { if (!done) { done = true; clearTimeout(timer); ko(); } };
    document.head.appendChild(s);
  }

  function fail(src) {
    console.error("Impossible de charger " + src);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", show);
    } else {
      show();
    }
    function show() {
      if (!document.body) return;
      document.body.innerHTML =
        "<p style=\"font:16px system-ui;padding:24px;color:#7c2419\">L'exercice n'a pas pu se charger : " +
        "le site qui contient les fichiers de l'exercice ne répond pas (" + src + "). " +
        "Vérifiez votre connexion et rechargez la page ; si le problème continue, prévenez votre enseignant·e.</p>";
    }
  }

  function chainScripts(list, prefix, i, finish, onFirstFail) {
    if (i >= list.length) { finish(); return; }
    var src = prefix + list[i];
    loadScript(src, function () { chainScripts(list, prefix, i + 1, finish, onFirstFail); }, function () {
      if (i === 0 && onFirstFail) onFirstFail();
      else fail(src);
    });
  }

  /* ---------- Markdown ---------- */
  function md(text) {
    if (!text) return text;
    if (typeof marked === "undefined") return text;
    var t = text.trim();
    if (t.indexOf('\n') !== -1 || t.indexOf('```') !== -1) {
      return marked.parse(t);
    }
    return marked.parseInline(t);
  }

  function markdownizeSerie(serie) {
    if (!serie || !serie.exercices) return serie;
    serie.exercices.forEach(function (ex) {
      if (ex.enonce) ex.enonce = md(ex.enonce);
      /* label / fail / hint restent en texte brut pour éviter l'encodage HTML */
    });
    return serie;
  }

  /* ---------- Extensions métier ---------- */
  function applyOutputExtension() {
    var g = typeof window !== "undefined" ? window : globalThis;
    if (g.Checker && g.Checker.checkExercise) {
      var _orig = g.Checker.checkExercise;
      g.Checker.checkExercise = function (ex, code) {
        return _orig(ex, code).then(function (result) {
          var outputChecks = (ex.checks || []).filter(function (c) { return c.kind === "output"; });
          if (outputChecks.length === 0) return result;
          var studentOutput = result.output || "";
          outputChecks.forEach(function (c) {
            var ok = false, message = null;
            if (c.equals !== undefined) {
              ok = studentOutput === c.equals;
              if (!ok) message = c.fail || "La sortie affichée ne correspond pas exactement à ce qui est attendu.";
            } else if (c.contains !== undefined) {
              ok = studentOutput.indexOf(c.contains) !== -1;
              if (!ok) message = c.fail || "La sortie affichée ne contient pas le texte attendu.";
            } else if (c.re !== undefined) {
              ok = new RegExp(c.re, "m").test(studentOutput);
              if (!ok) message = c.fail || "La sortie affichée ne correspond pas au format attendu.";
            }
            result.results.push({ id: c.id, label: c.label, ok: ok, message: message });
          });
          result.ok = result.results.length > 0 && result.results.every(function (r) { return r.ok; });
          return result;
        });
      };
    }
  }

  function setupSansTortue(serie) {
    if (!serie || !serie.exercices) return;
    var hasTurtle = serie.exercices.some(function (ex) { return ex.figure; });
    if (!hasTurtle) {
      document.body.classList.add("sans-tortue");
    }
  }

  /* ---------- Chargement des données (wrapper .js) ---------- */
  function loadData(path, ok) {
    loadScript(path, function () {
      try {
        var parsed = jsyaml.load(window.SERIE_RAW);
        window.SERIE = markdownizeSerie(parsed);
        setupSansTortue(window.SERIE);
        ok();
      } catch (e) {
        console.error("Erreur de parsing YAML :", e);
        fail(path + " (YAML invalide)");
      }
    }, function () {
      fail(path + " — le fichier n'existe pas");
    });
  }

  /* ---------- Séquence de démarrage ---------- */
  function run() {
    applyOutputExtension();
    loadData(DATA_SCRIPT, function () {
      loadScript(base + APP, function () {}, function () { fail(base + APP); });
    });
  }

  // Styles
  STYLES.forEach(function (f) {
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = base + f;
    document.head.appendChild(l);
  });

  if (!base) { fail("adresse COMMUN manquante dans index.html"); return; }

  loadLib(0, function () {
    chainScripts(SCRIPTS, base, 0, run, null);
  }, function (src) {
    fail("librairie " + src);
  });
})();
