# 🚒 FireOps

**Open source decision-support tool for firefighters** — runs entirely in the browser, installable as a PWA, no backend, no tracking.

> **Outil pédagogique uniquement — non certifié opérationnel.** Cet outil ne remplace pas la doctrine COS/COSSIM ni l'évaluation tactique du chef d'agrès. Conçu pour la formation, l'entraînement et la pré-évaluation.

---

## 🔗 Live demo

👉 **[wilf974.github.io/FireOps](https://wilf974.github.io/FireOps/)** (mobile-first, installable)

---

## Problem

Sur intervention, le chef d'agrès doit, en quelques minutes, estimer :

- le **débit hydraulique requis** et les lances/tuyaux nécessaires
- l'**autonomie ARI** restante des binômes engagés
- le **périmètre d'évacuation NRBC** et le niveau d'EPI
- le **nombre de VSAV/AR** nécessaires sur multi-victimes

Ces calculs reposent souvent sur des règles mémorisées, sujettes au stress et à l'erreur. **FireOps** les centralise dans une interface mobile-first conçue pour le terrain : **chiffres énormes, zones tactiles larges (gants), calculs instantanés, audit log traçable**.

---

## Pipeline

```
Sinistre / Produit / Victimes
            │
            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  HYDRO   │  │   NRBC   │  │   NOVI   │
│ Q, lances│  │ Périm,EPI│  │ VSAV req │
│ ARI, P_p │  │ Score    │  │ Tri START│
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
                   │
            Worst-case fusion
                   │
       ┌───────────▼───────────┐
       │      Synthèse         │
       │ NOMINAL / TENDU /     │
       │     DÉPASSEMENT       │
       └───────────┬───────────┘
                   │
       Action prioritaire + main courante
```

---

## Modules

| Module | Calcule | Sliders / contrôles |
|---|---|---|
| **💧 Hydraulique** | Débit requis Q, nombre de lances LDV, autonomie ARI, longueurs de tuyaux, perte de charge, pression pompe, faisabilité | Surface, type bâtiment, lances engagées, pression bouteille, capacité, effort, distance, ⌀ tuyau, P lance, dénivelé |
| **☣️ NRBC** | Périmètre évacuation, niveau EPI, score gravité | Classe danger, vent, victimes exposées, lieu (isolé/habité) |
| **🚑 Multi-victimes (NOVI)** | VSAV requis, ratio engagement, total victimes | Compteurs UA / UR / UI / UD, VSAV engagés |
| **📋 Synthèse** | État opérationnel global, action prioritaire, main courante exportable | (calcul automatique) |
| **📖 Doctrine** | Toutes les hypothèses pédagogiques (formules, K, seuils) en transparence | (lecture seule) |
| **🎯 Simulations** | Scénarios pré-configurés pour entraînement | Feu d'appartement, ERP, camion-citerne, NOVI car, reset |

---

## État opérationnel global

Le bandeau du haut affiche **toujours l'action concrète** à effectuer :

| État | Condition | Exemple d'action |
|---|---|---|
| 🟢 **NOMINAL** | Tous modules : besoin ≤ moyens | « Tout va bien — réévalue toutes les 15 min » |
| 🟠 **TENDU** | Au moins 1 module : besoin > moyens (≤ 1.5×) | « Demande 2 lances en plus » |
| 🔴 **DÉPASSEMENT** | Au moins 1 module : besoin > 1.5× moyens, ou ARI < 10 min, ou P pompe > 16 bar | « Renforts massifs immédiats — alerte COS » |

---

## Architecture

```js
// Pure scoring engine — deterministic, no DOM, no side effects
engine.debit_requis(surface, k)            → Q (L/min)
engine.nb_lances(debit)                    → ⌈Q/500⌉
engine.autonomie_ari(p, v, preserve, c)    → minutes
engine.nb_longueurs(distance)              → ⌈distance/20⌉
engine.perte_charge(debit, longueur, k)    → bar
engine.pression_pompe(p, perte, dh)        → bar (clampé [0,16])
engine.hydro_faisable(p, perte, dh)        → 0|1
engine.perim_evac(base, vent)              → mètres (≥ 50)
engine.score_nrbc(danger, vict, prox)      → score
engine.niveauEPI(danger)                   → {n, label}
engine.vsav_requis(ua, ur)                 → ⌈UA + UR/2⌉
engine.niveau_ops(besoin, moyens)          → 0=NOMINAL, 1=TENDU, 2=DÉPASSÉ

// UI layer — display only, mirror of engine
render.hydro / render.nrbc / render.novi / render.global / render.actions / render.console
```

Chaque fonction est **pure** : pas d'accès DOM, pas d'effet de bord, **déterministe** sur ses entrées.

---

## Garanties formelles

Le moteur applique des **invariants vérifiés à l'exécution** (assertion runtime + tests d'invariants en amont) :

```
@invariant  Q ∈ [0, ∞)
@invariant  nb_lances ∈ ℕ, monotone non-décroissant en Q
@invariant  autonomie_ari ≥ 0 (clampée si entrées négatives)
@invariant  perim_evac ≥ 50 m
@invariant  pression_pompe ∈ [0, 16] bar
@invariant  vsav_requis ≥ 0 (clampée si UA/UR négatifs)
@invariant  niveau_ops ∈ {0, 1, 2}
@invariant  globalLvl ∈ {0, 1, 2} (worst-case fusion clampée)
```

Si un invariant est violé à l'exécution, un **toast d'erreur visible** s'affiche immédiatement (au lieu d'un crash silencieux).

**~130 exemples / 21 invariants** ont été validés par tests d'invariants formels lors du développement.

---

## Fonctionnalités

- ⚡ **100 % offline** après la première visite (Service Worker, cache-first)
- 📱 **PWA installable** sur Android / iOS / Windows / ChromeOS
- 🟢 **Mode clair médical/SNCF** — sobre, lisible en plein jour
- 🔢 **Saisie hybride** — slider + input numérique sur les paramètres précis
- 📻 **Bilan radio** — copie SITREP compact dans le presse-papier (1 tap)
- 📋 **Main courante** — export `.txt` ou copie clipboard, horodatée
- 📖 **Onglet Doctrine** — toutes les hypothèses pédagogiques affichées
- 🎯 **5 simulations** — entraînement / démo / test
- 🚫 **Zéro tracking, zéro backend** — uniquement HTML + CSS + JS

---

## Limites de validation

FireOps illustre comment des règles d'aide à la décision peuvent être **transparentes, testables et auditables**. Les limites doivent être clairement énoncées :

- **Hypothèses pédagogiques.** Les coefficients (K = 60/120/240 L/min/m², périmètres NRBC, seuils Plan Rouge…) s'inspirent de la doctrine sapeurs-pompiers mais ne constituent pas des références exactes à citer.
- **Tests ≠ certification.** Les tests d'invariants vérifient la **cohérence logique** des calculs (bornes, monotonicité, idempotence). Ils ne constituent pas une validation opérationnelle ni une certification métier.
- **NRBC : pré-évaluation uniquement.** Le périmètre et le niveau EPI sont indicatifs. Toujours **confirmer** avec la fiche produit (transporteur), le CODIS et la CMIC avant engagement.
- **Pas de remplacement de la doctrine.** L'outil ne remplace ni la doctrine COS/COSSIM, ni l'évaluation tactique du chef d'agrès, ni les ordres du COS.
- **Usage opérationnel réel non recommandé.** Tout déploiement en intervention réelle nécessiterait validation métier par un pompier formateur, analyse de risque, et intégration dans la chaîne de commandement.

---

## Stack

- **HTML / CSS / Vanilla JS** — un seul fichier `index.html` (~91 KB)
- **PWA** — `manifest.webmanifest`, `sw.js` (cache-first), 3 icônes SVG
- **Polices** — DM Sans + JetBrains Mono (Google Fonts, mises en cache)
- **Aucune dépendance JS** — pas de framework, pas de build, pas de bundler

---

## Lancer en local

```bash
# Cloner
git clone https://github.com/wilf974/FireOps.git
cd FireOps

# Servir en HTTP (Python 3)
python -m http.server 8000

# Ou Node
npx serve .
```

Puis ouvre `http://localhost:8000/`.

Pour tester sur mobile (même Wi-Fi) :
```bash
python -m http.server 8000 --bind 0.0.0.0
```
Puis sur le téléphone : `http://<ip-pc>:8000/`.

---

## Installation PWA

- **Android (Chrome)** : un bouton « ⤓ Installer » apparaît dans le header au bout de quelques secondes. Sinon : menu ⋮ → « Installer l'application ».
- **iOS (Safari)** : Partager ⎋ → « Sur l'écran d'accueil ».
- **Desktop (Chrome / Edge)** : icône d'installation dans la barre d'URL, ou bouton « ⤓ Installer » dans l'app.

---

## Roadmap (idées)

- [ ] Validation métier avec un pompier formateur
- [ ] Sauvegarde locale des bilans (IndexedDB)
- [ ] Export PDF de la main courante
- [ ] Mode multi-interventions simultanées
- [ ] Conversion JSON pour intégration avec d'autres outils
- [ ] Internationalisation (anglais, espagnol)

---

## License

[MIT](LICENSE) — © 2026 wilf974

---

## Crédits

Conçu et développé en **Vanilla HTML/CSS/JS**, sans tracking, sans backend, sans dépendance externe au runtime. Inspiré du projet sœur [MedTriage](https://github.com/wilf974/MedTriage) (scoring clinique d'urgence).

Si vous êtes pompier ou formateur et utilisez FireOps en exercice, **vos retours sont les bienvenus** via les Issues.
