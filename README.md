# 80/20 Health Tracker

# Prompt pour lovable.dev — App "80/20"

Crée une application web/mobile responsive appelée **"80/20"**, destinée à un coach sportif pour assurer le suivi nutritionnel, physique et pondéral de ses clients.

## Design

- Design simple, épuré, minimaliste. Pas de surcharge visuelle.

- Palette neutre et professionnelle (le logo sera ajouté plus tard, prévoir un espace réservé en haut de l'app pour l'insérer facilement).

- Navigation simple par onglets/bottom bar sur mobile.

- Priorité à la rapidité de saisie pour le client (le moins de clics possible).

## Structure générale

L'application a **deux espaces distincts avec deux niveaux d'accès** :

1. **Espace Client** (accès limité à la saisie)

2. **Espace Coach** (accès complet à l'analyse et au suivi)

Un système d'authentification simple doit permettre de distinguer les rôles (client vs coach) et un coach doit pouvoir gérer plusieurs clients.

---

## ESPACE CLIENT (fonctionnalités limitées à la saisie uniquement)

Le client peut uniquement **ajouter des données**, il ne doit avoir accès à **aucune visualisation, courbe, statistique, historique chiffré ou calcul de calories affiché**. L'objectif est d'éviter que le client soit obsédé par les chiffres — il doit juste nourrir l'app, pas la consulter.

Fonctionnalités disponibles pour le client :

- **Ajout du poids** : un champ simple pour entrer son poids du jour (pas de courbe, pas d'historique visible, juste une confirmation "Poids enregistré ✅").

- **Ajout d'une photo de repas** : le client prend/upload une photo de son repas, associée à un horodatage. Aucune estimation calorique ne doit être visible côté client, même si elle est calculée en arrière-plan.

- **Suivi de l'activité physique** :

  - **Connexion à Apple Health (via HealthKit, iOS) et Google Fit (via Health Connect, Android)** pour récupérer automatiquement le nombre de pas quotidien du client, sans ressaisie manuelle.

    - Le client autorise l'accès lors de l'onboarding (permissions natives iOS/Android).

    - Synchronisation automatique en arrière-plan (quotidienne ou à l'ouverture de l'app).

    - Prévoir un fallback en saisie manuelle si le client refuse la connexion ou si l'app tourne en version web (où l'accès HealthKit/Health Connect n'est pas disponible).

  - Ajout d'une séance de sport (type de séance, durée, note libre optionnelle) — en complément des données de pas, cette saisie reste manuelle car HealthKit/Google Fit ne capture pas toujours le détail des séances de coaching personnalisé.

- Aucun tableau de bord, aucun graphique, aucune donnée chiffrée cumulée ne doit être visible sur cet espace.

- Un simple historique de saisie (liste des jours où il a bien renseigné ses données) peut être affiché, sous forme de calendrier avec juste des coches ✅, sans aucune valeur chiffrée associée.

---

## ESPACE COACH (accès complet)

Le coach doit avoir une vue d'ensemble par client avec :

### Tableau de bord principal

Pour chaque client, afficher **3 courbes/graphiques distincts** :

1. **Évolution du poids** — courbe jour par jour sur la semaine (extensible à d'autres périodes : mois, 3 mois).

2. **Calories par jour** — graphique en barres ou courbe, calculées à partir des photos de repas analysées par l'IA.

3. **Activité physique par jour** — nombre de pas + séances de sport effectuées, sous forme de graphique combiné (barres pour les pas, indicateurs/icônes pour les séances).

### Autres fonctionnalités coach

- Vue liste de tous ses clients avec statut de suivi (à jour / en retard sur la saisie).

- Accès à l'historique complet des photos de repas par client, avec l'estimation calorique affichée sous chaque photo.

- Possibilité de filtrer/sélectionner la période d'analyse (semaine, mois, personnalisé).

- Fiche client individuelle regroupant poids, calories et activité sur une même page.

---

## Agent IA — Estimation calorique automatique

Ajouter un agent IA qui analyse chaque photo de repas envoyée par le client pour **estimer le nombre de calories**.

Règle de calcul :

- L'IA identifie les aliments visibles sur la photo et estime les calories du repas.

- **Une marge de sécurité de +15% est systématiquement ajoutée** à l'estimation brute, pour éviter de sous-estimer l'apport calorique réel du client.

- Cette estimation finale (avec la marge de +15%) est stockée en base de données et **visible uniquement côté Coach**, jamais côté client.

---

## Contraintes techniques à respecter

- Séparation stricte des permissions Client / Coach au niveau des données (le client ne doit jamais pouvoir accéder aux endpoints ou vues réservés au coach, même en modifiant l'URL).

- Stockage des photos de repas avec horodatage et association claire au client concerné.

- Base de données structurée pour permettre l'ajout futur de nouvelles métriques sans tout refondre.

- Prévoir une architecture qui pourra accueillir plusieurs coachs gérant chacun leur propre portefeuille de clients (multi-coach, pas juste multi-client).

- **Intégration santé native** : si l'app est développée en cross-platform (ex: React Native, Flutter), utiliser les librairies adaptées pour accéder à Apple HealthKit (iOS) et Google Health Connect (Android, remplaçant officiel de l'ancienne API Google Fit). Prévoir la gestion des permissions utilisateur et des cas où l'accès est refusé ou indisponible.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nelsoncoaching8020.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0d30ce9a-b3c3-4e52-8a08-b01abf03675d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
