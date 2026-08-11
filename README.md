# WorkoutTimer2 – Supabase v2

Inneholder e-postinnlogging og synkronisering av aktivitetsdata til Supabase. Lokal lagring beholdes som cache/offline-backup.

Last opp alle filene direkte i roten av GitHub-repository `WorkoutTimer2`.

Viktig: Tabellen `public.activities` og RLS-policyene må være opprettet i Supabase.


## v2.1 FIXED
- Rettet JavaScript-feil i db.js som gjorde at konto-knappen ikke reagerte.
- db.js er nå inkludert i PWA-cache.
