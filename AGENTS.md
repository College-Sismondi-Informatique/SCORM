# Contexte pour la génération de packages SCORM

## Structure d'un package SCORM

Chaque série est un dossier nommé `exosXXX/` contenant :

```
exos-1IN/
├── index.html          # Page principale (modèle ci-dessous)
├── charger.js          # Chargeur de dépendances (copie inchangée de serie04)
├── imsmanifest.xml     # Manifeste SCORM (adapter l'identifiant et le titre)
└── data/
    └── serieXX.js      # Données des exercices (voir format détaillé ci-dessous)
```

### `index.html` (inchangé sauf titre et `EXERCICES`)
- Modifier `<title>`
- Modifier `var EXERCICES = "data/serieXX.js";`
- Le reste est identique au modèle serie04

### `charger.js`
- Copier tel quel depuis n'importe quelle série existante.
- Il charge les dépendances depuis `COMMUN` (GitHub) puis le fichier d'exercices.

### `imsmanifest.xml`
- Adapter `identifier`, `organization/@identifier`, `item/@identifier`, `resource/@identifier`
- Adapter les titres
- Lister les 3 fichiers (`index.html`, `charger.js`, `data/serieXX.js`)

---

## Format de `data/serieXX.js`

**Important :** les fichiers `.js` ne doivent **jamais** contenir de backticks non échappés (`` ` ``) car ils cassent le template literal JS. Tout le contenu YAML est enrobé dans un format sûr :

```javascript
window.SERIE_RAW = [
  "id: serie02a",
  "titre: Série 02a – Les boucles for",
  "exercices:",
  ...
].join("\n");
```

Chaque ligne YAML est stockée comme une chaîne JSON (avec `JSON.stringify()`) pour éviter tout problème d'échappement.

### YAML interne — règles d'indentation cruciales

La structure YAML utilise des listes (`- item`) avec des mappings indentés. La première clé de chaque item fixe l'indentation attendue pour toutes les clés suivantes de l'item.

```yaml
exercices:
  -   id: ex1          # ← dash indent = 2, première clé indent = 6
      titre: Exercice 1
      note: true
      checks:
        -   id: boucle     # ← dash indent = 8, clé indent = 16
            kind: source
            re: \bfor\b
            opts:
              rotate: true
              mirror: true
```

**Règle d'or :** toutes les clés d'un même item de liste doivent être alignées avec la première clé (`id:`). Une clé sous-indentée par rapport à cette colonne rend le YAML invalide.

### Structure d'un exercice

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (ex: `"ex1"`, `"exemple"`) |
| `titre` | string | Titre affiché dans l'onglet |
| `note` | boolean | `true` si l'exercice est noté (affiche le bouton Vérifier) |
| `figure` | boolean | `true` si une figure turtle doit être affichée (laisser `false` pour les séries print) |
| `enonce` | string | Markdown/HTML de l'énoncé |
| `code` | string | Code Python initial affiché dans l'éditeur |
| `solutions` | string[] | Liste des solutions de référence |
| `checks` | object[] | Critères de vérification (voir ci-dessous) |

### Types de `checks`

#### 1. `kind: "source"` — Vérification du code source
```javascript
{ id: "boucle", kind: "source", re: "\\bfor\\b",
  label: "Le programme utilise une boucle",
  fail: "Message si échec" }
```

#### 2. `kind: "output"` — Vérification de la sortie console
```javascript
{ id: "sortie", kind: "output", re: "^(bonjour\\n){5}$",
  label: "La sortie affiche 'bonjour' 5 fois",
  fail: "Message si échec" }
```

#### 3. `kind: "defined"` — Commande définie
```javascript
{ id: "def", kind: "defined", name: "spirale",
  label: "La commande spirale() est définie",
  fail: "La commande spirale() n'est pas définie." }
```

#### 4. `kind: "params"` — Vérification des paramètres
```javascript
{ id: "def", kind: "params", name: "spirale_hex", count: 2,
  label: "La commande spirale_hex(cote, nombre) a 2 paramètres",
  example: "def spirale_hex(cote, nombre):" }
```

#### 5. `kind: "calls"` — Appel de fonction
```javascript
{ id: "appel", kind: "calls", caller: "<main>", callee: "spirale_hex",
  label: "Le programme utilise spirale_hex()",
  fail: "Ajoutez spirale_hex(10, 50) après la définition." }
```

#### 6. `kind: "shape"` — Comparaison de dessin turtle
```javascript
{ id: "dessin", kind: "shape", target: "<program>", opts: { rotate: true, mirror: true },
  label: "Le programme dessine la figure demandée",
  hint: { count: "...", size: "...", shape: "..." } }
```

---

## Éditeur visuel (`editeur.html`)

Un éditeur web permet de modifier les séries sans toucher au YAML directement :

- Ouvrir `editeur.html` dans un navigateur (via un serveur HTTP local)
- Charger une série existante ou créer une nouvelle série
- Modifier les champs : ID, titre, énoncé Markdown/HTML, code Python, solutions, checks
- **Raccourcis clavier** : Ctrl+Enter (Source → Preview), Enter (Preview → Source)
- **Coloration syntaxique** : CodeMirror pour le code Python ; Prism.js pour le preview Markdown
- **Toolbar Markdown** : boutons pour insérer facilement bold, italic, titres, listes, blocs code, liens, images
- Enregistrer avec le bouton 💾 (propose la boîte de dialogue native via `showSaveFilePicker` si disponible)

### Ajouter/modifier des exercices
- Chaque bloc d'exercice a deux boutons : **➕ Insérer un exercice après** et **🗑 Supprimer cet exercice**
- L'insertion ajoute un exercice vide juste en dessous, scrollé à l'écran

---

## Astuces pour les regex de sortie console (`kind: "output"`)

La sortie console dans Skulpt est une chaîne brute avec `\n` pour les retours à la ligne.
- Toujours échapper les backslashes dans les regex JS : `\n` devient `\\n`
- Échapper les caractères spéciaux regex : `.` → `\.`, `?` → `\?`, `*` → `\*`
- Utiliser `^...$` pour forcer la correspondance exacte
- Utiliser `?` après un groupe pour rendre le retour à la ligne final optionnel : `\n?$`

### Exemples de patterns courants

| Pattern | Signification |
|---------|---------------|
| `^(bonjour\n){5}$` | 5 lignes exactement "bonjour" |
| `^(ABBBBC\n){4}$` | 4 lignes "ABBBBC" |
| `^Salut\n(Ca va \?\n){3}Salut\n(Ca va \?\n){3}$` | Texte avec groupes répétés |
| `^((o\*){40}\n){10}$` | 10 lignes de 80 caractères `o*o*...` |

---

## Workflow de génération rapide

1. Lire le notebook `.ipynb` cible
2. Pour chaque exercice, extraire :
   - L'énoncé (markdown → HTML)
   - Le code de départ (cellule code)
   - Le résultat attendu (pour rédiger les `checks`)
3. Générer `data/serieXX.js` avec le format tableau JSON-safe
4. Copier `index.html`, `charger.js`, `imsmanifest.xml` depuis un modèle existant
5. Adapter les identifiants et titres

---

## Exemple complet : série 02b (print imbriqué)

Voir le dossier `exos-1IN/data/serie02b.js` comme référence. Cette série :
- N'utilise **pas** de dessin turtle (`figure: false` partout)
- Utilise exclusivement `kind: "source"` et `kind: "output"`
- A 10 exercices issus du notebook `02b_for_print_imbriques.ipynb`
