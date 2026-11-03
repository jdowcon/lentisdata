# LentisData – suunnitelma 0.1

## Tavoite
Syöttöjen ja syötön vastaanottojen tilastointi helposti yhdellä painalluksella. Ei pallorallien voittajien tai pisteiden automaattista seurantaa. Julkaisu GitHub Pagesissa, julkinen lähdekoodi ja julkiset vahvistetut erätiedot `jdowcon/lentisdata`-repositorion `data`-haarassa.

## Ottelun aloitus
Ennen tilastointia: tilastoija, päivämäärä, turnaus, oma joukkue, kotijoukkue, vierasjoukkue, täsmälleen 2 tai 3 pelattavaa erää. Oma joukkue on koti- tai vierasjoukkue. Tilastoijan nimeä ei julkaista GitHubiin.

## Eräsäännöt
1.–2. erä pelataan 25 pisteeseen, ja mahdollinen 3. erä 15 pisteeseen. Kahden pisteen ero. Erä päättyy ensimmäisen sääntöjen mukaisen tilanteen syntyessä (25–23, 26–24, 15–13, 16–14 jne.). Kahden erän ottelu saa päättyä 1–1. Kolmieräinen ottelu pelataan loppuun myös 2–0-tilanteessa.

## Tilastot
Oma syöttö: S1 Syöttövirhe, S2 vastustajan vastaanotto passarin ruutuun, S3 vastustajan vastaanotto pelattavaksi, S4 Ässä.
Vastustajan syöttö: V1 vastustajan syöttövirhe, V2 oma vastaanotto passarin ruutuun, V3 oma vastaanotto pelattavaksi, V4 Vastaanottovirhe.
Kaikki kahdeksan painiketta näkyvät koko ajan. Ei automaattista syöttövuoroa eikä pistelaskua. Tapahtumat voi perua ja korjata.

## Passarin ruutu
3 m verkon suuntaisesti, 2 m kentän syvyyssuunnassa, noin 0,5 m irti verkosta. Passarin tulee päästä normaalille passille helposti noin kolmella pienellä askeleella. Pallon sijainnin lisäksi arvioidaan pelattavuutta.

## Erän ja ottelun päättäminen
Tilastoija syöttää erän lopputuloksen käsin vasta erän päättyessä. Erätulos vahvistetaan paikallisesti ja lisätään GitHub-synkronointijonoon. Kun kaikki erät ovat valmiit, tilastoija vahvistaa ottelun; ottelun lopputulos ja yhteenveto lasketaan vahvistetuista eristä ja lähetetään GitHubiin. Ottelu voi päättyä myös offline-tilassa. `GitHubissa`-tila näytetään vasta GitHubin vahvistuksen jälkeen.

## Arkkitehtuuri 0.1
HTML/CSS + modulaarinen JavaScript (ilman rakennusriippuvuuksia), PWA service worker, IndexedDB. Suojattu Cloudflare Worker + SQLite Durable Object, kertakäyttöiset kutsukoodit ja laitekohtainen avainparitunnistus. GitHub App kirjoittaa vain palvelimelta `data`-haaraan. Käyttöliittymässä ei ole GitHub-tokeneita.

## Julkisuus ja tietoturva
GitHubin `data`-haaran ottelutiedot ovat julkisia. Tilastoijan nimeä tai laiteavaimia ei julkaista. GitHub App -salaisuudet, kutsukoodit ja admin-tunnus pysyvät Workerissa. Kullekin ottelulle yksi kirjoittava laite; konfliktit eivät saa korvata hiljaisesti tietoja.

## Varmuuskopiot ja raportit
JSON-varmuuskopio/tuonti sekä CSV-vienti. Erä-, ottelu- ja turnauspäivän yhteenvedot, syöttö- ja vastaanottoprosentit oikeilla nimittäjillä. Syöttövirheiden ja ässien suorien pisteiden vaikutus näkyy tilastoluokissa, mutta ei automaattisena eräpistemääränä.

## 0.1:n rajaukset
Ei pelaajakohtaisia tilastoja, ei synkronoitavia keskeneräisiä eriä, ei usean laitteen samanaikaista saman ottelun kirjausta, ei pilvi-infrastruktuurin automaattista käyttöönottoa ilman omistajan tunnuksia/secrets. Ensimmäisen 0.1-version käyttöliittymä on toteutettu ilman React/TypeScript-riippuvuuksia, jotta se käynnistyy GitHub Pagesissa suoraan ja toimii offline-tilassa ilman rakennusvaihetta. React/TypeScript-arkkitehtuurin siirto voidaan tehdä myöhemmässä versiossa.

## Hyväksymiskriteerit
1. Kaikki kahdeksan tapahtumaa kirjattavissa, muokattavissa ja peruttavissa.
2. Valmiiden erien lopputulokset tallennetaan vain käsin syötettynä.
3. 2 tai 3 erää ja eräsääntöjen validointi.
4. Paikallinen tallennus ja käyttö offline-tilassa.
5. Valmiin erän ja ottelun synkronointijonot ja tilat.
6. GitHub API:n käyttö vain suojatulta palvelimelta.
7. JSON-varmuuskopiot ja CSV.
8. Puhelimen 320–390 px näkymät ilman vaakavieritystä.
9. GitHub Actions -testit ja Pages-julkaisu.
