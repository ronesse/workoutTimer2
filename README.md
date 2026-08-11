# WorkoutTimer2 – Supabase v2

Inneholder e-postinnlogging og synkronisering av aktivitetsdata til Supabase. Lokal lagring beholdes som cache/offline-backup.

Last opp alle filene direkte i roten av GitHub-repository `WorkoutTimer2`.

Viktig: Tabellen `public.activities` og RLS-policyene må være opprettet i Supabase.


## v2.1 FIXED
- Rettet JavaScript-feil i db.js som gjorde at konto-knappen ikke reagerte.
- db.js er nå inkludert i PWA-cache.


## v3 – Styrkeprogram
Tidligere EMOM 10 er nå et oppgavebasert styrkeprogram:
- Tidtaker starter automatisk når programmet åpnes
- Viser nåværende aktivitet og neste aktivitet
- Fullført = går videre og registrerer oppgaven som fullført
- Skip = hopper over oppgaven
- Postpone = flytter oppgaven til slutten av gjeldende runde
- Hele økten får total tidsbruk og kan lagres i historikk/Supabase


## Kettlebell icon fix
Kettlebell 60/30 bruker nå `kettlebell.png` i stedet for styrkeløfter-emoji.

## v4 – Styrke Dag1
- Tidligere Styrkeprogram heter nå Styrke Dag1.
- 43 aktiviteter.
- Oppvarming: 2 runder med 6 øvelser.
- Hoveddel: 3 komplette runder + Knebøy som aktivitet 43 / runde 4.
- Postpone flytter aktiviteten til sist i samme gruppe og samme runde.

## v5.1 FIXED
- Rettet JavaScript-feil som gjorde at alle programknappene forsvant.
- Styrke Dag1 og Styrke Dag2 er begge beholdt.
