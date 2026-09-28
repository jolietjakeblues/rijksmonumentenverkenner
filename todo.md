# Todo — openstaande punten uit de externe review + eigen ideeën

Punten uit de externe review op de live site (zie [analyse.md §14](analyse.md)) die nog niet zijn opgepakt, aangevuld met een paar eigen ideeën van eerder. Volgorde is niet per se prioriteit — dat bepalen we samen. De reviewer's eigen volgorde was: "eerst objectidentiteit en tellingen" (al gedaan, zie §14), "daarna herkenbare resultaatnamen en deelbare zoekselecties".

**Niet op deze lijst, bewust afgewezen:** een synthetische terugvalnaam voor "(naam onbekend)"-records (bv. opgebouwd uit adres/objectsoort/plaats). Reden: dat zou een verzonnen waarde tonen op de plek waar normaal een echte RCE-waarde staat — "dan veranderen we rijksdata". Blijft "(naam onbekend)".

---

## 1. ✅ Deelbare, reproduceerbare zoek-URL (2026-09-28)

**Geïmplementeerd** (idee van [kvistgaard/opsis](https://github.com/kvistgaard/opsis)' `syncUrl`): route `#/zoek/<type>?q=…&monumentaard=…&status=…&functie=…&provincie=…&gemeente=…&plaats=…&type=…&pagina=N&weergave=kaart`. Elke wijziging (type, zoekterm, filter, pagina, tabel/kaart) wordt met `history.replaceState` in de URL geschreven, dus geen extra stap in de terugknop per klik; een facet- of recordpagina openen pusht nog wel, zodat Terug naar de zoekopdracht terugkeert. Een kale eerste bezoek houdt een schone URL. Waarden uit een link worden gecontroleerd (URI's alleen als geldige http(s)-IRI, pagina als getal, kaart alleen bij types met kaart); ongeldige waarden vallen weg. Labels van functie/gemeente/gezichts-/werelderfgoedtype worden los opgehaald, zodat de chip de echte naam toont. Uitgeklapte rij zit er bewust niet in.

Tegelijk: queries gaan nu als form-POST naar de proxy en van daar naar RCE (geen URL-lengtegrens, geen CORS-preflight); de proxy accepteert GET `?query=` nog steeds. De proxylimiet van 4000 tekens is ongewijzigd.

Oorspronkelijke notitie:


**Doel:** een samengestelde zoekopdracht (zoekterm + actieve filters + type + pagina) delen als link, net zoals een facetwaarde (`#/entity/...`) of los record (`#/record/...`) dat al kunnen.

**Aanpak:** dezelfde hash-routing-aanpak hergebruiken/uitbreiden — bv. `#/zoek/<type>?q=...&monumentaard=...&pagina=...`. Vereist een derde `state.view`-achtige laag naast `browse`/`entity`/`record`, of `state.view === 'browse'` zelf laten meeschrijven naar `location.hash` bij elke filterwijziging (met debounce, anders loopt de hash vol bij elke toetsaanslag).

**Geschatte impact:** middel — raakt vrij veel bestaande state-mutatiepunten (elke facet-klik, elke zoekinvoer, paginaknoppen).

---

## 2. ✅ Rijksmonumentnummer altijd tonen in de resultatenlijst (2026-09-25)

**Geïmplementeerd:** reviewer moest een rij uitklappen om het rijksmonumentnummer te zien. Nummer staat nu als gedempt regeltje onder de naam, in zowel de hoofdtabel (`renderTableRijksmonument`) als de gemeente/functie/etc.-facetpagina's (`renderEntityTableRijksmonument`) — gekozen voor "onder de naam" i.p.v. een aparte kolom, om de tabel niet breder te maken. Alleen bij Rijksmonumenten, want alleen die hebben een rijksmonumentnummer (Gezicht/Werelderfgoed/Complex hebben hun eigen nummerveld, dat al zichtbaar was). Geen wijziging bij ontbrekend nummer — geen synthetische placeholder, gewoon niets extra's getoond (zelfde lijn als de afgewezen terugvalnaam hierboven). Geen nieuwe query nodig, `row.rmnrL` was al beschikbaar. Live geverifieerd op zowel de hoofdtabel als een gemeentepagina (Dordrecht), inclusief rijen met "(naam onbekend)".

---

## 3. Kaartdekking zichtbaar maken (en evt. kaart voor Complexen)

**Doel:** reviewer zag 8 kaartmarkers bij 12 tabelrijen zonder duidelijke reden. Toon boven de kaart hoeveel van de huidige pagina een punt heeft en hoeveel niet.

**Aanpak:** `renderMap`/`loadMap` weet al hoeveel rijen wel/geen geldige WKT hadden (de `bounds`-array vult zich alleen voor rijen mét punt) — dat tellen en via `setMapStatus` of een aparte regel tonen i.p.v. alleen de huidige "geen van de monumenten..."-melding bij nul treffers.

**Latere stap (apart, groter):** een kaart van de volledige gefilterde selectie i.p.v. alleen de huidige pagina — vereist een losse, lichte punten-only query zonder de zware detailvelden, mogelijk haalbaar dankzij de eerder gemeten snelheid van de `punten`-graph.

**Zijdelings, klein en bijna gratis:** Complexen hebben zelf geen geometrie, maar via `ceo:heeftRijksmonument` kan een Kaart-tab alsnog de punten van de leden tonen (dezelfde `punten`-graph-query als de hoofdkaart, gefilterd op `isOnderdeelVanComplex`) — de bouwstenen bestaan al, alleen de Kaart-tab hoeft niet meer verborgen te worden voor `state.browseType === 'complex'`.

**Geschatte impact:** klein voor de dekkingsteller; middel voor de volledige-selectie-kaart.

---

## 4. Default-scope van de Rijksmonumenten-tab

**Doel:** reviewer zag objecten met status "geen rijksmonument" onder de Rijksmonumenten-tab. Op dit moment bewust zo (juridischeStatus is een facet, geen standaardfilter) — maar dat is een productbeslissing die opnieuw bekeken kan worden: standaard filteren op status "rijksmonument", of expliciet in de UI benoemen dat ook "geen rijksmonument"/"voorbeschermd" getoond worden.

**Aanpak:** ofwel `state.juridischeStatus` een default-waarde geven bij het laden van de Rijksmonumenten-tab (met een zichtbare, wisbare chip, geen verborgen filter), ofwel een korte toelichtende tekst toevoegen bij de facet zelf.

**Geschatte impact:** klein, maar wel een zichtbare gedragswijziging — eerst samen de voorkeur bepalen.

---

## 5. Zichtbaar maken welke functie matcht op een facetpagina

**Doel:** op de facetpagina "Stationsgebouw" toont de tabel soms "Woonhuis" of "Administratiegebouw" als functie, omdat een object meerdere functies kan hebben maar er via `SAMPLE()` maar één getoond wordt — niet per se de functie waarop de selectie matcht. De reviewer noemt dit terecht verwarrend.

**Aanpak:** eerst live verifiëren hoeveel rijksmonumenten daadwerkelijk 2+ `heeftOorspronkelijkeFunctie`-relaties hebben (nog niet gemeten). Als dat een relevante minderheid is: op de entity-pagina voor een functiewaarde de matchende functie apart markeren (bv. vet, of als eerste in een kommagescheiden lijst) i.p.v. een willekeurige `SAMPLE()`.

**Geschatte impact:** middel — vereist eerst de multi-functie-aanname te verifiëren, dan een aanpassing in `buildEntityIdsQuery`/detailquery's voor dit specifieke pad.

---

## 6. Onderscheid "niet beschikbaar" / "niet van toepassing" / "expliciet geen relatie"

**Doel:** reviewer vraagt onderscheid tussen drie soorten afwezigheid, waar nu overal hetzelfde "onbekend"/"geen" staat. Let op: dit is het spiegelbeeld van de afgewezen terugvalnaam hierboven — hier gaat het niet om een waarde verzinnen, maar om eerlijker zijn over *waarom* een waarde ontbreekt, wat wél bij de bestaande "geen platte tekst, toon wat er echt is"-lijn past.

**Aanpak:** per veld nagaan of "geen waarde in de query-respons" ondubbelzinnig "geen relatie in de bron" betekent, of dat er een systematisch verschil is (bv. een object dat de betreffende relatie sowieso niet kan hebben, versus een object waarvoor de relatie leeg is). Vermoedelijk kleine wijzigingen per veld, geen grote herbouw — maar eerst per veld verifiëren tegen live data voordat er onderscheid gemaakt wordt dat de data niet waarmaakt.

**Geschatte impact:** klein tot middel, afhankelijk van hoeveel velden dit rechtvaardigen.

---

## 7. ✅ Bron-URI en begripslink per object (2026-09-28)

**Geïmplementeerd** (idee overgenomen van [kvistgaard/opsis](https://github.com/kvistgaard/opsis)): elke detailweergave (uitgeklapte rij, recordpagina) en elke facetpagina toont nu de bron-URI met kopieerknop en een link naar de linked-data-pagina, plus een inklapbaar blok "Alle gegevens als linked data": alle uitgaande triples en de inkomende links ("Verwezen vanuit"), pas opgehaald bij openklikken. Elke URI daarin is zelf weer uit te klappen (max. 4 niveaus), zodat bv. een naamloos `functie/131233`-knooppunt ter plekke toont wat het is ("Toegangshek"). Query-vorm: eerst begrenzen in een subselect, dan pas labels erbij — 0,8 s i.p.v. 7,4 s op het status-begrip "rijksmonument" (63.102 inkomende links). Plaats heeft geen URI (letterlijke waarde), dus daar geen blok.

Tegelijk: time-outs van het endpoint (TriplyDB geeft na ~1 minuut HTTP 504 `{"message":"Query has timed out."}`) worden nu als zodanig gemeld i.p.v. als algemene fout, ook in de live facetzoekopdracht (die had helemaal geen foutafhandeling). Een eventueel afgekapt antwoord (HTTP 206, Virtuoso-stijl) wordt getoond met een waarschuwing dat aantallen onvolledig kunnen zijn.

Oorspronkelijke notitie:


**Doel:** reviewer wil, "voor jouw vakgebied", per object de eigen bron-URI zichtbaar (voor wie verder wil, bv. naar de linked-data-pagina zelf) en per begrip (facetwaarde) een link naar de begripsbeschrijving (bv. de SKOS-conceptpagina).

**Aanpak:** bron-URI: klein, `row.rm.value`/`row.g.value`/`row.w.value`/`row.co.value` is al bekend, gewoon tonen als link in de detailweergave (vergelijkbaar met hoe de Rijkscollectie Verkenner dat al doet, zie CHO-URI-veld daar). Begripslink: per `entityLinkHtml`-waarde ook een externe link naar de concept-URI zelf (bv. `data.cultureelerfgoed.nl/term/...`) naast de interne doorkliklink.

**Geschatte impact:** klein.

---

## 8. Uitleg bij afgekorte functielabels

**Doel:** labels als "Woonhuis(K)" en "Archeologie (N1)" zijn onduidelijke afkortingen voor een bezoeker zonder domeinkennis.

**Aanpak:** eerst uitzoeken via de `semantics_describe_topic`/`ontology_describe_property`-achtige tools of de thesaurus zelf een uitgeschreven omschrijving per code heeft (bv. via `skos:scopeNote` of vergelijkbaar) — dan een tooltip/titel-attribuut toevoegen. Zo niet, dan is dit lastiger op te lossen zonder een eigen mapping te verzinnen (zie de afgewezen-sectie bovenaan: geen verzonnen uitleg).

**Geschatte impact:** klein als de thesaurus het al bevat, anders niet goed op te lossen.

---

## 9. Intro herschrijven, jargon naar "Over deze verkenner"

**Doel:** de huidige intro spreekt ontwikkelaars aan (SPARQL, CEO, ontologie, graph) en neemt in een smalle weergave bijna het hele eerste scherm in. Reviewer stelt voor: korte, publieksgerichte intro bovenaan, technische uitleg naar een aparte sectie/pagina.

**Aanpak:** de huidige `<p class="intro">` inkorten tot iets als "Zoek monumenten op naam of nummer. Verfijn op plaats, functie of provincie en bekijk de resultaten in een tabel of op de kaart." De technische achtergrond (SPARQL-endpoint, CEO-ontologie, RCE) verplaatsen naar een inklapbare sectie of een aparte "Over deze verkenner"-pagina.

**Geschatte impact:** klein, vooral tekst- en layoutwerk.

---

## 10. ✅ Toegankelijkheid: kaartmarker-labels en contrastcheck (2026-09-28)

**Kaart:** markers heten nu "naam, rijksmonument nummer" (Leaflet-`alt` en `title`) in plaats van allemaal "Marker"; ze waren al met het toetsenbord bereikbaar. De kaartcontainer heeft een `aria-label`, contouren van gezichten/werelderfgoed hun naam (`role="img"` + `aria-label`).

**Contrast, gemeten:** axe-core 4.13 (WCAG 2.0/2.1 A + AA) over negen toestanden (start, open facetten, resultaten, uitgeklapte rij met linked-data-blok, gesorteerd, kaart rijksmonumenten, kaart gezichten, facetpagina, recordpagina): **0 overtredingen**, vóór en na. Zelf nagerekend voor alle tekst/achtergrond-combinaties uit de CSS: alle tekst haalt AA (4,5:1); `--muted` zit op 5,3–7,0, `--ink` en `--gold` halen AAA. axe's "niet zeker"-gevallen nagelopen: het sorteerpijltje (decoratief, `aria-hidden`) en facetopties onder de scrollrand (zelfde kleuren, ≥ 6,5:1).

**Wel opgelost, want axe controleert dit niet (WCAG 1.4.11, niet-tekst-contrast ≥ 3:1):**
- rand van invoervelden: `--border` gaf 1,26:1 tegen het paneel; nu `--input-border` `#7d6f59` (3,52:1 paneel, 3,78:1 veld);
- rand van kaartcontouren: `#e0705f` gaf 1,86:1 op OSM-bos; nu `#a83a2c`, minimaal 3,75:1 tegen alle OSM-vlakkleuren (land, water, bos, gras, woonwijk, gebouw, weg, akker). De vulling blijft `#e0705f`.

**Bewust gelaten:** kaders van knoppen en panelen (`--border`) — die dragen een tekstlabel, dus het kader is niet nodig om ze te herkennen. Contouren op de kaart zijn niet met het toetsenbord te bereiken (een Leaflet-beperking); de tabel toont dezelfde objecten.

Oorspronkelijke notitie:


**Doel:** kaartmarkers heten in de toegankelijkheidsweergave allemaal "Marker" i.p.v. de objectnaam of het monumentnummer; de gedempte, kleine teksten (o.a. `--muted`-kleur) zijn nooit op contrast/leesbaarheid getest (geen WCAG-meting uitgevoerd door de reviewer).

**Aanpak:** Leaflet-markers krijgen een `alt`/`title`/ARIA-label via `L.marker(pt, { alt: naam, title: naam })` of een vergelijkbare optie — klein. Contrastcheck is geen bouwwerk maar een meting (bv. met een contrastchecker op `--muted` (`#ab9d84`) tegen `--paper`/`--surface`) — kan gewoon gedaan worden, geen open vraag.

**Geschatte impact:** klein voor de markerlabels; de contrastmeting is een kwartiertje werk, geen ontwerpvraag.

---

## 11. ✅ Sorteren op kolom (2026-09-28)

**Geïmplementeerd:** klikbare kolomkoppen (knoppen met `aria-sort`), klik wisselt oplopend → aflopend → standaardvolgorde. Welke kolommen, op basis van live metingen (niet-gecachet, eerste pagina):

| Type | Sorteerbaar op | Gemeten |
|---|---|---|
| Rijksmonumenten | naam | breedste filter (status "rijksmonument", ~63k): standaard 8 s, naam ~18 s; zoekterm/gemeente 1–3 s |
| Gezichten | naam, gezichtsnummer | < 1 s |
| Werelderfgoed | naam, jaar van inschrijving | < 1 s |
| Complexen | naam, complexnummer | 1–2 s |

**Bewust niet:** rijksmonumentnummer. Kost 34–48 s bij de breedste filters, te dicht bij de time-out van het endpoint (~60 s). Gemeente/functie/status ook niet: dat zijn labels achter extra joins, en waarschijnlijk nog duurder.

Details: nummers zijn `xsd:string` in CEO, dus die sorteren op lengte en dan als tekst (zelfde volgorde als numeriek, zonder cast per rij). Rijen zonder waarde (naamloze monumenten) staan in beide richtingen achteraan; bij gelijke waarde beslist de URI, zodat pagineren stabiel blijft. De sortering zit in de deelbare zoek-URL (`sorteer=naam`, `sorteer=naam-af`); een sortering die voor het type niet bestaat wordt genegeerd. Wisselen van type zet de sortering terug. Facetpagina's (`#/entity/...`) sorteren nog op URI.

Opvallend: namen die met een aanhalingsteken beginnen (`'De Nieuwe Kerk'`) staan vooraan bij A–Z — dat is de tekenvolgorde van het endpoint, niet aangepast.

Oorspronkelijke notitie:


**Doel:** resultaten staan nu vast op URI-volgorde (`ORDER BY ?rm`/`?g`/`?w`/`?co`), niet op naam, datum of nummer. Eigen idee, niet uit de review.

**Aanpak:** klikbare kolomkoppen die `ORDER BY` in de bestaande querybouwers aanpassen (bv. `ORDER BY ?naam` i.p.v. `ORDER BY ?rm`) — let op: sorteren op een `OPTIONAL`-gebonden veld zoals naam vereist een aparte, iets duurdere queryvorm (een ongebonden `?naam` sorteert anders dan een gebonden), dus eerst even testen tegen live data of dat de bekende performance-gevoeligheid van dit endpoint raakt.

**Geschatte impact:** klein tot middel, afhankelijk van de performance-test.

---

## 12. ✅ Horizontale overflow op mobiel bij een uitgeklapte rij (2026-09-28)

**Opgelost.** Op 390 px werd de pagina ~490 px te breed zodra een rij was uitgeklapt (en ~73 px met alleen de tabel); de recordpagina had hetzelfde. Drie oorzaken:
- `.detail-grid` (`repeat(auto-fit, minmax(150px, 1fr))` + `max-width: 900px`): bij het bepalen van de minimale breedte telt auto-fit zijn kolommen tegen die 900 px, dus 5 × 150 + gaten = 830 px minimaal, en de tabelcel kon niet smaller. Opgelost met `contain: inline-size`.
- `.layout` gebruikte `1fr`, en dat krimpt niet onder de inhoud; nu `minmax(0, 1fr)`, zodat een brede tabel binnen `.table-scroll` scrollt i.p.v. de hele pagina op te rekken.
- lange URI's in het linked-data-blok: `table-layout: fixed` + `overflow-wrap: anywhere`.

De resultatentabel met vier kolommen blijft op 390 px ~90 px breder dan haar kader en scrollt daarbinnen zijwaarts (bedoeld). De inhoud van een uitgeklapte rij is begrensd tot de zichtbare breedte van dat kader (`100cqw`) en blijft sticky links, zodat die niet mee wegscrollt. Gemeten op 390/700/1200 px: resultaten, uitgeklapte rij met open linked-data-blok, facetpagina en recordpagina, overal 0 px overflow.

---

## Openstaande vragen voor volgende sessie

- [ ] Hoeveel rijksmonumenten hebben 2+ `heeftOorspronkelijkeFunctie`-relaties? (punt 5, bepaalt of dat de moeite waard is)
- [ ] Heeft de CHT/ABR-thesaurus uitgeschreven omschrijvingen per afgekorte functiecode? (punt 8)
- [ ] Sluit `ORDER BY ?naam` (i.p.v. de huidige `ORDER BY ?rm`) nog steeds snel af op dit endpoint, ook ongefilterd... nee, ongefilterd wordt toch nooit gequeried (zie de performance-notitie in §9) -- dus alleen relevant binnen een actief filter. (punt 11)
