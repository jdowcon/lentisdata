# LentisData 0.1 – käyttöönotto

Lähdekoodi ja `data`-haara on luotu GitHubiin. GitHub Pages -julkaisua ja Cloudflare–GitHub-synkronointia ei ole vielä todennettu tuotannossa.

## 1. Aktivoi GitHub Pages

1. Avaa [Settings → Pages](https://github.com/jdowcon/lentisdata/settings/pages).
2. Valitse **Build and deployment → Source: GitHub Actions**.
3. Avaa [Pages-julkaisutyönkulku](https://github.com/jdowcon/lentisdata/actions/workflows/deploy-pages.yml) ja käynnistä **Run workflow**, ellei se käynnisty automaattisesti.
4. Tarkista työn onnistuminen ja avaa https://jdowcon.github.io/lentisdata/.
5. Luo selaimessa testiottelu, kirjaa tapahtumia ja varmista paikallisten tietojen säilyminen uudelleenlatauksessa.

Pelkkä koodin lataaminen GitHubiin ei aktivoi Pagesia. Sovellus toimii ilman Cloudflarea paikallisena offline-sovelluksena ensimmäisen latauksen jälkeen.

## 2. Ota suojattu synkronointi käyttöön

1. Luo GitHub App GitHubin **Developer settings → GitHub Apps** -kohdassa. Rajaa asennus repositorioon `jdowcon/lentisdata` ja anna **Contents: Read and write** -oikeus.
2. Ota Cloudflare Workers ja Durable Objects käyttöön omalla Cloudflare-tilillä.
3. Lisää GitHub-repositorion Actions-salaisuuksiin `CLOUDFLARE_API_TOKEN` ja `CLOUDFLARE_ACCOUNT_ID` (rajatut oikeudet).
4. Käynnistä [API-julkaisutyönkulku](https://github.com/jdowcon/lentisdata/actions/workflows/deploy-api.yml). Työnkulku käyttää `api/wrangler.toml`-tiedostoa.
5. Lisää **Workeriin salaisuuksina** `ADMIN_TOKEN`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID` ja `GITHUB_APP_PRIVATE_KEY`.
6. Varmista Workerin `/health`-vastaus; luo kutsukoodi suojatulla `POST /admin/invites` -reitillä.
7. Anna Workerin HTTPS-osoite LentisDatan asetuksissa ja aktivoi testilaite kutsukoodilla.

**Älä tallenna salaisuuksia repositorioon, avoimiin issueihin tai chat-viesteihin.** Käytä Workerin Variables and Secrets -asetuksia. GitHub Appin kirjoitusavain ei saa päätyä selaimeen.

## 3. Tarkista eräkohtainen tallennus

1. Luo kaksi tai kolme erää sisältävä testiottelu.
2. Kirjaa S1–S4 ja V1–V4 -tapahtumia; kirjaa eräpisteet käsin.
3. Päätä ensimmäinen erä ja varmista `data`-haarassa `matches/<id>/metadata.json` ja `set-1.json`.
4. Katkaise internet, kirjaa toinen erä ja vahvista tulos. Sulje ja avaa sovellus.
5. Palauta yhteys ja varmista automaattinen synkronointi sekä `set-2.json`.
6. Päätä ottelu ja tarkista `summary.json` sekä eräversiot.
7. Kokeile JSON-varmuuskopion vienti ja palautus.
8. Testaa käyttö 320 × 568, 360 × 640 ja 390 × 844 -pikselin laitteilla; kaikkien kahdeksan painikkeen pitää olla näkyvissä ilman vaakavieritystä.

Jos GitHub-synkronointia ei ole aktivoitu, tallennus tapahtuu vain kyseisen selaimen paikalliseen IndexedDB-tietokantaan. Tee myös JSON-varmuuskopio.

## Projektin tehtävät

- [#1 – GitHub Pages](https://github.com/jdowcon/lentisdata/issues/1)
- [#2 – Cloudflare ja GitHub App](https://github.com/jdowcon/lentisdata/issues/2)
- [#3 – Mobiili- ja offline-testaus](https://github.com/jdowcon/lentisdata/issues/3)

## Paikalliset testit

```bash
node --test tests/*.test.mjs
node --check sw.js
node --check api/worker.mjs
```
