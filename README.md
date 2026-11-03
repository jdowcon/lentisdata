# LentisData 0.1

**Lentopallon syöttöjen ja syötön vastaanottojen tilastointisovellus.** Suomenkielinen, puhelimelle suunniteltu PWA, joka tallentaa kirjaukset paikallisesti myös ilman internetyhteyttä. Valmiit erät ja ottelut voidaan synkronoida GitHubiin suojatun Cloudflare Worker -palvelun kautta.

- **Sovellus:** https://jdowcon.github.io/lentisdata/
- **API:** https://lentisdata-api.jdowcon-lentisdata.workers.dev/
- **API:n terveystarkistus:** https://lentisdata-api.jdowcon-lentisdata.workers.dev/health
- **Suunnitelma 0.1:** [docs/SUUNNITELMA-0.1.md](docs/SUUNNITELMA-0.1.md)
- **Käyttöönotto:** [docs/KAYTTOONOTTO.md](docs/KAYTTOONOTTO.md)

> **Tila 3.11.2026:** Sovelluksen lähdekoodi ja GitHub Pages -julkaisutyönkulku ovat `main`-haarassa. Omistaja on ilmoittanut aktivoineensa GitHub Pagesin, mutta tuotantosivun toimivuutta ei ole vielä vahvistettu päästä päähän. Cloudflareen on julkaistu `lentisdata-api`, jonka `HUB`-Durable Object -sidonta näkyy tiliasetuksissa. GitHub-tallennuksen onnistunutta testiä ja mobiilin hyväksymistestiä ei ole vielä vahvistettu. **Älä käytä järjestelmää ainoana ottelutietojen tallennuspaikkana ennen hyväksymistestejä.**

## Mitä versio 0.1 sisältää?

### Ottelun perustiedot

Ottelua aloitettaessa määritellään **tilastoija, päivämäärä, turnaus, kotijoukkue, vierasjoukkue, oma joukkue ja pelattavien erien määrä (2 tai 3)**. Oma joukkue on aina joko koti- tai vierasjoukkue. Ottelun aikana tilastot kirjataan oman joukkueen näkökulmasta.

### Kahdeksan tilastointitapahtumaa

Kaikki kahdeksan painiketta ovat samaan aikaan näkyvissä kahdessa sarakkeessa. Yksi painallus tallentaa yhden tapahtuman; viimeisimmän voi perua ja kirjauksia voi korjata historiasta.

| Oma syöttö | Vastustajan syöttö / oma vastaanotto |
| --- | --- |
| **S1** – Syöttövirhe | **V1** – Vastustajan syöttövirhe |
| **S2** – Vastustajan vastaanotto passarin ruutuun | **V2** – Oma vastaanotto passarin ruutuun |
| **S3** – Vastustajan vastaanotto pelattavaksi | **V3** – Oma vastaanotto pelattavaksi |
| **S4** – Syöttöässä | **V4** – Vastaanottovirhe (vastustajan ässä) |

Sovellus **ei seuraa jatkopalloja, syöttövuoron vaihtumista eikä erän pistetilannetta reaaliajassa**. Syöttöässä tai syöttövirhe ei muuta automaattisesti erän pistetulosta.

### Erien ja ottelun päättäminen

- Tilastoija kirjaa **erän lopulliset pisteet käsin vasta erän päättyessä**.
- Erät 1 ja 2 pelataan 25 pisteeseen, vähintään kahden pisteen erolla.
- Kolmas erä pelataan aina, jos valittiin kolme erää, ja se pelataan 15 pisteeseen vähintään kahden pisteen erolla.
- Valitut **2 tai 3 erää pelataan aina**. Kahden erän ottelu voi päättyä erävoittoihin 1–1; kolmas erä pelataan myös silloin, kun kahden ensimmäisen erän tilanne on 2–0.
- Vahvistetut erätulokset määräävät erävoitot ja ottelun yhteenvedon. Tapahtumista ei johdeta pistetilannetta.
- Erän tai ottelun vahvistus muodostaa GitHub-synkronointitehtävän. Synkronoinnin valmistuminen ei saa estää seuraavan erän tilastointia.

### Raportointi ja varmuuskopiot

- Erä-, ottelu- ja turnauspäivän tilastoyhteenvedot sekä syöttö- ja vastaanottoprosentit.
- CSV-vienti ja JSON-varmuuskopion vienti/palautus.
- IndexedDB-tallennus sekä service workerin välimuisti offline-käyttöä varten.
- Syöttövirheitä ja ässiä raportoidaan, mutta näistä ei muodosteta ottelun pistelaskua.

**Huomaa:** Ennen toimivaa ja vahvistettua GitHub-synkronointia selaimen paikalliset tiedot voivat hävitä esimerkiksi selainprofiilin tai sivustodatan poiston yhteydessä. Ota JSON-varmuuskopio säännöllisesti.

## Arkkitehtuuri

| Osa | Toteutus |
| --- | --- |
| Käyttöliittymä | HTML, CSS ja modulaarinen JavaScript |
| Offline | PWA service worker ja IndexedDB |
| Julkinen verkkosivusto | GitHub Pages (`main`-haara) |
| Suojattu API | Cloudflare Worker `lentisdata-api` |
| Pysyvä koordinointi ja lähetysjono | SQLite-pohjainen Cloudflare Durable Object (`HUB` / `Hub`) |
| GitHub-kirjoitus | Rajattu GitHub App palvelinpuolella |
| Julkiset vahvistetut ottelutiedot | Saman repositorion `data`-haara |
| Testaus ja julkaisu | Node.js-testit sekä GitHub Actions |

**Versio 0.1 ei käytä Reactia, TypeScriptiä tai Viteä.** Toteutus on tarkoituksella kevyt eikä tarvitse verkkosivuston rakennusvaihetta.

Repositorio:

```text
main/
├── index.html
├── styles.css
├── manifest.webmanifest
├── sw.js
├── assets/
├── src/
│   ├── app.mjs
│   ├── domain.mjs
│   ├── storage.mjs
│   └── sync.mjs
├── api/
│   ├── worker.mjs
│   └── wrangler.toml
├── tests/
├── docs/
│   ├── SUUNNITELMA-0.1.md
│   └── KAYTTOONOTTO.md
└── .github/workflows/

data/
├── schema.json
└── matches/<match-id>/
    ├── metadata.json
    ├── set-1.json
    ├── set-2.json
    ├── set-3.json       # vain kolmieräisissä otteluissa
    └── summary.json
```

`data`-haaraan tulee ottelukohtaisia tiedostoja vasta onnistuneiden synkronointien seurauksena; yllä oleva hakemistorakenne on tavoiterakenne, ei väite jo tallennetuista otteluista.

## Käynnistä paikallisesti

Tarvitset Python 3:n tai muun tavallisen staattisen HTTP-palvelimen:

```bash
git clone https://github.com/jdowcon/lentisdata.git
cd lentisdata
python3 -m http.server 8080
```

Avaa http://localhost:8080. Paikallinen tilastointi ei edellytä Cloudflare- tai GitHub-kirjautumista. Pilvisynkronointi vaatii erillisen laiteaktivoinnin. Käytä paikallisessa testissä erillistä selainprofiilia, jos et halua sekoittaa sen otteluita julkaistuun sovellukseen.

### Automaattiset testit

Node.js 22 tai uudempi:

```bash
node --test tests/*.test.mjs
node --check api/worker.mjs
node --check sw.js
```

GitHub Pages -julkaisutyönkulku ajaa testit ennen julkaisua ja tarkistaa sen jälkeen julkaistun commitin sekä PWA-resurssien HTTPS-saatavuuden. Testikoodin olemassaolo ei yksin todista, että viimeisin GitHub Actions -ajo tai koko päästä päähän -toimintoketju olisi onnistunut.

## Cloudflare ja GitHub-synkronointi – nykytilanne

**Cloudflare-palvelu on luotu:** `lentisdata-api` löytyy tililtä, sillä on `workers.dev`-osoite, ja `HUB` Durable Object -sidonta sekä julkaisuversiot näkyvät Cloudflare-rajapinnassa. API-osoite on esiasetettu käyttöliittymään.

**GitHub App:** Omistaja on ilmoittanut luoneensa ja asentaneensa LentisDatan GitHub Appin. Sen tarkkaa asennusta ja oikeuksia ei ole vahvistettu tämän yhteyden avulla.

### Tietoturvatoimi ennen tuotantokäyttöä

**Tarkistuksessa 3.11.2026** Cloudflaren Worker-asetuksissa esiintyivät seuraavat neljä muuttujaa tyypillä `plain_text`, vaikka niiden tulee olla salaisina säilytettäviä arvoja tai vähintään tarkoituksenmukaisesti suojattuja määrityksiä:

- `ADMIN_TOKEN`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_ID`
- `GITHUB_INSTALLATION_ID`

Cloudflaren varsinaisten Worker Secrets -tietojen luettelo oli tarkistuksessa tyhjä. **Ennen käyttöä vaihda `ADMIN_TOKEN` ja GitHub Appin yksityinen avain uusiin arvoihin ja tallenna ne Secret-tyyppisinä Cloudflaren hallintanäkymässä.** Tarkista, että myös muut kaksi tunnistetta on määritetty tarkoituksenmukaisesti ja etteivät salaisuudet jää enää `plain_text`-sidonnoiksi. App ID ja Installation ID ovat tunnisteita, eivät yksityisiä avaimia, mutta niiden määrittely voidaan yhdenmukaistaa.

Avaa [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages → lentisdata-api → Settings → Variables and Secrets**. Älä koskaan tallenna avainten sisältöä GitHubin lähdekoodiin, julkiseen issueen, Actions-lokeihin tai keskusteluun. **Pelkkä `/health`-vastauksen `ready: true` ei todista turvallisia salaisuustyyppejä eikä GitHub-kirjoituksen onnistumista.**

### Synkronoinnin hyväksyminen

Käyttöönotto katsotaan valmiiksi vasta, kun seuraavat on todettu:

1. Workerin salaisuudet on korjattu ja GitHub Appilla on **Contents: Read and write** -oikeus vain `jdowcon/lentisdata`-repositorioon.
2. Ylläpitäjä on luonut kertakäyttöisen kutsukoodin, ja testilaite on aktivoitu.
3. Valmiin erän tiedot ilmestyvät `data`-haaraan, esimerkiksi `matches/<id>/set-1.json`.
4. Viimeisen erän ja ottelun vahvistuksen jälkeen `summary.json` sisältää oikeat eräversiot.
5. Offline-tilassa valmistunut erä siirtyy verkon palautuessa GitHubiin ilman päällekkäisiä tallennuksia.
6. Mobiilikäyttöliittymä ja varmuuskopiointi läpäisevät käytännön testit.

Tarkemmat ohjeet: [docs/KAYTTOONOTTO.md](docs/KAYTTOONOTTO.md). GitHub Actionsissa `CLOUDFLARE_ACCOUNT_ID` ja `CLOUDFLARE_API_TOKEN` tarvitaan **automaattiseen API-julkaisuun**, ei jo julkaistun Workerin käyttämiseen.

## Tietosuoja ja version rajoitukset

GitHub-repositorio ja `data`-haara ovat julkisia. Vahvistetut ottelutiedot voivat jäädä GitHubin julkiseen commit-historiaan. Julkiseen aineistoon ei viedä tilastoijan nimeä, laitteen yksityistä avainta eikä kutsukoodeja. Joukkue- ja turnausnimiin ei pidä syöttää salassa pidettäviä henkilötietoja.

Vain yksi laite voi kirjoittaa samaa ottelua pilvisynkronoinnin kautta. Päättynyttä erää voidaan korjata, mutta ei jatkaa normaalina käynnissä olevana eränä. Versio 0.1 ei sisällä pelaajakohtaista tilastointia, jatkopallojen analytiikkaa, automaattista pistekirjanpitoa tai todennettua monen laitteen yhtäaikaista saman ottelun editointia.

## Projektin seuranta

- [#1 – GitHub Pages -julkaisun ja ensimmäisen testikäytön tarkistus](https://github.com/jdowcon/lentisdata/issues/1)
- [#2 – Cloudflare ja GitHub App -synkronointi](https://github.com/jdowcon/lentisdata/issues/2)
- [#3 – Mobiili-, offline- ja hyväksymistestaus](https://github.com/jdowcon/lentisdata/issues/3)

**Version 0.1 toiminnallinen määrittely:** [docs/SUUNNITELMA-0.1.md](docs/SUUNNITELMA-0.1.md). Tämä README kuvaa toteutuksen ja käyttöönoton tämänhetkistä tilannetta; se ei korvaa varsinaista suunnitelmaa.
