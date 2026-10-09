# fmcode.de

Startseite für die Domain `fmcode.de`: führt zu den beiden Browserspielen

- **Feuer Frei** (3D-Shooter) unter https://feuerfrei.fmcode.de/
- **Petri Heil** (Pixel-Angelspiel) unter https://petri.fmcode.de/

Reines HTML ohne Build, veröffentlicht über GitHub Pages aus `main`. Zum Ausprobieren auf dem eigenen PC: `node serve.mjs`, dann http://localhost:4195.

Schriften liegen in `fonts/` und werden mit der Seite ausgeliefert (keine Anfragen an Google): Rajdhani und Silkscreen, beide unter der SIL Open Font License (Lizenztexte daneben).

## Persönliche Seiten (nur nach Anmeldung)

Unten im Fuß gibt es den Knopf „Anmelden“. Nach der Anmeldung mit E-Mail und Passwort erscheint der Kasten „Persönliche Seiten“
mit Links (`persoenlich.js`).

- Anmeldung über **Supabase Auth** (Projekt `yzzipjtounvktdhhvrnt`, dasselbe wie Mitbringliste/Petri Heil/Feuer Frei). Das Passwort prüft
  Supabase auf dem Server; im Code steht nur der öffentliche Schlüssel (`sb_publishable_…`, ausdrücklich für den Browser gedacht).
- Die Links stehen **nicht** im Repo, sondern in der Tabelle `fm_seiten`. Row Level Security: ohne Anmeldung nichts, angemeldet nur
  Konten aus `fm_freigabe`. Aufbau der Tabellen: `supabase.sql`.
- Für normale Besucher baut die Seite keine Verbindung zu Supabase auf; erst beim Anmelden.
- Die Sitzung bleibt im Browser (`localStorage`, Schlüssel `fmcode-anmeldung`), bis man auf „Abmelden“ drückt.
- Links ändern: Supabase → Table Editor → `fm_seiten`. Passwort ändern: Supabase → Authentication → Users.
- Der Kasten versteckt nur die Links – die verlinkten Seiten selbst bleiben über ihre Adresse erreichbar.
