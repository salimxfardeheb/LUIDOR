# LIUDOR — Lieux d'Or

Plateforme algérienne de réservation de salles des fêtes. Les clients cherchent, comparent et réservent ; les propriétaires publient et gèrent leurs salles ; l'équipe LIUDOR modère les dossiers, suit les réservations et encaisse les paiements.

Les règlements se font **en espèces, hors ligne** : l'application ne traite aucune transaction bancaire, elle consigne des encaissements qui ont déjà eu lieu.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Créer le premier administrateur](#créer-le-premier-administrateur)
- [Scripts disponibles](#scripts-disponibles)
- [Architecture du projet](#architecture-du-projet)
- [Rôles et routes](#rôles-et-routes)
- [Conventions de code](#conventions-de-code)
- [Sécurité](#sécurité)
- [État du projet](#état-du-projet)

---

## Stack technique

| Domaine | Technologie |
| --- | --- |
| Framework | Next.js 14.2 (App Router, Server Components, Server Actions) |
| Langage | TypeScript 5 en mode `strict` |
| UI | React 18 · Tailwind CSS 3.4 · lucide-react |
| Base de données | PostgreSQL · Prisma 6.19 |
| Authentification | NextAuth 4.24 (provider Credentials, session JWT) |
| Validation | Zod 4 |
| Stockage d'images | Cloudinary |
| Email | Nodemailer (SMTP) |

---

## Prérequis

- **Node.js 20 LTS** (minimum 18.17, imposé par Next 14.2)
- **PostgreSQL 14+** — une instance locale, ou un service managé type [Neon](https://neon.tech)
- Un compte **Cloudinary** (gratuit) pour l'envoi de photos — facultatif en développement, l'application se dégrade proprement sans lui

---

## Installation

```bash
# 1. Dépendances
npm install

# 2. Configuration
cp .env.example .env
#    puis renseigner les valeurs — voir la section suivante

# 3. Schéma de base + client Prisma
npm run db:migrate

# 4. Données de démonstration (facultatif mais recommandé)
npm run db:seed

# 5. Démarrage
npm run dev
```

L'application est disponible sur <http://localhost:3000>.

---

## Variables d'environnement

Toutes les variables vivent dans `.env`, **jamais committé** (`.gitignore`). Le fichier `.env.example` sert de modèle.

### Obligatoires

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL.<br>Ex. `postgresql://user:password@localhost:5432/liudor` |
| `NEXTAUTH_URL` | Origine du site. `http://localhost:3000` en développement, l'URL publique en production. Sert aussi de `metadataBase` pour les balises canoniques et Open Graph. |
| `NEXTAUTH_SECRET` | Clé de signature des JWT. **Générer avec `openssl rand -base64 32`.** |

> ### ⚠️ À propos de `NEXTAUTH_SECRET`
>
> L'application utilise une session **JWT** (`session: { strategy: "jwt" }`) : ce secret est, à lui seul, toute la chaîne d'autorisation. Le rôle de l'utilisateur (`CLIENT`, `OWNER`, `ADMIN`) est lu depuis le token signé, sans recoupement en base.
>
> **Un secret faible, deviné ou laissé à une valeur d'exemple permet à quiconque de forger un token `ADMIN` et de prendre le contrôle de la plateforme.** Générez-en un vrai, ne le partagez pas, et faites-le tourner s'il a fuité — la rotation invalide toutes les sessions ouvertes, ce qui est l'effet recherché.

### Facultatives — Cloudinary

Le stockage des photos (salles, avatars, couvertures d'articles). Sans configuration, les formulaires restent utilisables et affichent un message explicite : la salle s'enregistre, sans photo.

| Variable | Description |
| --- | --- |
| `CLOUDINARY_URL` | Forme condensée : `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Se trouve dans **Settings → API Keys**. Suffit à elle seule. |
| `CLOUDINARY_CLOUD_NAME`<br>`CLOUDINARY_API_KEY`<br>`CLOUDINARY_API_SECRET` | Variante en trois valeurs séparées. Ignorée dès que `CLOUDINARY_URL` est renseignée. |

> La clé API doit porter la permission **`create`** sur les assets. Une clé restreinte s'authentifie correctement (`/ping` répond `ok`) mais refuse tout téléversement — l'application détecte ce cas et l'affiche comme une erreur de configuration, pas comme une panne passagère.

### Facultatives — SMTP

Envoi d'une copie des messages du formulaire `/contact` à l'équipe. **Tant que `SMTP_HOST` est vide, l'envoi est neutralisé** : le message reste persisté en base (table `contact_messages`), qui fait de toute façon foi.

| Variable | Défaut | Description |
| --- | --- | --- |
| `SMTP_HOST` | — | Vide = envoi désactivé |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | `true` pour TLS implicite (port 465) |
| `SMTP_USER` / `SMTP_PASSWORD` | — | Omis tous les deux = connexion sans authentification |
| `SMTP_FROM` | `contact@liudor.dz` | Expéditeur |
| `SMTP_TO` | valeur de `SMTP_FROM` | Destinataire |

---

## Base de données

Le schéma vit dans [`prisma/schema.prisma`](prisma/schema.prisma) — 24 modèles et 8 énumérations, tous commentés.

### Modèles principaux

| Modèle | Rôle |
| --- | --- |
| `User` | Comptes des trois rôles. `passwordHash` est nullable (compte créé via un provider externe). `suspendedAt` bloque la connexion. |
| `Room` | Salle. Cycle de vie `PENDING → ACTIVE / REJECTED`, plus `SUSPENDED` hors ligne. Seules les salles `ACTIVE` sont publiques. |
| `RoomCategory` | Rattachement salle ↔ catégorie. Une salle peut servir plusieurs types d'événement. **Invariant :** la catégorie principale (`Room.categoryId`) figure toujours dans cette table. |
| `Room` (repères de synthèse) | `hasParking`, `hasAccommodation` et `wheelchairAccess` ne sont **pas saisis** : ils se déduisent des équipements déclarés (`SUMMARY_EQUIPMENTS` dans [`lib/rooms/equipments.ts`](lib/rooms/equipments.ts)), sans quoi la fiche pouvait annoncer « Parking : non » au-dessus d'une liste contenant « Parking privé ». |
| `RoomRate` | Grille tarifaire d'une salle : une ligne par formule (« Location soirée, 21h – 3h, 270 000 DA »). Facultative, propre à la salle — aucun référentiel partagé, contrairement à `Service`. `Room.basePrice` reste le prix d'appel du catalogue. |
| `Booking` | Réservation. `EN_ATTENTE → EN_COURS_VERIFICATION → CONFIRMEE → CLOTUREE`, ou `ANNULEE`. |
| `Payment` | Argent d'une réservation, en espèces et en deux temps : `status`/`paidAt` pour l'encaissement client → LIUDOR, `payout*` pour le reversement LIUDOR → propriétaire. `bookingId` unique : un second enregistrement corrige le montant. |
| `Review` | Avis client. `publishedAt` nul = en attente de modération. Unique par couple (salle, client). |
| `Availability` | Calendrier d'une salle. **Une date sans ligne est considérée fermée.** |
| `RoomModeration` | Historique des décisions de validation / rejet, avec leur motif. |
| `AuditLog` | Journal des actions sensibles. Écrit par les actions serveur ; aucune interface ne le lit, il se consulte en base. |
| `PlatformSettings` | Réglages généraux. Une seule ligne, `id = "platform"`. |

### Migrations

Seize migrations versionnées dans [`prisma/migrations/`](prisma/migrations/), de `20260803205007_init` à `20260820170000_room_rates`.

```bash
npm run db:migrate      # applique les migrations et régénère le client
npm run db:generate     # régénère le client seul (après un git pull)
npx prisma studio       # explorateur graphique de la base
```

> Ne jamais modifier une migration déjà appliquée. Pour changer le schéma : éditer `schema.prisma`, puis `npm run db:migrate` crée une nouvelle migration.

### Configuration de l'outillage

La configuration de la CLI Prisma vit dans [`prisma.config.ts`](prisma.config.ts) : chemin du schéma et commande de seed. Elle remplace la propriété `package.json#prisma`, dépréciée et supprimée en Prisma 7.

Deux conséquences à connaître :

- **Prisma ne charge plus `.env` automatiquement** dès qu'un fichier de config est présent. C'est `prisma.config.ts` qui s'en charge, via son `import "dotenv/config"` en première ligne. Ne pas retirer cet import : `migrate` et `studio` perdraient `DATABASE_URL`.
- **L'URL de connexion reste dans le schéma.** En Prisma 6, `url` est obligatoire dans le bloc `datasource` ; la déclarer aussi dans la config créerait deux sources de vérité. Elle s'y déplacera lors de la montée en Prisma 7.

> ### Erreur « `url` is no longer supported in schema files » dans l'éditeur
>
> L'extension Prisma pour VS Code (v31+) embarque le serveur de langage **Prisma 7**, qui refuse `url` dans le schéma — une règle qui ne s'applique pas à ce projet, resté en 6.19.
>
> [`.vscode/settings.json`](.vscode/settings.json) pose `prisma.pinToPrisma6: true`, ce qui aligne l'extension sur la version du projet. Si l'erreur persiste, recharger la fenêtre (`Cmd+Shift+P` → *Developer: Reload Window*).
>
> **Ne pas retirer `url` du schéma pour faire taire l'éditeur** : `prisma validate` échouerait en `P1012` et migrate comme generate cesseraient de fonctionner.

---

## Comptes de démonstration

`npm run db:seed` crée un jeu de données complet : catégories, équipements, services, salles avec photos et grilles tarifaires, disponibilités sur plusieurs mois, réservations, avis — et **sept comptes de démonstration**.

| Rôle | Email | Nom |
| --- | --- | --- |
| Propriétaire | `proprietaire1@liudor.dz` | Yacine Boumediene |
| Propriétaire | `proprietaire2@liudor.dz` | Nadia Cherif |
| Client | `client1@liudor.dz` | Amina Belkacem |
| Client | `client2@liudor.dz` | Karim Haddad |
| Client | `client3@liudor.dz` | Lynda Meziane |
| Client | `client4@liudor.dz` | Sofiane Bourenane |
| Client | `client5@liudor.dz` | Rania Zerrouki |

Tous partagent le mot de passe `Liudor2026!`, codé en dur dans [`prisma/seed/index.ts`](prisma/seed/index.ts).

> ### 🚫 Le seed est réservé au développement local
>
> Le mot de passe ci-dessus est **public** : il est dans le dépôt. Rien dans le code n'empêche aujourd'hui `npm run db:seed` de s'exécuter contre une base de production — **vérifiez toujours vers quelle base pointe votre `DATABASE_URL` avant de lancer la commande.** Y créer ces comptes reviendrait à ouvrir des accès connus de tous.

Le seed est **rejouable** : il fonctionne par `upsert` et ne duplique rien.

---

## Créer le premier administrateur

**Le seed ne crée aucun compte `ADMIN`**, et le rôle n'est pas proposé à l'inscription (`SIGN_UP_ROLES` n'expose que `CLIENT` et `OWNER`). C'est délibéré : un accès à l'administration ne s'obtient pas depuis un formulaire public.

Le premier administrateur se promeut donc à la main :

```bash
# 1. Créer un compte normal via /inscription (rôle CLIENT ou OWNER)

# 2. Le promouvoir en base
psql "$DATABASE_URL" -c \
  "UPDATE users SET role = 'ADMIN' WHERE email = 'votre.email@exemple.dz';"
```

Ou via l'interface graphique :

```bash
npx prisma studio
# → table `users` → votre ligne → champ `role` → ADMIN
```

> **Le changement de rôle n'est pas immédiat pour une session déjà ouverte.** Le rôle est gravé dans le JWT à la connexion et n'en bouge plus jusqu'à son expiration (30 jours). Déconnectez-vous et reconnectez-vous après la promotion.
>
> La même limite s'applique dans l'autre sens : suspendre un compte ou rétrograder un administrateur **n'a aucun effet sur sa session en cours**. Voir [Sécurité](#sécurité).

---

## Scripts disponibles

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement, <http://localhost:3000> |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint (`next/core-web-vitals` + `next/typescript` + `prettier`) |
| `npm run format` | Prettier sur tout le dépôt |
| `npm run db:migrate` | Applique les migrations Prisma et régénère le client |
| `npm run db:generate` | Régénère le client Prisma seul |
| `npm run db:seed` | Peuple la base de données de démonstration |
| `npx tsc --noEmit` | Vérification de types sans émission |

Avant toute pull request : `npx tsc --noEmit && npm run lint && npm run build` doivent passer sans erreur ni avertissement.

---

## Architecture du projet

```
app/                        Routes (App Router), groupées par espace
  (public)/                 Accueil, catalogue, fiche salle, blog, contact, auth
  (client)/                 Profil, réservations, favoris, historique
  (owner)/                  Portail propriétaire
  (admin)/                  Portail d'administration
  api/auth/[...nextauth]/   Handler NextAuth

actions/                    Server Actions — toutes les mutations
lib/                        Logique métier, requêtes, validation, helpers
  {domaine}/                admin, owner, account, rooms, blog, bookings, home
components/                 Composants React
  ui/                       Design system (Button, Input, Card, Modal…)
  {domaine}/                Composants métier

prisma/
  schema.prisma             Schéma de données
  migrations/               Migrations versionnées
  seed/                     Données de démonstration

middleware.ts               Protection des routes par rôle (runtime Edge)
types/next-auth.d.ts        Extension des types de session (id, role)
```

### Le flux d'une mutation

```
Composant client  →  Server Action        →  lib/{domaine}   →  Prisma
(formulaire)         (garde + validation)    (requêtes)         (PostgreSQL)
                             ↓
                     revalidatePath()
```

Chaque Server Action suit systématiquement le même ordre :

1. **Garde de session** — `requireAdminSession()`, `requireOwnerSession()` ou `requireUserSession()`
2. **Contrôle de propriété** le cas échéant — `requireRoomOwnership()`
3. **Validation Zod** de toutes les entrées
4. **Vérification des verrous métier** (statut compatible, date non passée…)
5. **Écriture** en base, en transaction si plusieurs tables sont touchées
6. **`revalidatePath()`** sur toutes les vues concernées
7. **Retour typé** — union discriminée `{ ok: true } | { ok: false }`

> ### Pourquoi les actions revérifient tout
>
> Une Server Action est un **point d'entrée HTTP public**, appelable directement, sans passer par une page. Le middleware protège la navigation, pas les actions. Le fait que l'interface n'affiche un bouton qu'aux propriétaires ne protège rien.
>
> Les gardes vivent donc dans [`lib/admin/guards.ts`](lib/admin/guards.ts), [`lib/owner/guards.ts`](lib/owner/guards.ts) et [`lib/session.ts`](lib/session.ts) — un seul endroit, pour qu'aucune action ne puisse en oublier une.

---

## Rôles et routes

Trois rôles (`UserRole`), définis dans [`lib/roles.ts`](lib/roles.ts).

| Rôle | Espace | Page d'accueil après connexion |
| --- | --- | --- |
| `CLIENT` | `/profil`, `/reservations`, `/favoris`, `/historique` | `/profil` |
| `OWNER` | `/owner/*` | `/owner/dashboard` |
| `ADMIN` | `/admin/*` | `/admin/dashboard` |

L'espace client est ouvert aux **trois** rôles : seule l'authentification y est exigée. Les préfixes `/owner` et `/admin` sont, eux, réservés à leur rôle (`ROLE_PREFIXES`).

### Routes publiques

`/` · `/salles` · `/salles/resultats` · `/salles/[slug]` · `/blog` · `/blog/[slug]` · `/a-propos` · `/contact` · `/connexion` · `/inscription` · `/proprietaires/[id]`

### Deux couches de protection

1. **[`middleware.ts`](middleware.ts)** — intercepte `/owner/*`, `/admin/*`, `/profil/*`, `/reservations/*`, `/favoris/*`, `/historique/*`. Redirige vers `/connexion?callbackUrl=…` si non connecté, ou avec `error=AccessDenied` si le rôle est insuffisant.
2. **Gardes serveur** — dans les pages (`requireAdminPage()`) et dans **toutes** les actions.

> Le `callbackUrl` est assaini par `resolveRedirect()` : seuls les chemins internes sont acceptés (pas de `//domaine-externe`), et un chemin exigeant un rôle que l'utilisateur n'a pas est ignoré.

---

## Conventions de code

### TypeScript

- **`strict: true`**, et le dépôt ne contient **aucun `any`** ni `@ts-ignore`. Merci de préserver cet état.
- Alias d'import : `@/*` pointe sur la racine.
- Résultats d'action en **union discriminée**, jamais d'exception traversant la frontière client :

```typescript
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors; status?: 401 | 403 | 404 | 409 };
```

### Formulaires

Les helpers partagés sont dans [`lib/forms.ts`](lib/forms.ts) — `text()`, `secret()`, `fieldErrorsFrom()`. **Les réutiliser plutôt que les réécrire.**

`text()` applique un `trim()` ; `secret()` **non** — un mot de passe n'est jamais normalisé, sinon le hash enregistré ne correspondrait plus à ce que compare `authorize()`.

Les bornes de validation sont exportées (`ROOM_LIMITS`, `PROFILE_LIMITS`, `PHOTO_LIMITS`) et servent à la fois au schéma Zod et aux attributs HTML `min` / `max` / `maxLength` : le navigateur signale exactement les mêmes limites que le serveur, qui reste seul à faire autorité.

Le formulaire salle se remplit en **trois étapes** — la salle, les tarifs et conditions, les photos et prestations ([`RoomFormSteps`](components/owner/RoomFormSteps.tsx)) — mais reste **un seul `<form>` et un seul envoi** : les étapes en retrait sont masquées, jamais démontées, sinon leurs champs quitteraient le `FormData`. Le découpage et la lecture de l'avancement vivent dans [`lib/owner/room-form.ts`](lib/owner/room-form.ts), qui relit le `FormData` du formulaire plutôt qu'un état React parallèle : les champs restent non contrôlés et la progression ne peut pas diverger de ce qui sera envoyé.

Un refus du serveur affiche un **résumé d'erreurs** en tête : chaque erreur y est nommée, pointe vers son champ et ramène à l'étape correspondante ; le résumé prend le focus. Le formulaire porte `noValidate` — le navigateur ne sait pas signaler un champ qu'il n'affiche pas, il refuserait l'envoi en silence — et déclenche lui-même le contrôle natif, étape par étape.

### Commentaires

La règle du projet : **expliquer le *pourquoi*, jamais le *quoi*.** Un commentaire qui paraphrase le code sera refusé en revue ; un commentaire qui documente un arbitrage, une contrainte externe ou un piège évité a toute sa place. Les fichiers existants en donnent la mesure.

Tout est rédigé en **français** — code, commentaires, messages d'erreur, interface.

### Style

Prettier (`.prettierrc`) : point-virgules, guillemets doubles, indentation 2 espaces, largeur 80. `npm run format` avant de committer.

### Design system

Les composants de [`components/ui/`](components/ui/) sont la seule source de vérité visuelle. Les couleurs passent par les jetons Tailwind (`primary`, `secondary`, `accent`, `success`, `error`, `warning`, `info`), jamais par des valeurs en dur.

---

## Sécurité

### Ce qui est en place

- Mots de passe hachés en **bcrypt à 12 tours**, `passwordHash` jamais exposé au client
- **Aucune requête SQL brute** — Prisma exclusivement, donc aucune injection possible
- **Aucun `dangerouslySetInnerHTML`** — le contenu du blog est converti en blocs typés et rendu par React, aucune balise saisie en administration n'est interprétée
- Validation **Zod systématique** sur toutes les entrées, y compris les paramètres d'URL
- Contrôle de propriété sur toutes les mutations propriétaire
- Protection contre la redirection ouverte (`resolveRedirect`)
- `rel="noopener noreferrer"` sur tous les liens externes
- Écrans d'erreur non divulgants : seul le `digest` est affiché, le détail part en console
- Journal d'audit des actions d'administration

### Limites connues

Un audit complet a été mené le 6 août 2026 : **[`AUDIT-CODE-LIUDOR.md`](AUDIT-CODE-LIUDOR.md)**. Les points à traiter avant toute mise en production :

| Réf. | Limite |
| --- | --- |
| **C-1** | Vérifier que `NEXTAUTH_SECRET` n'est pas resté à une valeur d'exemple — forge de JWT `ADMIN` sinon |
| **H-1** | La session JWT de 30 jours **n'est pas révocable** : suspendre un compte ou rétrograder un administrateur reste sans effet jusqu'à l'expiration du token. Changer son mot de passe ne déconnecte pas les autres sessions. |
| **H-2** | Huit pages `/admin/*` ne revérifient pas le rôle côté serveur et reposent sur le seul middleware |
| **H-3** | Aucune limitation de débit sur la connexion, l'inscription et le formulaire de contact |
| **H-4** | Aucun en-tête de sécurité HTTP (CSP, HSTS, X-Frame-Options) |
| **H-5** | `npm audit` remonte 8 vulnérabilités de dépendances, dont 6 hautes |
| **H-6** | Le journal d'audit ne trace ni les suspensions de comptes ni la modération des salles |

Le rapport contient, pour chacun, le correctif exact sous forme de diff applicable.

### Signaler une vulnérabilité

Ne pas ouvrir d'issue publique. Écrire à l'équipe technique en décrivant le vecteur et l'impact.

---

## État du projet

Version `0.1.0` — **en développement, pas encore déployable en production.**

### Fonctionnel

Catalogue public avec recherche, filtres et pagination · fiche salle détaillée (photos, tarifs et formules, équipements, services, avis, calendrier, carte) · blog · formulaire de contact · inscription et connexion · espace client (profil, avatar, favoris, historique, dépôt d'avis) · portail propriétaire (salles, photos, calendrier de disponibilités, réservations, tableau de bord) · administration (clients, propriétaires, validation des salles, réservations et leur détail, suivi des paiements en espèces, blog).

### En cours ou absent

| Sujet | État |
| --- | --- |
| **Création de réservation par un client** | ❌ Non implémentée. Les réservations visibles proviennent du seed. Toute la chaîne aval (statuts, paiements, avis) est en place et attend ce maillon. |
| Réglages `maintenanceMode` et `bookingLeadTimeDays` | ⚠️ Configurables et persistés, mais **jamais appliqués** — ils dépendent de la création de réservation |
| Modération des avis, réglages de la plateforme, catalogue et journal de sécurité | ❌ Retirés de l'administration lors du recentrage du portail. Les données restent en base ; `reviewAutoPublish` et `bookingLeadTimeDays` ne sont plus éditables depuis l'interface. |
| Page `/proprietaires/[id]` | ⚠️ Maquette vide, publique |
| Mot de passe oublié | ❌ Absent |
| Vérification d'email à l'inscription | ❌ Absente (le modèle `VerificationToken` existe, inutilisé) |
| Messagerie interne client ↔ propriétaire | ❌ Absente |
| Providers OAuth | ⚙️ Non branchés, mais l'adapter Prisma et les tables (`Account`, `Session`) sont prêts |
| **Tests automatisés** | ❌ Aucun test, aucun runner installé |
| **CI/CD** | ❌ Aucun pipeline |
| Conteneurisation | ❌ Ni `Dockerfile`, ni `docker-compose.yml` |

### Priorités

1. Traiter les points **C-1** et **H-1** à **H-7** de l'audit
2. Implémenter la création de réservation
3. Mettre en place les tests et la CI

---

## Licence

Projet privé — tous droits réservés.
