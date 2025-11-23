# Xtream to STRM Web

<div align="center">

![Xtream to STRM](https://img.shields.io/badge/Xtream-to%20STRM-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![License](https://img.shields.io/badge/License-MIT-yellow)

**Application web moderne pour convertir les flux Xtream Codes en fichiers STRM pour Jellyfin/Kodi**

[Fonctionnalités](#-fonctionnalités) • [Installation](#-installation-rapide) • [Configuration](#-configuration) • [Utilisation](#-utilisation) • [Documentation](#-documentation)

</div>

---

## 📋 Vue d'ensemble

Xtream to STRM Web est une application web complète qui automatise la conversion et la gestion de vos flux Xtream Codes en fichiers STRM compatibles avec Jellyfin et Kodi. Avec une interface moderne, des synchronisations planifiées et la génération automatique de métadonnées NFO, cette solution simplifie grandement la gestion de votre bibliothèque multimédia.

### ✨ Pourquoi cette application ?

- 🎯 **Interface Web Intuitive** - Gérez tout depuis votre navigateur
- ⚡ **Synchronisation Intelligente** - Détection automatique des changements
- 📅 **Planification** - Syncs automatiques (horaire, quotidien, hebdomadaire)
- 📊 **Métadonnées Riches** - Génération NFO avec données TMDB et Xtream
- 🎬 **Multi-format** - Support films et séries avec structure Jellyfin/Kodi
- 🐳 **Docker Ready** - Déploiement en une commande

## 🚀 Fonctionnalités

### Gestion des Synchronisations
- ✅ **Sync Films & Séries** - Synchronisation complète de votre catalogue Xtream
- ✅ **Détection Incrémentale** - Seuls les changements sont traités
- ✅ **Sélection de Catégories** - Choisissez quelles catégories synchroniser
- ✅ **Historique** - Suivi complet de toutes les synchronisations
- ✅ **Arrêt à Chaud** - Annulez une sync en cours

### Planification Automatique
- ⏰ **Fréquences Multiples** - Horaire, toutes les 6h, 12h, quotidien, hebdomadaire
- 📈 **Historique d'Exécution** - Visualisez toutes les syncs planifiées
- 🔄 **Activation Simple** - Toggle on/off pour chaque type de sync
- 📊 **Statistiques** - Nombre d'éléments traités par exécution

### Fichiers NFO Intelligents
- 🎯 **TMDB Priority** - NFO minimal si TMDB ID présent (meilleur scraping)
- 📝 **Fallback Complet** - Métadonnées Xtream si TMDB absent
- 🎬 **Films** - Un .nfo par film avec titre, plot, note, casting, etc.
- 📺 **Séries** - Un tvshow.nfo par série (pas de NFO par épisode)

### Interface Moderne
- 🎨 **Dashboard** - Vue d'ensemble avec statuts en temps réel
- 📝 **Logs Streaming** - Logs en direct avec SSE
- ⚙️ **Configuration** - Gestion des credentials Xtream
- 🎯 **Sélection Bouquets** - Interface pour choisir les catégories
- 🔐 **Authentification** - Login sécurisé avec JWT

## 📦 Installation Rapide

### Prérequis
- Docker et Docker Compose installés
- Accès à un serveur Xtream Codes

### Option 1 : Docker Compose (Recommandé)

```bash
# Cloner le repository
git clone https://github.com/VOTRE_USERNAME/xtream_to_strm_web.git
cd xtream_to_strm_web

# Lancer l'application
docker-compose up -d

# L'application est accessible sur http://localhost
```

### Option 2 : Docker Build

```bash
# Cloner et construire
git clone https://github.com/VOTRE_USERNAME/xtream_to_strm_web.git
cd xtream_to_strm_web

# Build l'image
docker build -f Dockerfile.single -t xtream_to_strm_web-app .

# Lancer le conteneur
docker run -d \
  --name xtream_app \
  -p 80:8000 \
  -v $(pwd)/output:/output \
  -v $(pwd)/db:/app/db \
  xtream_to_strm_web-app
```

## ⚙️ Configuration

### Première Utilisation

1. **Accédez à l'interface** : http://localhost
2. **Connectez-vous** :
   - Username: `admin`
   - Password: `admin`
   - ⚠️ **Changez ces identifiants** après la première connexion

3. **Configurez Xtream Codes** :
   - Allez dans `Configuration`
   - Entrez votre URL, Username et Password Xtream
   - Cliquez sur `Save Configuration`

4. **Sélectionnez vos catégories** :
   - Allez dans `Sélection Bouquets`
   - Cliquez sur `List Categories`
   - Cochez les catégories à synchroniser
   - Sauvegardez

5. **Première synchronisation** :
   - Retournez au `Dashboard`
   - Cliquez sur `Sync Now` pour Films et/ou Séries

### Volumes Docker

Les volumes importants à monter :

```yaml
volumes:
  - ./output:/output      # Fichiers STRM et NFO générés
  - ./db:/app/db          # Base de données SQLite
```

## 📖 Utilisation

### Synchronisation Manuelle

**Dashboard** → Cliquez sur `Sync Now` pour Movies ou Series

Les fichiers sont créés dans `./output/` :
```
output/
├── movies/
│   └── Category_Name/
│       ├── Movie_Name.strm
│       └── Movie_Name.nfo
└── series/
    └── Category_Name/
        └── Series_Name/
            ├── tvshow.nfo
            └── Season 1/
                ├── S01E01 - Title.strm
                ├── S01E02 - Title.strm
                └── ...
```

### Synchronisation Planifiée

**Planification** → Activez et configurez la fréquence

- Toggle `Activé` pour Films et/ou Séries
- Choisissez la fréquence (horaire, 6h, 12h, quotidien, hebdomadaire)
- Le système synchronise automatiquement selon le planning

### Intégration Jellyfin/Kodi

1. **Pointez vers le dossier output** :
   - Dans Jellyfin/Kodi, ajoutez `./output/movies` comme bibliothèque Films
   - Ajoutez `./output/series` comme bibliothèque Séries

2. **Configuration NFO** :
   - Activez "NFO local" dans les paramètres de la bibliothèque
   - Les métadonnées seront automatiquement chargées depuis les .nfo

3. **Scraping automatique** :
   - Si TMDB ID présent dans le NFO → Jellyfin/Kodi enrichit automatiquement
   - Sinon → Utilise les métadonnées Xtream du NFO

## 🏗️ Architecture

### Stack Technique

**Backend:**
- FastAPI (API REST)
- Celery + Redis (Tâches asynchrones)
- Celery Beat (Planification)
- SQLAlchemy (ORM)
- SQLite (Base de données)

**Frontend:**
- React 18 + TypeScript
- TailwindCSS
- Vite
- Axios

**Infrastructure:**
- Docker (Conteneurisation)
- Nginx (Reverse proxy dans Uvicorn)

### Structure du Projet

```
xtream_to_strm_web/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # Routes API
│   │   ├── core/              # Config, Security, Celery
│   │   ├── db/                # Database session
│   │   ├── models/            # SQLAlchemy models
│   │   ├── services/          # Business logic
│   │   ├── tasks/             # Celery tasks
│   │   └── main.py
│   ├── requirements.txt
│   └── start.sh
├── frontend/
│   ├── src/
│   │   ├── components/ui/     # UI Components
│   │   ├── lib/               # API client, utils
│   │   ├── pages/             # React pages
│   │   └── App.tsx
│   └── package.json
├── Dockerfile.single           # Multi-stage build
├── docker-compose.yml
├── docker_start.sh
└── README.md
```

## 🔧 Développement

### Setup Local

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Démarrer Redis
redis-server

# Démarrer l'application
./start.sh

# Frontend
cd frontend
npm install
npm run dev
```

### Variables d'Environnement

Configurables dans `backend/app/core/config.py` :

- `DATABASE_URL` - Chemin base de données SQLite
- `REDIS_URL` - URL Redis pour Celery
- `SECRET_KEY` - Clé JWT (à changer en production)

## 📊 API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/login` | POST | Authentification |
| `/api/v1/sync/status` | GET | Statut des syncs |
| `/api/v1/sync/movies` | POST | Lancer sync films |
| `/api/v1/sync/series` | POST | Lancer sync séries |
| `/api/v1/scheduler/config` | GET/PUT | Config planification |
| `/api/v1/selection/categories` | GET | Liste catégories |
| `/api/v1/config` | GET/POST | Config Xtream |
| `/api/v1/logs/stream` | GET | Logs en temps réel (SSE) |

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [FastAPI](https://fastapi.tiangolo.com/) - Framework API moderne
- [React](https://react.dev/) - Bibliothèque UI
- [Celery](https://docs.celeryq.dev/) - Gestion des tâches asynchrones
- [TailwindCSS](https://tailwindcss.com/) - Framework CSS utility-first

## 📞 Support

Pour toute question ou problème :
- Ouvrez une [Issue](https://github.com/VOTRE_USERNAME/xtream_to_strm_web/issues)
- Consultez la [Documentation](#documentation)

---

<div align="center">

**Fait avec ❤️ pour la communauté Jellyfin/Kodi**

</div>
