# LentisData 0.1 – turvallinen käyttöönotto

Projektin lähdekoodi on julkisessa repositoriossa [jdowcon/lentisdata](https://github.com/jdowcon/lentisdata), ja ottelutiedot tallennetaan erilliseen `data`-haaraan. Sovelluksen osoite on https://jdowcon.github.io/lentisdata/.

**Tilanne 3.11.2026:** GitHub Pages -aktivointi on käyttäjän mukaan tehty. GitHub Actions -julkaisun onnistumista ja oikean puhelimen testiä ei ole vielä todennettu. Cloudflare-tili on olemassa, mutta Workerin julkaisu ja GitHub Appin oikeudet ovat vielä käyttöönottovaiheessa.

## Cloudflare-yhteyden tämänhetkinen tila (3.11.2026)

Cloudflare-pluginin avulla on luotu ja julkaistu Worker **lentisdata-api** käyttäjän Cloudflare-tilille.

- Worker: https://lentisdata-api.jdowcon-lentisdata.workers.dev/
- Health: https://lentisdata-api.jdowcon-lentisdata.workers.dev/health
- Cloudflare workers.dev -aliverkkotunnus: `jdowcon-lentisdata`
- `HUB` SQLite Durable Object -sidonta ja v1-migraatio ovat mukana julkaistussa konfiguraatiossa
- Worker-salaisuuksia ei ole vielä asetettu, joten `/health`-vastauksen pitäisi sisältää `ready:false`
- Sovelluksen API-osoite on nyt valmiiksi määritetty lähdekoodissa; vanhojen selaintietojen tyhjä osoite täydennetään avattaessa.

**Älä luo toista Workeria.** Pilven infrastruktuuri on luotu Cloudflare-yhteydellä; GitHub Actions -automaatioon tarvittavat `CLOUDFLARE_ACCOUNT_ID` ja `CLOUDFLARE_API_TOKEN` ovat valinnaiset tähänastisen manuaalisen plugin-julkaisun kannalta mutta tarvitaan jatkossa Actions-pohjaiseen ylläpitoon. Seuraava vaatimus on luoda repositorioon rajattu oma GitHub App ja asettaa neljä Workerin salaisuutta turvallisesti.

## 1. GitHub Pages -tarkistus

Avaa [Pages-julkaisutyönkulku](https://github.com/jdowcon/lentisdata/actions/workflows/deploy-pages.yml) ja varmista, että viimeisin ajo on onnistunut. Työnkulku tarkistaa myös julkaistun commitin ja PWA-tiedostot. Jos vihreää ajoa ei näy, käynnistä **Run workflow** ja katso mahdolliset virheet lokista. Testaa https://jdowcon.github.io/lentisdata/ puhelimella.

## 2. Cloudflare API -julkaisun valmistelu (Cloudflare-tili on jo olemassa)

**Cloudflare Dashboard:**

1. Kirjaudu https://dash.cloudflare.com/ ja avaa oikea tili.
2. Kopioi **Account ID** (ei Zone ID).
3. Avaa **Manage Account → Account API Tokens** / https://dash.cloudflare.com/profile/api-tokens.
4. Luo **Custom Token / Edit Cloudflare Workers** -mallista rajattu API-token. Rajaa oikeudet kyseiseen Cloudflare-tiliin; varmista Workers Scriptin ja Durable Objectin julkaisuun tarvittavat oikeudet. Älä käytä Global API Keytä.

**GitHub:** avaa https://github.com/jdowcon/lentisdata/settings/secrets/actions ja luo kaksi *Repository secret* -arvoa:

| Salaisuuden nimi | Arvo |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflaren Account ID |
| `CLOUDFLARE_API_TOKEN` | Luomasi rajattu Cloudflare API Token |

Älä sijoita avaimia repositorion tiedostoihin, issueihin, Actions-lokeihin tai ChatGPT-keskusteluun.

**Julkaise Worker:** avaa https://github.com/jdowcon/lentisdata/actions/workflows/deploy-api.yml → **Run workflow** (`main`-haara). Työnkulku käyttää `api/wrangler.toml`-asetuksia ja julkaisee Workerin nimellä `lentisdata-api` sekä luo SQLite-pohjaisen Durable Object -tilan `Hub`. Manuaalinen julkaisu epäonnistuu tarkoituksella selkeällä ilmoituksella, jos edellä mainitut salaisuudet puuttuvat.

## 3. GitHub App (erillinen ChatGPT:n GitHub-yhteydestä)

Luo **oma** GitHub App osoitteessa https://github.com/settings/apps/new. ChatGPT:n mahdollinen GitHub-yhteys ei ole LentisDatan tuotantotallennukseen tarkoitettu tunnus.

- Valitse yksilöllinen nimi (esim. `lentisdata-writer-jdowcon` jos vapaa) ja Homepage URL `https://github.com/jdowcon/lentisdata`.
- Poista **Active** webhook -valinta, koska sovellus ei tarvitse webhookeja; älä ota OAuth- tai Device Flow -kirjautumista käyttöön.
- **Repository permissions → Contents: Read and write**. Metadata-read -oikeus tulee GitHubin oletuksena.
- **Where can this GitHub App be installed? → Only on this account**. Luo sovellus.
- Kopioi GitHub Appin **App ID**. Valitse **Generate a private key**; sen sisältö pitää säilyttää salaisuutena.
- Valitse **Install App → Only select repositories → lentisdata** ja kopioi **Installation ID** asennuksen tunnistetiedoista/asennussivun URL-osoitteesta.

Älä asenna GitHub Appia kaikkiin repositorioihin äläkä lähetä yksityistä avainta viesteissä.

## 4. Aseta Workerin salaisuudet

Cloudflare Dashboard → **Workers & Pages → lentisdata-api → Settings → Variables and Secrets**:

| Workerin Secret | Arvo |
|---|---|
| `GITHUB_APP_ID` | GitHub Appin App ID |
| `GITHUB_INSTALLATION_ID` | GitHub Appin asennuksen Installation ID |
| `GITHUB_APP_PRIVATE_KEY` | Koko PEM-muotoinen yksityinen avain sisältäen BEGIN/END-rivit |
| `ADMIN_TOKEN` | Itse luotu pitkä satunnainen hallinta-avain, jonka säilytät turvallisesti |

Arvot `CORS_ORIGIN=https://jdowcon.github.io`, `GITHUB_OWNER=jdowcon` ja `GITHUB_REPO=lentisdata` tulevat `api/wrangler.toml`-tiedostosta. `HUB`-sidonta luodaan Wrangler-julkaisussa.

Tarkista `https://<oma-worker-osoite>/health`. Odotettu JSON sisältää `"ok":true`, `"version":"0.1"` ja `"ready":true`. Arvo `ready:true` kertoo, että tarvittavat asetukset ovat olemassa — se **ei vielä todista** onnistunutta GitHub-kirjoitusta.

## 5. Aktivoi laite ja testaa GitHub-tallennus

1. Luo tilastoijan kertakäyttöinen kutsukoodi Workerin suojatun `POST /admin/invites` -rajapinnan kautta käyttämällä hallinta-avainta `X-Admin-Token`-otsakkeessa. Älä jaa hallinta-avainta.
2. Avaa https://jdowcon.github.io/lentisdata/ → Asetukset. Syötä Workerin oma HTTPS-osoite ja aktivoi laite kutsukoodilla.
3. Luo testiottelu, kirjaa yksi tai useampi S1–S4/V1–V4-tapahtuma ja päätä erä käsin pistein 25–20.
4. Varmista `data`-haarassa `matches/<match-id>/metadata.json` ja `set-1.json`.
5. Päätä loput erät (3. erä 15 pisteeseen kahden erolla); vahvista ottelu ja varmista `summary.json`.
6. Testaa offline-tilassa erän päättäminen, paikallisen datan säilyminen ja lähetys yhteyden palauduttua. Älä merkitse synkronointia valmiiksi ennen kuin GitHub-tiedostot löytyvät.

**Tietosuoja:** julkinen `data`-haara ei saa sisältää tilastoijan nimeä, laiteavaimia eikä henkilötietoja. Erät ja ottelut tallentuvat GitHubiin vasta Workerin vahvistuksen jälkeen.

## 6. Testit ja käyttöönoton seuranta

Paikallisesti: `node --test tests/*.test.mjs` ja `node --check api/worker.mjs`. Lisäksi testaa mobiili 320/360/390 px, kahdeksan näkyvää painiketta, varmuuskopion palautus sekä 2 ja 3 erän ottelut.

- [#1 – Pages-julkaisun tarkistus](https://github.com/jdowcon/lentisdata/issues/1)
- [#2 – Cloudflare + GitHub App -käyttöönotto](https://github.com/jdowcon/lentisdata/issues/2)
- [#3 – Mobiili- ja offline-testaus](https://github.com/jdowcon/lentisdata/issues/3)

**Rajoitus:** kunnes Cloudflare ja GitHub App on yhdistetty, LentisData toimii paikallisesti. Työkaluyhteys ei voi tallentaa Cloudflare-tilisi salaisuuksia puolestasi.
