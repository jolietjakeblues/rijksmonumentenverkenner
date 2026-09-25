# Rijksmonumentenverkenner — analyse voor een CHO/CEO-variant (rijksmonumenten, gezichten, werelderfgoed)

Doel van dit document: eerst het ontwerp vastleggen, net als bij `raamwerk-analyse.md` in het Rijkscollectie-project. Dit project heeft een eigen ontologie (CEO in plaats van schema.org) maar dezelfde grondgedachte als de [Rijkscollectie Verkenner](../rijkscollectieverkenner).

**Status (2026-09-25):** alle vier fases uit §7 zijn gebouwd, live getest én gedeployed — Rijksmonument (zoek/filter/tabel/detail/entity-pagina's/kaart/Complex-koppeling), plus Gezicht en Werelderfgoed als volwaardige tweede en derde "type" naast Rijksmonument, met een type-keuze bovenaan de pagina (§10/§11), inclusief polygoonkaart en entity-pagina's voor hun eigen Type-facet. Tijdens het bouwen bleek het endpoint een performance-eigenaardigheid te hebben die het ontwerp meteen moest bijsturen — zie §9.

Endpoint: `https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql` — live gecheckt via de rce-cho MCP-tool (ontologie-introspectie + live instance-counts, vandaag beschikbaar, geen 503 meer zoals eerder deze week).

---

## 1. Het grootste architecturale verschil met Rijkscollectie

Rijkscollectie heeft **één vlakke class** (`schema:CreativeWork`) — alle 133k werken zijn hetzelfde "soort ding". CHO heeft voor dit doel **drie losse, ongelijksoortige classes**, met sterk verschillende schaal en sterk verschillende eigen facetten:

| Class | Live aantal | Eigen kern-eigenschappen |
|---|---:|---|
| `ceo:Rijksmonument` | **163.266** | monumentaard, juridische status, functie(s), type, geometrie |
| `ceo:Gezicht` (stads-/dorpsgezicht) | **954** | gezichtsstatus, bijzonder gebied |
| `ceo:Werelderfgoed` | **36** | werelderfgoedtype, werelderfgoedstatus |
| (`ceo:Complex`, groepering van monumenten) | 4.213 | vooral een koppel-node, geen eigen browse-doel op zich |

**Consequentie voor het ontwerp:** dit wordt geen simpele config-swap van de Rijkscollectie-engine. Er moet een **type-keuze** vóór de facetten komen ("Rijksmonumenten" / "Gezichten" / "Werelderfgoed", als tabs of een eerste selector) — de drie types delen bijna geen facetten (monumentaard/juridische status/functie zijn zinloos voor een Gezicht, gezichtsstatus is zinloos voor een Rijksmonument). Complex is geen vierde browse-tab, maar wél een link vanaf een Rijksmonument-detailpagina ("onderdeel van complex X").

---

## 2. Facetten per type (live geverifieerd via de ontologie)

### Rijksmonument
- **Monumentaard** — `ceo:heeftMonumentAard -> skos:prefLabel`. Binair: *archeologisch* / *onroerend gebouwd*. Concept-URI's al bekend en geverifieerd (`...b673c8c1...` / `...fc966a68...`), dus direct op URI filteren i.p.v. op labeltekst.
- **Juridische status** — `ceo:heeftJuridischeStatus -> skos:prefLabel`. Drie waarden: *rijksmonument*, *voorbeschermd*, *geen rijksmonument*. Ook hier bekende concept-URI's.
- **Functie** (oorspronkelijk én huidig) — `ceo:heeftOorspronkelijkeFunctie`/`ceo:heeftHuidigeFunctie -> ceo:heeftFunctieNaam -> skos:prefLabel`. Dit is de rijke, fijnmazige categorisering (vliegveld, fort, begraafplaats, kerk, molen, fabriek, ...) — géén kleine gesloten vocabulaire zoals Rijkscollectie's genre (20 termen), dus dit wordt qua UI-patroon meer een "maker"-achtig live-zoekfacet dan een vaste lijst.
- **Type** — `ceo:heeftType -> ceo:heeftTypeNaam -> skos:prefLabel`. Alternatief/breder categorisatiepad, empirisch het best gevulde veld in de hele dataset (907.767 triples, over bijna alle CHO-types heen).
- **Gemeente / Provincie** — `ceo:heeftBasisregistratieRelatie -> ceo:heeftGemeente`/`ceo:heeftProvincie`, wijst naar een OWMS-concept (overheidsterm), label op te halen via `resolve_concept_label(..., graph_name="owms")`.
- **Plaats (woonplaats)** — `ceo:heeftBasisregistratieRelatie -> ceo:heeftBAGRelatie -> ceo:woonplaatsnaam`, gewoon een string, geen concept-lookup nodig.

### Gezicht — bijgewerkt na dataonderzoek, zie §10
- **Type** — `ceo:heeftType -> ceo:heeftTypeNaam -> skos:prefLabel`. 6 waarden, live geteld: "III. Het dorp" (185), "I. De dichte stad" (148), "II.b Bebouwingsensembles" (59), "IV. Landschap" (50), "II.a De groene stad" (26), "V. Stadspark" (4). Dít is de bruikbare facet — klein en gesloten, zoals monumentaard.
- **Gezichtsstatus en bijzonderGebied zijn GEEN bruikbare facetten** — beide hebben maar één voorkomende waarde in de praktijk (status altijd "beschermd", bijzonderGebied altijd `true` waar aanwezig). Wel tonen als infoveld, niet als filter.
- **Geen gemeente/provincie/plaats** — Gezicht heeft geen `heeftBasisregistratieRelatie` (live geverifieerd, komt niet voor in de 17 uitgaande paden). Locatiecontext komt uitsluitend via de kaart.
- Naam: `ceo:heeftNaam -> ceo:naam` (944 van 954 hebben een naam).
- Extern: `ceo:wordtGetoondOp` linkt naar `kennis.cultureelerfgoed.nl` — mooie "meer info"-link, net als het Monumentenregister bij Rijksmonument.

### Werelderfgoed — bijgewerkt na dataonderzoek, zie §10
- **Werelderfgoedtype** — 4 waarden: cultuurlandschap (7), gebouwd erfgoed (7), archeologie (3), natuur (1).
- **Werelderfgoedstatus is GEEN bruikbare facet** — altijd "werelderfgoed" (18/18).
- **18 instanties, geen 36** — `class_instance_counts()` gaf eerder 36, maar een zorgvuldige `COUNT(DISTINCT ?w)` geeft 18, over 12 unieke sites (`werelderfgoednummer`/naam) — een aantal UNESCO-locaties (Neder-Germaanse Limes, Koloniën van Weldadigheid, Hollandse Waterlinies, Waddenzee) heeft meerdere deelgebieden, elk een eigen CHO-record met eigen geometrie. Toon alle 18 losse records (elk zijn eigen polygoon op de kaart), niet kunstmatig samengevoegd tot 12.
- Extern: `ceo:wordtGetoondOp` linkt rechtstreeks naar de **officiële UNESCO-pagina** (`whc.unesco.org/en/list/{nr}`) — zelfs beter dan het Monumentenregister-equivalent.
- Met 18 items: geen paginering, geen live-zoekfacet nodig — top-N/alles-in-één-keer is hier prima.

---

## 3. Geometrie & kaart — dit is waar deze dataset veel sterker is dan Rijkscollectie

Bij Rijkscollectie hadden Place-nodes **geen** coördinaten (punt 1 van het oude todo.md, nooit gebouwd: alleen 37 van 1060 plaatsen met een omweg via GeoNames). Bij CHO is dat compleet anders:

- **Rijksmonument heeft écht puntgeometrie**: `ceo:heeftGeometrie -> geo:asWKT`, kant-en-klaar WGS84 `POINT(lon lat)`, geen conversie nodig. Van de ~128.896 geometrie-triples op Rijksmonument zijn er 104.236 punten (de rest polygonen/multipolygonen bij grotere terreinen).
- **Beslissing (2026-09-25): geen zelf-berekende centroïden bij polygonen.** Een centroïde van een polygoon (bv. een groot terrein) valt vaak niet samen met waar je het monument in het echt zou aanwijzen — RCE's eigen punt zit vaker bij de hoofdingang oid. Voor de kaart gebruiken we daarom uitsluitend de **al-bestaande, officiële punten uit de graph `punten`** (`https://linkeddata.cultureelerfgoed.nl/graph/punten`) — nooit zelf een punt afleiden uit een polygoon. Een monument zonder punt in die graph toont dan simpelweg geen marker, in plaats van een misleidend zelfberekend punt.
- **Gezicht en Werelderfgoed hebben beide echte MultiPolygon-geometrie**, WGS84, via hetzelfde pad als Rijksmonument's punten: `ceo:heeftGeometrie -> geo:asWKT`. **Correctie op eerdere aanname (2026-09-25):** dit staat NIET in `gezicht_hvdl`/`werelderfgoed_hvdl` zoals ik eerst dacht — die twee graphs bevatten een ander soort geometrie (Rijksdriehoekscoördinaten via `ceo:asWKT-RD`, punten met een vooraf-berekende oppervlakte in hectare, vermoedelijk een oudere/administratieve representatie). De echte, bruikbare WGS84-polygonen staan in `GRAPH <instanties-rce>` — live geverifieerd voor beide types. Zie §10 voor het volledige onderzoek.
- Een kaarttab met Leaflet is hier dus **meteen** volwaardig te bouwen, geen work-around-fase nodig zoals bij Rijkscollectie.

**Praktisch aandachtspunt:** met 163k+ rijksmonumenten kun je nooit alle punten tegelijk op een kaart tekenen (browser/Leaflet-prestatie). Voorstel: de kaart toont standaard alleen de **huidige gefilterde/gepagineerde resultatenset** (dezelfde LIMIT/OFFSET als de tabel) — simpel, consistent met het bestaande paginamodel. Clustering (Leaflet.markercluster) of een "laad markers binnen huidige kaartuitsnede"-aanpak is een mogelijke latere verfijning, geen v1-vereiste.

---

## 4. "Alle URL's klikken door" — zelfde filosofie, rijkere doelen

Net als bij Rijkscollectie: elke facetwaarde (functie, type, juridische status, monumentaard, gemeente, provincie, gezichtsstatus, werelderfgoedstatus) wordt een eigen `#/entity/<dim>/<id>`-pagina met alle objecten binnen die waarde. Extra, hier uniek: elk rijksmonument kan doorlinken naar het **officiële monumentenregister** —
`https://monumentenregister.cultureelerfgoed.nl/monumenten/{rijksmonumentnummer}` — een kant-en-klaar, door RCE zelf gedocumenteerd linkpatroon, mooi passend bij de bestaande "doorklikken naar de bron"-filosofie (RKDartists, Getty AAT).

---

## 5. Valkuilen die al bekend zijn vóórdat er één regel code staat

Bij Rijkscollectie ontdekten we de meeste valkuilen (SAMPLE-correlatiebug, etc.) al bouwend. Hier heeft de rce-cho-tool ze al voorgekauwd — dus dit keer starten we pitfall-aware in plaats van ze na een review te vinden:

1. **Dubbeltelling zonder GRAPH-restrictie.** `heeftMonumentAard`/`heeftJuridischeStatus`-triples leven in graph `instanties-rce`; zonder `GRAPH <...instanties-rce>` én zonder `COUNT(DISTINCT ?cho)` tel je stil dubbel (gedocumenteerd: naïef 2963 archeologische monumenten vs. de echte 1499).
2. **`geo:hasGeometry` bestaat wel in de ontologie maar niet in de data.** Gebruik altijd `ceo:heeftGeometrie` — het "correcte" subproperty geeft stil 0 resultaten.
3. **BAG-adressen zijn multi-valued per verblijfsobject**, niet alleen per object — dedupliceer op `heeftVerblijfsobject`, niet op de adrestekst of de BAGRelatie-node zelf.
4. **BAG + BRK nooit in dezelfde query combineren** (cartesisch product) — apart ophalen, in code samenvoegen.
5. **ORDER BY + OPTIONAL geeft een structurele HTTP 504** op dit endpoint. Vereist het tweetraps-subquery-patroon (binnenste query filtert/sorteert/limit zonder OPTIONAL, buitenste query voegt pas OPTIONAL-labels toe aan de al-beperkte set) — hier vanaf dag één nodig, niet iets om later tegen te lopen.
6. **Alle "nummers" zijn `xsd:string`**, nooit een kaal getal: rijksmonumentnummer, huisnummer, perceelnummer, gezichtsnummer, werelderfgoednummer. Altijd quoten.
7. **Synoniemval bij functie-zoeken.** Vrije tekst matcht vaak niet de thesaurusterm (bv. "vliegveld" geeft 0 treffers; de echte term is "Luchthavencomplex"). Dit is een wezenlijk andere situatie dan Rijkscollectie's genre (20 vaste termen, geen synoniemprobleem) — de functie-facet verdient live-zoeken tegen de thesaurus zelf, of op z'n minst een UI-hint ("probeer een breder woord") in plaats van stilzwijgend "geen resultaten" te tonen alsof de categorie niet bestaat.

### Relevante named graphs (via `graphs_list()`, klaar voor gebruik morgen)

| Graph | URI | Waarvoor |
|---|---|---|
| `instanties-rce` | `.../graph/instanties-rce` | Actuele instantiedata — **verplicht** te scopen bij monumentaard/juridische status (zie valkuil 1) |
| `punten` | `.../graph/punten` | Puntgeometrie (alternatief voor/naast `instanties-rce`) |
| `gezicht_hvdl` | `.../graph/gezicht_hvdl` | **Niet gebruiken voor de kaart** — RD-coördinaten (`asWKT-RD`), punten met vooraf-berekende hectare-oppervlakte, geen polygonen. Zie §10. |
| `werelderfgoed_hvdl` | `.../graph/werelderfgoed_hvdl` | Vermoedelijk hetzelfde als `gezicht_hvdl` (niet apart geverifieerd, maar geometrie-strategie is nu sowieso via `instanties-rce`) |
| `owms` | `.../graph/owms` | OWMS-concepten, **inclusief gemeenten én provincies** |
| `tooi-gemeenten` | `.../rce/tooi/graph/gemeenten` | Alternatieve/aanvullende gemeentebron (TOOI) — nog niet vergeleken met de OWMS-route |
| `cbs-woonplaatsen` | `.../rce/cho/graphs/cbs_woonplaatsen` | CBS-woonplaatsen — mogelijk canoniekere bron voor "plaats" dan `woonplaatsnaam` op BAGRelatie |
| `aanwijzingenmonumenten` | `.../graph/aanwijzingenmonumenten` | Aanwijzingsdata monumenten (data rond `datumInschrijvingInMonumentenregister`?) |
| `abr-thesaurus` / `cht-thesaurus` | `data.cultureelerfgoed.nl/term/id/{abr,cht}/thesaurus` | De thesauri áchter functie/type — bron voor broader/narrower-synoniemexpansie (valkuil 7) |
| `linies`, `buitenplaatsen`, `groenaanleg` | eigen graphs | Extra domeingraphs (verdedigingslinies, buitenplaatsen, groene aanleg) — buiten scope v1, maar bestaand voor een latere uitbreiding voorbij de drie gevraagde types |

---

## 6. Wat hergebruikt wordt vs. wat echt nieuw is

**Vrijwel 1-op-1 hergebruikbaar** (uit `rijkscollectieverkenner`):
- De Cloudflare Worker + Static Assets-schil en de queryvorm-check (`isAllowedQuery`) uit `worker.js`. **Niet** hergebruikt: de inlogpagina + sessiecookie — deze data is al publiek (rijksmonumentenregistratie), dus `worker.js` hier heeft bewust geen loginlaag, in tegenstelling tot Rijkscollectie (dat auteursrechtelijk beschermde afbeeldingen toont).
- Het facetsidebar/entity-pagina/chips/tabs-patroon.
- De `SAMPLE()`-pack/unpack-truc voor correlerende OPTIONAL-velden (zal hier waarschijnlijk weer nodig zijn).
- Het inklapbare-facetten-patroon en de `reqToken`-staleness-guard voor async weergaves.

**Echt nieuw:**
- Een volledig nieuwe querylaag op de CEO-vocabulaire (geen hergebruik van schema.org-predicaten).
- Een type-keuze als eerste-klas concept (3 browsbare classes i.p.v. 1).
- Een Leaflet-kaarttab (hier voor het eerst echt goed mogelijk).
- Functie-zoeken met synoniembewustzijn.
- GRAPH-scoping als verplichte discipline vanaf de eerste query, niet een later geleerde les.

---

## 7. Voorgestelde bouwvolgorde

1. **✅ Alleen Rijksmonument** (163k, de dominante, risicovolste dataset qua schaal/valkuilen) — zoek/filter/tabel/detail. Bewijst dat de CEO-querypatronen (vooral GRAPH-scoping en het dubbeltelrisico) werken. **Gebouwd en lokaal live getest (2026-09-25).**
2. **✅ Kaarttab** voor Rijksmonument (puntgeometrie, uit de `punten`-graph). **Gebouwd en lokaal live getest (2026-09-25)** — toont alleen de huidige pagina, geen zelfberekende centroïden (zie §3).
3. **✅ Gezicht + Werelderfgoed** erbij, met (multi)polygonen op de kaart (uit `GRAPH <instanties-rce>` via `heeftGeometrie -> geo:asWKT`, niet uit `gezicht_hvdl`/`werelderfgoed_hvdl`, zie de correctie hierboven). **Gebouwd en live getest (2026-09-25)** — zie §11.
4. **✅ Complex-koppeling.** **Gebouwd en live getest (2026-09-25)** — een monument met `isOnderdeelVanComplex` toont dit nu als klikbaar veld in de detailweergave (`Rijnoord (complex 531014)`), met een eigen Complex-entitypagina die alle samenhangende monumenten oplijst (`isOnderdeelVanComplex` dekt ook het hoofdobject van een complex, geverifieerd: `isHoofdobjectVanComplex` wijst altijd naar dezelfde complex-URI, dus die aparte relatie hoefde niet apart bevraagd te worden).

---

## 8. Open vragen voor jou

- [x] Heb je zelf al zicht op of Gezicht/Werelderfgoed dezelfde gemeente/provincie-koppeling hebben als Rijksmonument? → **Nee, bevestigd**: geen van beide heeft `heeftBasisregistratieRelatie` (zie §10) — locatiecontext komt bij deze twee types uitsluitend via de kaart.
- [x] Bouwvolgorde uit §7 akkoord — fase 1+2 zijn gebouwd, precies in die volgorde.
- [ ] Deployen naar Cloudflare (secrets zetten, `npm run deploy`) — nog niet gedaan, wacht op akkoord.

---

## 9. Performance-bevinding tijdens het bouwen (2026-09-25) — dwong een ontwerpwijziging af

Tijdens het lokaal testen (via `wrangler dev` tegen de echte, publieke CHO-endpoint) bleek dit endpoint **drastisch trager** dan Rijkscollectie's bij aggregaties over de volledige, ongefilterde collectie:

| Query | Tijd |
|---|---:|
| Eén bekende URI, losse telling (geen aggregatie) | ~1s |
| `GROUP BY` over monumentaard (2 waarden), zonder `?rm a ceo:Rijksmonument`-join | ~7s |
| Idem, mét de type-join | ~22s |
| Ongefilterde browse-telling/lijst (163k) | 22s&ndash;58s, twee keer zelfs een **HTTP 504** |
| Functie-zoekopdracht (CONTAINS-filter, geen type-join) | ~8-9s |

RCE's eigen tooling documenteert dit al impliciet (`class_instance_counts()`: "Full-dataset GROUP BY-scan, kan tot ongeveer een minuut duren") — dit is dus een eigenschap van deze specifieke Virtuoso-instantie, geen fout in onze query's. Twee concrete, gemeten verbeteringen:
1. **De `?rm a ceo:Rijksmonument`-join weglaten** waar het predicaat het domein al impliceert (bv. `heeftMonumentAard`, `heeftOorspronkelijkeFunctie`) scheelde een factor 3.
2. **Eén bekende-URI-telling is exponentieel goedkoper dan een aggregaat** over alle waarden — dit werd de basis voor de definitieve aanpak.

**Ontwerpwijziging die hieruit volgde (al doorgevoerd in de gebouwde v1):**
- Geen automatische ongefilterde weergave bij het openen van de pagina — de bezoeker ziet een "kies eerst een filter"-melding totdat er een filter of zoekterm actief is.
- Monumentaard (2), juridische status (3) en provincie (12) zijn **vaste, live-geverifieerde lijstjes** in de code, met aantallen opgehaald via N kleine parallelle losse tellingen in plaats van één trage aggregatie.
- Functie, gemeente en plaats laden **geen top-N-lijst vooraf** — alleen live zoeken vanaf 2 tekens, zelf ook niet instant (~8-9s) maar begrensd tot de zoekterm.

Dit raakt met name §2 hierboven (facetten) — die sectie beschrijft nog de oorspronkelijke, vóór deze ontdekking bedachte aanpak (top-N via `GROUP BY`); de daadwerkelijk gebouwde versie werkt zoals hierboven beschreven.

---

## 10. Dataonderzoek Gezicht + Werelderfgoed (2026-09-25)

Voor we gaan bouwen, eerst de data zelf bestudeerd (zoals gevraagd) — met één belangrijke correctie op de oorspronkelijke aanname uit §3.

### Performance: geen probleem hier
Beide types zijn klein genoeg (954 resp. 18) dat de Rijksmonument-trucs (geen ongefilterde weergave, vaste lijstjes + losse tellingen, search-only voor open vocabulaires) **niet nodig zijn**. Live gemeten: een ongefilterde `COUNT` over alle Gezichten en een volledige type-facetaggregatie duren allebei ~0-1 seconde. Gezicht en Werelderfgoed mogen dus gewoon eager laden, met paginering/top-N zoals de Rijkscollectie-app dat oorspronkelijk deed.

### Gezicht (954, waarvan 944 met naam)
- **Bruikbare facet: Type** (`heeftType -> heeftTypeNaam -> skos:prefLabel`, let op: dit label heeft géén taal-tag, dus geen `FILTER(lang(...)="nl")` gebruiken — die filtert hier alles weg). 6 vaste waarden: I. De dichte stad, II.a De groene stad, II.b Bebouwingsensembles, III. Het dorp, IV. Landschap, V. Stadspark.
- Gezichtsstatus en bijzonderGebied: geen facetten (zie §2), wel infovelden.
- Geen gemeente/provincie/plaats mogelijk — geen `heeftBasisregistratieRelatie`.
- Extra velden: `gezichtsnummer`, `inProceduredatumGezicht`, `intrekkingsdatumGezicht` (bij intrekking — slechts 9/954), `wordtGetoondOp` (link naar kennis.cultureelerfgoed.nl).
- Geometrie: `GRAPH <instanties-rce> { ?g heeftGeometrie ?geom . ?geom geo:asWKT ?wkt }` → MultiPolygon, WGS84, direct bruikbaar in Leaflet.

### Werelderfgoed (18 instanties over 12 unieke UNESCO-sites)
- **Bruikbare facet: Type** — cultuurlandschap (7), gebouwd erfgoed (7), archeologie (3), natuur (1).
- Werelderfgoedstatus: geen facet (altijd "werelderfgoed").
- Extra velden: `werelderfgoednummer` (komt overeen met het echte UNESCO WHC-nummer, bv. 759 = Hollandse Waterlinies, 965 = Rietveld Schröderhuis — geverifieerd correct), `jaarVanInschrijving`, `wordtGetoondOp` (rechtstreeks naar `whc.unesco.org/en/list/{nr}` — de officiële UNESCO-pagina).
- Sites met meerdere deelgebieden (Neder-Germaanse Limes, Koloniën van Weldadigheid, Hollandse Waterlinies, Waddenzee) hebben elk meerdere CHO-records met een eigen polygoon — toon alle 18 apart, niet samengevoegd.
- Geometrie: zelfde pad als Gezicht, ook MultiPolygon/WGS84 via `instanties-rce`.

### Voorgesteld ontwerp voor de type-keuze
Een rij tabs bovenaan (**Rijksmonumenten** / **Gezichten** / **Werelderfgoed**) die bepaalt welke facetten, tabelkolommen, detailvelden en entity-dimensies actief zijn — drie parallelle configuraties op dezelfde schil (zoekbalk, Tabel/Kaart-tabs, chips, pager, entity-pagina's). Concreet per type:

| | Rijksmonumenten | Gezichten | Werelderfgoed |
|---|---|---|---|
| Facetten | monumentaard, status, functie, provincie, gemeente, plaats | type (6) | type (4) |
| Zoeken | naam of rijksmonumentnummer | naam | naam |
| Tabelkolommen | Naam, Gemeente, Functie, Status | Naam, Type, Gezichtsnummer | Naam, Type, Jaar van inschrijving |
| Kaart | punten (`punten`-graph) | **multipolygon** (`instanties-rce`) | **multipolygon** (`instanties-rce`) |
| Extern | Monumentenregister | kennis.cultureelerfgoed.nl | whc.unesco.org (UNESCO zelf) |
| Paginering nodig? | ja (163k) | optioneel (954, top-N kan ook) | nee (18, alles in één lijst) |

Leaflet kan zowel punten (`L.marker`) als (multi)polygonen (`L.geoJSON` of `L.polygon`) op dezelfde kaartinstantie tonen — geen aparte kaartcomponent nodig, wel een aparte render-tak afhankelijk van het actieve type.

---

## 11. Gebouwd: type-keuze, Gezicht en Werelderfgoed (2026-09-25)

Het ontwerp uit §10 is één-op-één gebouwd, live getest (lokaal tegen echte CHO-data) en gedeployed.

**Architectuur:** een rij tabs (`Rijksmonumenten` / `Gezichten` / `Werelderfgoed`) zet `state.browseType`, die op zijn beurt bepaalt welke facet-groepen zichtbaar zijn (`[data-type-group]`-wrappers), welke tabelkoppen/kolommen getoond worden, en welke querybouwers/detailvelden/kaartmodus actief zijn. De al-bestaande Rijksmonument-functies zijn ongewijzigd gebleven (alleen hernoemd naar een `...Rijksmonument`-suffix); `loadResults`, `hasActiveFilter`, `loadFacets`, `renderTable` en de entity-pagina-functies zijn nu dunne dispatchers die op `state.browseType` routeren. Reset en type-wisselen delen één `resetAllFilters()`, zodat overstappen naar een ander type nooit filters van het vorige type laat "hangen".

**Twee bugs onderweg gevonden en gefixt (niet pas na een review):**
1. De WKT-(multi)polygoon-parser (geneste haakjes → Leaflet's 3-diepe `LatLng[][][]`) had een fout bij écht meervoudige polygonen (aparte deelgebieden) — een komma tussen twee polygoon-groepen werd per ongeluk als coördinatentekst gebufferd. Ontdekt en gefixt vóórdat de code de app inging, via een losse Node-test met een zelfgemaakte multi-polygoon-WKT en de al-bekende live Gezicht-WKT (25 punten, ring correct gesloten).
2. De kaart-popup van Rijksmonument-punten linkte naar `localId(r.rm.value)` (het interne CHO-nummer, bv. "10052") in plaats van naar `rijksmonumentnummer` (bv. "20902") — twee totaal verschillende nummers. `buildMapPointsQuery` haalde het echte nummer niet eens op. Gevonden tijdens deze uitbreiding, niet eerder opgemerkt; nu gefixt (de kaart-popup linkt nu naar het juiste Monumentenregister-record, of toont geen linkje als het nummer ontbreekt in plaats van een verkeerd linkje).

**Kleine datadiscrepantie, geen bug:** `class_instance_counts()` meldde eerder 954 Gezicht-instanties; een rechtstreekse `COUNT(DISTINCT ?g) WHERE { ?g a ceo:Gezicht }` geeft live 482. Zelfde soort graph-duplicatie-effect als bij Rijksmonument in §9 — de app toont consequent het rechtstreeks-bevraagde (482), niet het tool-gerapporteerde getal.

**Live geverifieerd (o.a.):** Gezicht-Type-facet exact zoals §10 voorspelde (185/148/59/50/26/4), Werelderfgoed 18 locaties over 12 sites met Type-facet (7/7/3/1), kaart-polygonen + popups met de juiste externe links (kennis.cultureelerfgoed.nl resp. whc.unesco.org/en/list/759), entity-pagina's voor beide nieuwe Type-facetten, en dat terugschakelen naar Rijksmonument de juiste kolommen/placeholder/facetten herstelt.

---

## 12. Gebouwd: Complex als vierde type, met doorklikken (2026-09-25)

Complex was tot nu toe alleen bereikbaar als facetwaarde vanaf een Rijksmonument-detailrij (`isOnderdeelVanComplex`). Op verzoek ("doorklikken en complexen ook toevoegen") is Complex nu een vierde, volwaardige type-tab, met als kernfunctie doorklikken naar de rijksmonumenten die bij een complex horen.

**Onderzoek vooraf:** geen directe RDF-relatie tussen Gezicht/Werelderfgoed en Rijksmonument of Complex bevestigd (leeg resultaat op beide richtingen) — het "complexen"-concept bestaat alleen aan de Rijksmonument-kant. Complex zelf: 2.834 losse instanties (`?co a ceo:Complex` zonder GRAPH-scoping gaf 4.213 — hetzelfde dubbeltel-effect als de 954-vs-482 Gezicht-discrepantie uit §11, hier opgelost met `SELECT DISTINCT`/`COUNT(DISTINCT ?co)`, geen GRAPH-scoping nodig). Complex heeft geen eigen facetteerbare velden (geen monumentaard/provincie/etc.) en geen eigen geometrie (geen `heeftGeometrie`) — dus geen Kaart-tab. Wel bruikbaar: `heeftNaam`/`naam`, `complexnummer`, `heeftHoofdobject`, en `heeftRijksmonument` (de voorwaartse richting van `isOnderdeelVanComplex`, live geverifieerd).

**Ontwerp:** klein en snel genoeg (0,2–0,3s, ook met een `COUNT(DISTINCT ?rm)`-aggregaat per pagina van 12 rijen) om net als Gezicht/Werelderfgoed eager te laden, geen filter nodig. Zoekbalk werkt op naam (CONTAINS) of complexnummer (exact, bij een numerieke zoekterm — zelfde patroon als rijksmonumentnummer-zoeken in §9). Tabel toont Naam, Complexnummer, Onderdelen (telling). Een geopende rij toont het hoofdobject en een "Bekijk N rijksmonumenten →"-knop die de bestaande `complex`-entity-pagina opent — dezelfde pagina die al bestond vanaf een Rijksmonument's eigen Complex-veld, nu hergebruikt in de andere richting. Geen nieuwe entity-pagina-code nodig.

**Live geverifieerd:** tab toont "2.834 complexen"; zoeken op complexnummer ("511109") en op naam ("kasteel", 4 treffers) werken; een geopende rij ("Vinkenduin") toont hoofdobject en onderdelen-telling; de doorklik-knop opent `#/entity/complex/...` met de 4 bijbehorende rijksmonumenten en schakelt de type-tab automatisch naar Rijksmonumenten (zelfde gedrag als een bestaande facet-doorklik); Kaart-tab is verborgen voor Complexen en verschijnt weer bij het wisselen naar de andere types; Gezichten-tab getest op regressie (nog steeds 482 resultaten, Kaart-tab nog aanwezig).

---

## 13. Gebouwd: geen platte tekst meer -- alles met een URI is doorklikbaar (2026-09-25)

Vervolgvraag op §12: "als ze bestaan ook monumenten, gezichten en werelderfgoed laten doorklikken, functies/gemeenten/provincies/plaatsen natuurlijk ook" -- verduidelijkt als: dezelfde regel die de Rijkscollectie Verkenner al hanteert, hier ook doorvoeren: elk veld waarvan de onderliggende waarde een URI is, wordt doorklikbaar, nooit platte tekst.

**Audit van alle vier detailweergaven** vond drie concrete gaten (Rijksmonument zelf had er geen -- monumentaard/status/functie/provincie/gemeente/plaats/complex waren al stuk voor stuk doorklikbaar):
1. **Gezicht "Status"** (`heeftGezichtsstatus`) -- had wel een concept-URI, maar alleen het label werd opgehaald; nu ook de URI (zelfde `packedPair`-truc als overal elders) en doorklikbaar als nieuwe entity-dim `gezichtStatus`.
2. **Werelderfgoed "Status"** (`heeftWerelderfgoedstatus`) -- ontbrak zelfs helemaal in de detailquery; toegevoegd als nieuw veld + nieuwe entity-dim `werelderfgoedStatus`.
3. **Complex "Hoofdobject"** (`heeftHoofdobject`) -- een losse verwijzing naar precies één specifiek rijksmonument, niet naar een facetwaarde met een lijst erachter. Dit paste niet in het bestaande `#/entity/<dim>/<id>`-lijstpatroon, dus is er een nieuw, kleiner pagina-type bijgekomen: een **single-record permalink** (`#/record/<type>/<id>`), die het bestaande `detailRowHtmlX`-fragment (al gebouwd voor de inline "open row"-uitklap) hergebruikt als losse pagina. Werkt voor alle drie typen (rijksmonument/gezicht/werelderfgoed), al heeft momenteel alleen Hoofdobject er een link naartoe.

Beide status-velden bleken **single-valued over de hele dataset** (472/482 gezichten "beschermd", alle 18 werelderfgoed-records "werelderfgoed", live geverifieerd) -- toch doorklikbaar gemaakt, want de regel is: heeft het een URI, dan is het geen platte tekst, ongeacht hoe interessant de resulterende lijst is.

**Architectuur van de nieuwe record-pagina:** een derde `state.view`-waarde (`'record'`, naast `'browse'`/`'entity'`), eigen paneel (`#recordView`, hergebruikt de `.entity-view`-stijl), eigen click-handler (`.record-link` i.p.v. `.entity-link` -- bewust een aparte CSS-klasse, anders zou `handleEntityLinkClick`'s generieke `.entity-link`-matcher ook record-links proberen te openen als entity-dim). Schakelt, anders dan een entity-pagina, nooit van type-tab: de bezoeker blijft op het tabblad waar hij was (bv. Complexen) en "Terug naar zoeken" keert daar ook naar terug, in plaats van geforceerd naar het type van het bekeken record.

**Live geverifieerd:** Complex "Vinkenduin" (511109) had een hoofdobject zonder naam (rijksmonumentnummer 511110) -- eerst per ongeluk niet-klikbaar omdat de naam-fallback ontbrak, gefixt met dezelfde "(naam onbekend)"-conventie die de rest van de app al gebruikt; doorklikken opent `#/record/rijksmonument/...` met het volledige monumentdetail (inclusief zijn eigen doorklikbare Complex-veld terug naar Vinkenduin) en "Terug naar zoeken" landt weer op het Complexen-tabblad. Gezicht-status "beschermd" opent `#/entity/gezichtStatus/...` met 472 gezichten. Werelderfgoed-status "werelderfgoed" verschijnt en is klikbaar. Geen consolefouten.

**Nog een gemist gat (gevonden door de gebruiker via screenshot):** de entity-pagina's zelf -- de resultatenlijst die je ziet ná het doorklikken op een facetwaarde, bv. de "Overbetuwe"-pagina met 121 monumenten -- gebruiken een aparte render-functie (`renderEntityTableX`) dan de hoofdtabel, en díe toonde Gemeente/Functie (Rijksmonument) en Type (Gezicht/Werelderfgoed) nog als platte tekst, plus Naam had daar sowieso nog nooit een doorklikmogelijkheid (geen rij-uitklap zoals de hoofdtabel). Gefixt: `renderEntityTableRijksmonument`/`Gezicht`/`Werelderfgoed` gebruiken nu overal `entityLinkHtml` voor Gemeente/Functie/Type, en Naam linkt nu naar de nieuwe record-permalinkpagina uit deze sectie. Live geverifieerd op exact het scenario uit de screenshot: Gemeente-pagina "Overbetuwe" (121 monumenten) -- "Kasteel, buitenplaats" (Functie) is nu een knop die naar `#/entity/functie/...` opent, "De Mellard" (Naam) is nu een knop die naar `#/record/rijksmonument/...` opent; Gezicht-Type-pagina "III. Het dorp" (185 gezichten) toont Naam en Type ook beide als knop. Geen consolefouten.

---

**Status:** vier types gebouwd (Rijksmonumenten, Gezichten, Werelderfgoed, Complexen), live getest en gedeployed. `C:\AI\projects\rijksmonumentenverkenner` is een werkende faceted-search-app over de volledige CHO-heritage-objectenset.
