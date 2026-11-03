# LentisData 0.1

**Syöttöjen ja syötön vastaanottojen tilastointijärjestelmä** – suomenkielinen mobiiliystävällinen PWA, joka tallentaa paikallisesti myös offline-tilassa.

## Käynnistys paikallisesti

```bash
python3 -m http.server 8080
```

Avaa http://localhost:8080. Sovellus ei tarvitse npm-asennusta, pilvipalvelua tai kirjautumista paikalliseen tilastointiin. GitHub Pages -osoite julkaisemisen jälkeen: https://jdowcon.github.io/lentisdata/ (edellyttää Pagesin aktivointia).

## Mitä versiossa 0.1 toimii

- Ottelun perustiedot: tilastoija, päivämäärä, turnaus, koti/vieras, oma joukkue, 2 tai 3 erää.
- Kaikki 8 syöttö- ja vastaanottopainiketta vierekkäin myös puhelimella.
- Yksi painallus kirjaa tapahtuman; peruminen ja historian muokkaaminen.
- Eräpisteet kirjataan **vain erän lopuksi**. 1.–2. erä 25 p., 3. erä 15 p., kahden pisteen ero.
- Automaattinen erävoittojen laskenta annetuista erätuloksista (ei automaattista pistelaskua).
- Ottelu- ja turnausraportit, prosentit, CSV-vienti, paikallinen IndexedDB, JSON-varmuuskopiot.
- PWA:n service worker tallentaa sovelluksen offline-käyttöä varten ensimmäisen verkkolatauksen yhteydessä.
- Erän/ottelun vahvistus muodostaa synkronointitehtävän. API-toteutus on `api/`-kansiossa.

## GitHub-tallennus vaatii erillisen käyttöönoton

**Tärkeää:** Julkinen GitHub Pages ei voi kirjoittaa GitHubiin ilman suojattua palvelinta. Ilman API:n määritystä tiedot jäävät paikalliseen selaimeen; käyttäjälle ei saa näyttää virheellistä väitettä, että tiedot olisivat GitHubissa.

1. Ota GitHub Pages käyttöön repositorion Settings → Pages → Build and deployment → GitHub Actions.
2. Luo GitHub App, jolla on **Contents: Read and write** -oikeus vain `jdowcon/lentisdata`-repositorioosi. Asenna sovellus kyseiseen repositorioon.
3. Varmista, että repositoriossa on `data`-haara. Tämä haara on luotava erikseen kerran ennen ensimmäistä synkronointia.
4. Luo Cloudflare Workers -projekti `api/wrangler.toml`-asetusten pohjalta ja määritä salaisuudet `ADMIN_TOKEN`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`. Julkaise `wrangler deploy` -komennolla tai GitHub Actions -työnkululla (Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
5. Luo tilastoijan kutsu API:n hallintareitillä:

```bash
curl -X POST 'https://OMA-WORKER.workers.dev/admin/invites' \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: TURVALLINEN_YLLAPITOAVAIN' \
  -d '{"validDays":7}'
```

6. Avaa LentisData → Asetukset, syötä Workerin HTTPS-osoite ja aktivoi laite kutsukoodilla. Synkronointi käynnistyy erän ja ottelun vahvistamisesta.
7. Testaa synkronointitilat ja tallentuneet `data`-haaran tiedostot ennen oikeaa turnausta.

**Tietosuoja:** Data-haaran tiedot ovat julkisia. Ottelun tilastoijan nimeä ei lähetetä GitHubiin. Älä syötä julkisiin turnaus-/joukkuekenttiin salassa pidettäviä henkilötietoja. Laitteen salaista avainta ei viedä JSON-varmuuskopioon.

## Automaattiset testit

```bash
node --test tests/*.test.mjs
```

## Suunnitelma

Katselmoitu määrittely: [docs/SUUNNITELMA-0.1.md](docs/SUUNNITELMA-0.1.md).

## Version 0.1 rajoitukset

Tämä on ensimmäinen testattava versio. Cloudflare- ja GitHub App -tunnuksia ei luoda automaattisesti. Laitekohtainen kutsukoodilla tehtävä aktivointi ja GitHub-synkronointi toimivat vasta Workerin ja GitHub Appin käyttöönoton jälkeen. Päättynyttä erää ei voi jatkaa pelitapahtumien lisäämisellä; sitä voi korjata historia- ja pistekorjaustoiminnoilla. Samassa ottelussa sallitaan vain yksi kirjoittava laite, kun pilvisynkronointi on käytössä.
