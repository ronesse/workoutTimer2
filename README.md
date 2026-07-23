# WorkoutTimer2

Komplett ny og ryddig versjon av treningsappen.

## Funksjoner

- Ferdige timerprogrammer
- Egendefinerte timerøkter
- Start / pause / hopp over / nullstill
- Pip, norsk stemme, vibrasjon og Wake Lock
- Spotify-knapp
- Automatisk spørsmål om lagring når en timerøkt er ferdig
- Rating, belastning og kommentar
- Manuell registrering av aktivitet
- Dato, klokkeslett, kategori, varighet og valgfri distanse
- Redigering og sletting av aktiviteter
- Historikk med filtrering
- Kalender
- Statistikk og streak
- Eksport/import av sikkerhetskopi
- PWA/installasjon
- Offline-cache

## Lagring

Aktiviteter lagres i nettleserens `localStorage`. De skal derfor overleve refresh og lukking av appen på samme nettleser/enhet.

Historikken kan likevel forsvinne dersom nettstedsdata slettes. Bruk Eksporter-funksjonen som sikkerhetskopi.

## GitHub Pages

Last opp alle filene direkte i roten av repository `WorkoutTimer2`.

Filene skal ligge slik:

- index.html
- style.css
- app.js
- sw.js
- manifest.webmanifest
- icon.svg
- .nojekyll
- README.md

I GitHub:
Settings → Pages → Deploy from a branch → main → /(root)

Siden blir normalt:
https://ronesse.github.io/WorkoutTimer2/
