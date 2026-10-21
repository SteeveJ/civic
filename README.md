# Civic

Civic réécrit tes messages de travail. Tu tapes ce que tu penses, l'app te rend un message que tu peux envoyer. Elle sait aussi faire l'inverse et traduire le jargon corporate.

Quatre modes :

- Adoucir : réécrit un message brut dans le ton choisi (diplomate, ferme, second degré, poliment piquant), ou rédige la réponse à un message reçu.
- Décoder : retrouve ce que l'auteur d'un mail trop poli pensait vraiment.
- Dé-jargonner : traduit un mail corporate en français normal et explique chaque terme.
- Jargonomètre : note de 0 à 100 la quantité de mots creux d'un message.

## Démarrer

Il faut Node 20.12 ou plus récent et Python 3. Aucune dépendance à installer.

```bash
npm start
```

L'app tourne sur http://localhost:3000.

Sans clé API, Civic passe par le compte Claude connecté sur ta machine (la commande `claude` doit être installée et connectée). C'est pratique en local, mais pour un usage partagé il faut une clé API.

## Configuration

Tout se règle dans un fichier `.env` à la racine. Il est facultatif : chaque réglage a une valeur par défaut.

```bash
cp .env.example .env
```

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | vide | Clé API Anthropic. Vide, l'app utilise la commande `claude`. |
| `MODEL` | `claude-haiku-5-5` | Modèle utilisé. |
| `PORT` | `3000` | Port du serveur. |
| `DAILY_LIMIT` | `100` | Requêtes par IP et par jour. |
| `TRUST_PROXY` | `0` | Mettre `1` derrière un reverse proxy, pour que le quota compte les vraies IP. |
| `PYTHON` | `python3` | Interpréteur qui lance le nettoyage des filigranes. |

Une valeur invalide (par exemple `PORT=abc`) arrête l'app au démarrage avec un message qui nomme la variable.

## Architecture

Le code suit une architecture hexagonale. Le domaine et le cas d'usage ne connaissent ni HTTP, ni l'API Anthropic, ni Python : ils parlent à des ports, et des adaptateurs branchent la technique dessus.

```
src/
  domain/
    prompts.mjs       tons, validation des entrées, consignes envoyées au modèle, lecture du JSON
    quota.mjs         compteur de requêtes par IP et par jour
  application/
    process-text.mjs  cas d'usage : valider, vérifier le quota, appeler le modèle, nettoyer, rendre le résultat
  adapters/
    http/server.mjs          adaptateur entrant : API HTTP et page web
    llm/anthropic-api.mjs    port LLM via l'API Anthropic
    llm/claude-cli.mjs       port LLM via la commande claude locale
    scrubber/watermarks.mjs  port de nettoyage via le script Python
  config.mjs          lecture et validation des variables d'environnement
  main.mjs            point d'entrée : choisit les adaptateurs et les assemble
public/index.html     l'interface (une seule page)
test/                 tests du domaine, du cas d'usage et de la config
```

Le cas d'usage attend trois ports :

- `llm.complete(system, text)` renvoie la réponse du modèle ;
- `scrubber.clean(text)` renvoie le texte nettoyé ;
- `quota.take(clientId)` renvoie `false` quand la limite du jour est atteinte.

Les erreurs du cas d'usage portent un `code` (`invalid`, `not_found`, `quota`, `parse`, `unavailable`). C'est l'adaptateur HTTP qui les traduit en statuts 400, 404, 429, 502 et 503.

Pour brancher un autre modèle, il suffit d'écrire un adaptateur qui expose `complete` et de le choisir dans `main.mjs`.

## Ce que l'app fait au texte

Chaque consigne envoyée au modèle contient une version courte des règles du [humanizer](https://github.com/blader/humanizer) : pas de tirets longs, pas de formules creuses, pas de « ce n'est pas X, c'est Y ». Le texte généré ressemble donc à un message écrit à la main.

Avant de renvoyer une réponse, le serveur retire les caractères Unicode invisibles qui servent parfois de filigrane au texte généré par IA. Ce nettoyage reprend la couche A de [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) (licence MIT, copie dans `src/adapters/scrubber/vendor/watermarks/`).

## API

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/api/quota` | | `{ used_today, daily_limit, remaining }` |
| POST | `/api/transform` | `{ text, tone, mode, diplomacy, language }` | `{ output_text }` |
| POST | `/api/reverse` | `{ text, intensity, language }` | `{ output_text }` |
| POST | `/api/antidote` | `{ text, language }` | `{ result: { translation, terms } }` |
| POST | `/api/bullshit_score` | `{ text, language }` | `{ result: { score, verdict, buzzwords } }` |

Valeurs acceptées : `tone` vaut `diplomatic`, `professional`, `assertive`, `humor` ou `passive_aggressive`. `mode` vaut `reformulate` ou `reply`. `diplomacy` va de 0 à 100. `intensity` vaut `franc`, `suffit` ou `nuclear`. `language` vaut `fr` ou `en`. Un texte fait 4000 caractères au maximum.

## Tests

```bash
npm test
```

## Limites

Le quota est gardé en mémoire : il repart de zéro au redémarrage et ne se partage pas entre plusieurs instances. Pour en faire tourner plusieurs, il faudra le stocker dans Redis.
