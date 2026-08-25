# Tortenboden Rechner

Kleine installierbare Web-App zum Berechnen von Tortenboden-Massen.

## Auf GitHub Pages veroeffentlichen

1. Bei GitHub ein neues Repository anlegen, zum Beispiel `tortenboden-rechner`.
2. Diese Dateien in das Repository hochladen:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.webmanifest`
   - `icon.svg`
   - `sw.js`
   - `.nojekyll`
3. In GitHub im Repository auf `Settings` gehen.
4. Links `Pages` auswaehlen.
5. Bei `Build and deployment` die Quelle `Deploy from a branch` waehlen.
6. Branch `main` und Ordner `/root` auswaehlen.
7. Speichern und kurz warten.

Danach zeigt GitHub die Webadresse an. Diese Adresse in Chrome auf dem Android-Handy oeffnen und ueber das Drei-Punkte-Menue als App installieren.

## Online-Sync fuer die Lagerverwaltung

Die App kann den Lagerbestand mit Supabase synchronisieren, damit PC und Handy denselben Bestand sehen.

1. Bei Supabase ein Projekt anlegen.
2. In Supabase den SQL Editor oeffnen.
3. Den Inhalt aus `supabase-inventory.sql` ausfuehren.
4. In `app.js` oben bei `CLOUD_SYNC` eintragen:
   - `supabaseUrl`
   - `supabaseAnonKey`

Solange diese zwei Werte leer sind, arbeitet die Lagerverwaltung weiter lokal auf dem jeweiligen Geraet.
