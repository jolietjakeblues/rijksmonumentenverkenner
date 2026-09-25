# Rijksmonumentenverkenner

Facetzoek-prototype op het Nederlandse cultureel erfgoed van de Rijksdienst voor het Cultureel Erfgoed (RCE), zusje van de [Rijkscollectie Verkenner](../rijkscollectieverkenner) — zelfde patroon, andere ontologie (CEO/CHO in plaats van schema.org). Vier types op één schil: **Rijksmonumenten** (filter op monumentaard, juridische status, functie, provincie, gemeente, plaats, of zoek op naam/nummer), **Gezichten** en **Werelderfgoed** (filter op type, kaart toont de officiële (multi)polygoon), en **Complexen** (zoek op naam/complexnummer, klik door naar de rijksmonumenten die erbij horen). Resultaten als tabel of kaart (waar van toepassing), met doorklikbare facetwaarden en entity-pagina's. Zie [analyse.md](analyse.md) voor het volledige ontwerp.

```
public/index.html          -- de hele app (HTML/CSS/JS, geen build)
worker.js                  -- proxy-route /api/sparql
wrangler.jsonc
analyse.md                 -- ontwerpdocument (ontologie, valkuilen, bouwvolgorde)
```

Geen inlogscherm — anders dan de Rijkscollectie Verkenner (die auteursrechtelijk beschermde afbeeldingen toont) is dit prototype volledig open, net als de onderliggende data: de rijksmonumentenregistratie van de RCE is al publieke overheidsinformatie. Geen `SITE_USER`/`SITE_PASSWORD`, geen `RCE_TOKEN` nodig — het CHO-endpoint zelf is ook publiek toegankelijk (geverifieerd: een kale `curl` zonder `Authorization`-header krijgt gewoon een SPARQL-antwoord).

## Eenmalig instellen

```bash
npm install
npx wrangler login
```

## Lokaal draaien

```bash
npm run dev
```

Start `wrangler dev`. Werkt meteen tegen live data — geen secrets, geen `.dev.vars` nodig.

## Deployen

```bash
npm run deploy
```

## Belangrijke performance-bevinding (2026-09-25)

Dit RCE CHO-endpoint (Virtuoso) is **veel trager dan het Rijkscollectie-endpoint** bij aggregaties over de volledige, ongefilterde collectie (163k+ rijksmonumenten) — zelfs een `GROUP BY` over een klein veld als monumentaard (2 waarden) duurde 22-25 seconden; een aantal pogingen liep zelfs vast op een HTTP 504. RCE's eigen documentatie noemt zulke full-dataset-scans expliciet "kan tot ongeveer een minuut duren" — dit is dus geen bug in onze query's, maar hoe dit specifieke endpoint zich gedraagt.

**Consequenties voor het ontwerp:**
- **Geen ongefilterde standaardweergave.** Bij het openen van de pagina wordt niet automatisch de hele collectie geladen — de bezoeker ziet een "kies eerst een filter"-melding totdat er een filter of zoekterm actief is. Zodra er een filter actief is (ook maar één), is een aparte, kleine query wél snel (~1 seconde, geverifieerd).
- **Monumentaard, juridische status en provincie zijn vaste lijstjes** (2 / 3 / 12 waarden, met live-geverifieerde URI's) in plaats van via een dure `GROUP BY`-query ontdekt — de aantallen erachter worden opgehaald via kleine losse tellingen per waarde (snel), niet één grote aggregatie (traag).
- **Functie, gemeente en plaats laden geen top-N-lijst vooraf** — alleen live zoeken (typ 2+ tekens), en ook dat is met ~8-9 seconden niet supersnel maar wel begrensd tot waar de bezoeker daadwerkelijk naar zoekt in plaats van de hele collectie.
- Zowel `?rm a ceo:Rijksmonument` als de volledige-collectie-aggregatie zelf bleken los bij te dragen aan de traagheid — de type-join weglaten (waar het predicaat het domein al impliceert) scheelde alleen al een factor 3.

Zie [analyse.md](analyse.md) voor het volledige ontwerp, de geverifieerde CEO-ontologie-paden en de bekende valkuilen van dit endpoint.
