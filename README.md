# LentisData 0.1

**Lentopallon syöttöjen ja syötön vastaanottojen tilastointisovellus.** Suomenkielinen, puhelimelle suunniteltu PWA, joka tallentaa kirjaukset paikallisesti myös ilman internetyhteyttä. Valmiit erät ja ottelut voidaan synkronoida GitHubiin suojatun Cloudflare Worker -palvelun kautta.

- **Sovellus:** https://jdowcon.github.io/lentisdata/
- **API:** https://lentisdata-api.jdowcon-lentisdata.workers.dev/
- **API:n terveystarkistus:** https://lentisdata-api.jdowcon-lentisdata.workers.dev/health
- **Suunnitelma 0.1:** [docs/SUUNNITELMA-0.1.md](docs/SUUNNITELMA-0.1.md)
- **Käyttöönotto:** [docs/KAYTTOONOTTO.md](docs/KAYTTOONOTTO.md)

> **Testitilanne 4.11.2026:** Käyttäjä ilmoitti onnistuneesta terveystarkistuksesta, testilaitteen aktivoinnista ja yhden ottelun synkronoinnista. GitHub-tarkistuksessa ottelutiedostoja ei löytynyt. Offline-synkronointi ja mobiilitestaus ovat avoinna. Katso [synkronoinnin hyväksyminen](#synkronoinnin-hyväksyminen).

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

**Huomaa:** Selainprofiilin tai sivustodatan poisto voi hävittää paikalliset tiedot. Ota JSON-varmuuskopio säännöllisesti.

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

Yllä on synkronoinnin tavoiterakenne. GitHubissa tarkistetun `data`-haaran kärjessä oli 4.11.2026 vain `README.md` ja `schema.json`.

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

### Cloudflare-salaisuuksien tarkistus

**Tarkistus 3.11.2026: korjattu.** Cloudflare-yhteydellä varmistettiin, että seuraavat neljä `lentisdata-api`-Workerin muuttujaa ovat nyt kaikki tyypiltään `secret_text`:

- `ADMIN_TOKEN`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_ID`
- `GITHUB_INSTALLATION_ID`

Myös `HUB`-sidonta on edelleen käytössä. Alun perin muuttujat näkyivät `plain_text`-tyyppisinä, mutta tämä määritysongelma on nyt korjattu. Salaisuuksien sisältöä ei tarkistuksessa luettu.

**Vielä varmistettavaa:** turvallinen sidontatyyppi ei yksin todista tunnusten oikeellisuutta eikä GitHub-kirjoitusoikeutta. Jos ylläpitäjän avain tai GitHub Appin yksityinen avain on aiemmin voinut paljastua asiattomille, avaimet täytyy kierrättää; niiden vaihtamista ei ole vahvistettu. Älä julkaise tunnuksia koodissa, issueissa tai lokeissa.

### Synkronoinnin hyväksyminen

**Käyttäjän ilmoittama 4.11.2026:** API:n `/health` onnistui, testilaite aktivoitiin ja yksi ottelu synkronoitiin `data`-haaraan.

**GitHubista vahvistettu 4.11.2026:** [data-haaran tarkistettu commit `6860496`](https://github.com/jdowcon/lentisdata/tree/686049624364633b517fa070d6ce5885ff8add29) sisältää vain `README.md`- ja `schema.json`-tiedostot. Niissä ei havaittu tilastoijan henkilötietoja, tokeneita tai avaimia. `matches/` puuttuu, joten ilmoitetun ottelun tallennus ja ottelutiedostojen tietosuoja ovat vielä vahvistamatta.

- [ ] **Ottelutiedostot ja tietosuoja.** Etsi ilmoitetun ottelun GitHub-commit tai `matches/<id>/`-polku. Tarkista `metadata.json`, jokaisen pelatun erän `set-N.json` ja `summary.json`. Vertaa tuloksia ja yhteenvedon eräversioita sovelluksen tietoihin. Tarkista myös tiedostopolut, kentät ja vapaat tekstiarvot tilastoijan henkilötietojen, kutsukoodien, tokenien ja avainten varalta.
- [ ] **Offline-synkronointi.** Avaa sovellus verkossa aktivoidulla puhelimella ja katkaise yhteys. Kirjaa ja vahvista erä, aloita seuraava erä ja sulje sekä avaa sovellus edelleen offline-tilassa. Varmista, että kirjaukset ja lähetysjono säilyvät. Päätä kolmieräinen harjoitusottelu offline-tilassa, palauta yhteys ja varmista jonon tyhjeneminen. Tarkista GitHubista kaikki kolme erätiedostoa ja oikeat eräversiot yhteenvedossa. Katkaise ja palauta yhteys lähetyksen aikana ja varmista, että uudelleenyritys tuottaa yhden loogisen tallennuksen erää ja otteluyhteenvetoa kohti.
- [ ] **Mobiili ja varmuuskopio.** Testaa oikealla puhelimella sekä 320×568-, 360×640- ja 390×844-näkymissä. Kaikkien kahdeksan tilastointipainikkeen tulee näkyä yhtä aikaa ilman vaakavieritystä. Kokeile kaikkia painikkeita, perumista ja historiakorjausta. Varmista tietojen säilyminen sovelluksen sulkemisen jälkeen sekä JSON-varmuuskopion vienti ja palautus erillisessä selainprofiilissa. Seuranta [issuessa #3](https://github.com/jdowcon/lentisdata/issues/3).

Tarkemmat ohjeet: [docs/KAYTTOONOTTO.md](docs/KAYTTOONOTTO.md). GitHub Actionsissa `CLOUDFLARE_ACCOUNT_ID` ja `CLOUDFLARE_API_TOKEN` tarvitaan **automaattiseen API-julkaisuun**, ei jo julkaistun Workerin käyttämiseen.

## Tietosuoja ja version rajoitukset

GitHub-repositorio ja `data`-haara ovat julkisia. Vahvistetut ottelutiedot voivat jäädä GitHubin julkiseen commit-historiaan. Julkiseen aineistoon ei viedä tilastoijan nimeä, laitteen yksityistä avainta eikä kutsukoodeja. Joukkue- ja turnausnimiin ei pidä syöttää salassa pidettäviä henkilötietoja.

Vain yksi laite voi kirjoittaa samaa ottelua pilvisynkronoinnin kautta. Päättynyttä erää voidaan korjata, mutta ei jatkaa normaalina käynnissä olevana eränä. Versio 0.1 ei sisällä pelaajakohtaista tilastointia, jatkopallojen analytiikkaa, automaattista pistekirjanpitoa tai todennettua monen laitteen yhtäaikaista saman ottelun editointia.

## Projektin seuranta

- [#1 – GitHub Pages -julkaisun ja ensimmäisen testikäytön tarkistus](https://github.com/jdowcon/lentisdata/issues/1)
- [#2 – Cloudflare ja GitHub App -synkronointi](https://github.com/jdowcon/lentisdata/issues/2)
- [#3 – Mobiili-, offline- ja hyväksymistestaus](https://github.com/jdowcon/lentisdata/issues/3)

**Version 0.1 toiminnallinen määrittely:** [docs/SUUNNITELMA-0.1.md](docs/SUUNNITELMA-0.1.md). Tämä README kuvaa toteutuksen ja käyttöönoton tämänhetkistä tilannetta; se ei korvaa varsinaista suunnitelmaa.
