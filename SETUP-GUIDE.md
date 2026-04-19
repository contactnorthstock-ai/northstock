# NorthStock — Guide de configuration complète
## Automatisation à 5h00 AM heure de Montréal

---

## Structure du projet

```
northstock-automation/
├── .github/
│   └── workflows/
│       └── daily-update.yml    ← Déclenche tout à 5h AM
├── scripts/
│   ├── generate-daily.js       ← Génère articles + fetch prix
│   └── build-site.js           ← Assemble le HTML final
├── templates/
│   ├── index.template.html     ← Template principal (copie northstock.html)
│   └── northstock-portfolio-live.html  ← Copie ton fichier portefeuille
├── dist/                       ← Généré automatiquement (site final)
│   ├── index.html
│   ├── northstock-portfolio-live.html
│   └── data/
│       └── daily.json
└── package.json
```

---

## ÉTAPE 1 — Créer le compte GitHub (5 min)

1. Va sur **github.com**
2. Clique "Sign up"
3. Utilise ton email northstock : `northstock.ca@gmail.com`
4. Choisis un username : `northstock-ca`
5. Vérifie ton email

---

## ÉTAPE 2 — Créer le repository GitHub (3 min)

1. Sur GitHub, clique le bouton vert **"New"** (ou le "+" en haut à droite)
2. Repository name : `northstock`
3. Description : `NorthStock — Canadian & US Stock Market Intelligence`
4. Choisis **Public** (gratuit, et Netlify peut le lire)
5. ✅ Coche "Add a README file"
6. Clique **"Create repository"**

---

## ÉTAPE 3 — Uploader les fichiers (5 min)

Dans ton nouveau repository GitHub :

1. Clique **"uploading an existing file"** (ou "Add file" → "Upload files")
2. Glisse-dépose TOUS les fichiers de ce dossier `northstock-automation/`
3. Dans "Commit changes", écris : `Initial NorthStock setup`
4. Clique **"Commit changes"**

⚠️ **Important** : Renomme `northstock.html` en `index.template.html` et mets-le dans le dossier `templates/` avant d'uploader.

---

## ÉTAPE 4 — Obtenir la clé Claude API (5 min)

1. Va sur **console.anthropic.com**
2. Crée un compte avec ton email northstock
3. Va dans "API Keys" → "Create Key"
4. Nomme-la `northstock-automation`
5. Copie la clé (elle commence par `sk-ant-...`)
6. Va dans "Billing" → ajoute 5$ de crédit (dure ~50 jours à 5 articles/jour)

---

## ÉTAPE 5 — Configurer les secrets GitHub (3 min)

Les "secrets" sont des variables cachées que GitHub utilise sans les exposer.

Dans ton repository GitHub :
1. Clique **"Settings"** (en haut)
2. Dans le menu gauche → **"Secrets and variables"** → **"Actions"**
3. Clique **"New repository secret"** et ajoute ces 4 secrets :

| Nom du secret | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | Ta clé Claude (sk-ant-...) |
| `FINNHUB_API_KEY` | `d7i3grhr01qu8vfn7qdgd7i3grhr01qu8vfn7qe0` |
| `NETLIFY_AUTH_TOKEN` | (voir étape 6) |
| `NETLIFY_SITE_ID` | (voir étape 6) |

---

## ÉTAPE 6 — Connecter Netlify à GitHub (5 min)

### Obtenir le token Netlify :
1. Va sur **app.netlify.com**
2. Clique sur ton avatar (en haut à droite) → **"User settings"**
3. **"Applications"** → **"New access token"**
4. Nomme-le `northstock-github` → **"Generate token"**
5. Copie le token → colle-le dans le secret `NETLIFY_AUTH_TOKEN` sur GitHub

### Obtenir le Site ID Netlify :
1. Sur Netlify, clique sur ton site NorthStock
2. **"Site configuration"** → **"Site details"**
3. Copie le **"Site ID"** (format : `abc12345-...`)
4. Colle-le dans le secret `NETLIFY_SITE_ID` sur GitHub

---

## ÉTAPE 7 — Tester manuellement (2 min)

1. Dans GitHub, va dans l'onglet **"Actions"**
2. Clique sur **"NorthStock Daily Update — 5h AM Montreal"**
3. Clique **"Run workflow"** → **"Run workflow"** (bouton vert)
4. Regarde les logs en temps réel — tu verras les articles se générer !
5. Après ~3-4 minutes, ton site Netlify est mis à jour avec les vrais articles

---

## ÉTAPE 8 — Vérifier l'horaire automatique

Le workflow tourne automatiquement :
- **Lundi au vendredi** : 5h00 AM EST (10:00 UTC)
- **Samedi et dimanche** : 5h00 AM EST (11:00 UTC en été / EDT)

GitHub Actions t'envoie un email si le workflow échoue.

---

## Coûts estimés

| Service | Coût |
|---|---|
| GitHub Actions | **Gratuit** (2000 min/mois inclus) |
| Netlify hosting | **Gratuit** |
| Finnhub API | **Gratuit** (60 appels/min) |
| CoinGecko API | **Gratuit** |
| Claude API | **~0.10$ / jour** (5 articles × 600 tokens) |
| **Total mensuel** | **~3$ / mois** |

---

## Ce qui se passe chaque matin à 5h00 AM

```
5:00:00  GitHub Actions se réveille
5:00:10  Connexion à Finnhub → récupère 20+ prix d'actions
5:00:30  Connexion à CoinGecko → récupère BTC, ETH, SOL, XRP
5:00:45  Analyse les top gainers et losers de la veille
5:01:00  Claude génère article #1 (morning briefing)
5:01:30  Claude génère article #2 (top mover analysis)
5:02:00  Claude génère article #3 (Canadian TSX focus)
5:02:30  Claude génère article #4 (crypto update)
5:03:00  Claude génère article #5 (earnings preview)
5:03:30  Build du site HTML avec tous les vrais prix
5:04:00  Déploiement sur Netlify
5:04:30  ✅ NorthStock est en ligne avec le contenu du jour !
```

Tes lecteurs arrivent à 5h30, 6h00, 7h00 → ils voient déjà les nouvelles fraîches.
