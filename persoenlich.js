// Kasten „Persönliche Seiten“: erscheint nur nach einer Anmeldung mit E-Mail und Passwort (Supabase Auth).
// Das Passwort prüft Supabase auf dem Server; die Links stehen nicht hier, sondern in der Tabelle fm_seiten
// (Row Level Security, nur für freigegebene Konten lesbar) und werden erst nach der Anmeldung geladen.
// Ohne Anmeldung baut die Seite keine Verbindung zu Supabase auf. Einrichtung: supabase.sql und README.
(function () {
  var SB = 'https://yzzipjtounvktdhhvrnt.supabase.co';
  var SCHLUESSEL = 'sb_publishable_OCNFFT4wa4CMaHyhcLAY4A_u2flZF1s'; // öffentlicher Schlüssel, darf im Code stehen (kein Geheimnis)
  var SPEICHER = 'fmcode-anmeldung';

  var kasten = document.getElementById('privat');
  var formular = document.getElementById('anmeldung');
  var liste = document.getElementById('privat-liste');
  var status = document.getElementById('privat-status');
  var fehlerFeld = document.getElementById('anmelde-fehler');
  var abmeldenKnopf = document.getElementById('abmelden');
  var oeffnenKnopf = document.getElementById('anmelden-oeffnen');
  var sendenKnopf = formular.querySelector('button[type="submit"]');
  var zeigenKnopf = document.getElementById('passwort-zeigen');

  // ---------- Sitzung im Browser (nur auf diesem Gerät, bis zum Abmelden)
  function sitzung() {
    try { return JSON.parse(localStorage.getItem(SPEICHER)) || null; } catch (e) { return null; }
  }
  function merke(antwort) {
    var s = { zugang: antwort.access_token, erneuern: antwort.refresh_token,
              ablauf: antwort.expires_at || Math.floor(Date.now() / 1000) + (antwort.expires_in || 3600) };
    try { localStorage.setItem(SPEICHER, JSON.stringify(s)); } catch (e) { /* privates Fenster: gilt nur bis zum Neuladen */ }
    return s;
  }
  function vergiss() { try { localStorage.removeItem(SPEICHER); } catch (e) { /* nichts gespeichert */ } }

  // ---------- Anfragen an Supabase
  function NetzFehler() { this.art = 'netz'; }
  async function anfrage(pfad, optionen, zugang) {
    var kopf = { apikey: SCHLUESSEL, 'Content-Type': 'application/json' };
    if (zugang) kopf.Authorization = 'Bearer ' + zugang;
    var antwort;
    try {
      antwort = await fetch(SB + pfad, { method: optionen.method || 'GET', headers: kopf, body: optionen.body });
    } catch (e) {
      throw new NetzFehler();
    }
    var daten = null;
    try { daten = await antwort.json(); } catch (e) { /* leere Antwort */ }
    return { status: antwort.status, daten: daten };
  }
  function anmelden(email, passwort) {
    return anfrage('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email, password: passwort }) });
  }
  async function erneuere(s) {
    var r = await anfrage('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.erneuern }) });
    if (r.status !== 200 || !r.daten || !r.daten.access_token) return null;
    return merke(r.daten);
  }
  async function gueltig(s) {
    if (s.ablauf - 60 > Date.now() / 1000) return s;
    return erneuere(s);
  }
  async function ladeSeiten(s) {
    var pfad = '/rest/v1/fm_seiten?select=titel,beschreibung,adresse&order=reihenfolge.asc,titel.asc';
    var r = await anfrage(pfad, {}, s.zugang);
    if (r.status === 401) { // Zugang abgelaufen: einmal erneuern und nochmal
      s = await erneuere(s);
      if (!s) return { abgelaufen: true };
      r = await anfrage(pfad, {}, s.zugang);
    }
    return r;
  }

  // ---------- Verständliche Fehlermeldungen
  function anmeldeFehler(r) {
    var d = r.daten || {};
    var code = d.error_code || d.error || '';
    var text = (d.msg || d.error_description || d.message || '').toLowerCase();
    if (r.status === 429 || /rate_limit/.test(code)) return 'Zu viele Versuche. Bitte eine Minute warten und es dann noch einmal probieren.';
    if (code === 'email_not_confirmed' || /not confirmed/.test(text)) return 'Dieses Konto ist noch nicht bestätigt. In Supabase beim Nutzer „Auto Confirm User“ wählen.';
    if (r.status === 400 || code === 'invalid_credentials' || code === 'invalid_grant') return 'E-Mail-Adresse oder Passwort stimmt nicht.';
    return 'Die Anmeldung hat gerade nicht geklappt (Fehler ' + r.status + '). Bitte später noch einmal versuchen.';
  }
  function listenFehler(r) {
    var d = r.daten || {};
    if (r.status === 404 || d.code === 'PGRST205' || d.code === '42P01') return 'Angemeldet, aber die Tabelle fm_seiten fehlt noch – bitte das SQL in Supabase ausführen.';
    return 'Angemeldet, aber die Liste konnte nicht geladen werden (Fehler ' + r.status + ').';
  }

  // ---------- Anzeige
  function meldung(text, istFehler) {
    status.textContent = text || '';
    status.classList.toggle('fehler', !!istFehler);
  }
  function zeigeFormular(hinweis) {
    kasten.hidden = false;
    formular.hidden = false;
    liste.hidden = true;
    abmeldenKnopf.hidden = true;
    oeffnenKnopf.hidden = true;
    fehlerFeld.textContent = hinweis || '';
    meldung('');
  }
  function schliesse() {
    kasten.hidden = true;
    oeffnenKnopf.hidden = false;
    formular.reset();
    fehlerFeld.textContent = '';
  }
  function zeigeSeiten(seiten) {
    kasten.hidden = false;
    formular.hidden = true;
    abmeldenKnopf.hidden = false;
    oeffnenKnopf.hidden = true;
    liste.textContent = '';
    for (var i = 0; i < seiten.length; i++) {
      var s = seiten[i];
      if (!/^https:\/\//.test(s.adresse || '')) continue; // nur sichere Adressen
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = s.adresse;
      var titel = document.createElement('span');
      titel.className = 'titel';
      titel.textContent = s.titel;
      a.append(titel);
      if (s.beschreibung) {
        var b = document.createElement('span');
        b.className = 'beschr';
        b.textContent = s.beschreibung;
        a.append(b);
      }
      var adresse = document.createElement('span');
      adresse.className = 'adresse';
      adresse.textContent = s.adresse.replace(/^https:\/\//, '').replace(/\/$/, '');
      a.append(adresse);
      li.append(a);
      liste.append(li);
    }
    liste.hidden = !liste.children.length;
    meldung(liste.children.length ? '' : 'Für dieses Konto sind keine Seiten freigegeben.');
  }

  async function zeigeAngemeldet(s) {
    kasten.hidden = false;
    formular.hidden = true;
    oeffnenKnopf.hidden = true;
    fehlerFeld.textContent = '';
    meldung('Wird geladen …');
    var r;
    try {
      s = await gueltig(s);
      if (!s) { vergiss(); return zeigeFormular('Die Anmeldung ist abgelaufen. Bitte neu anmelden.'); }
      r = await ladeSeiten(s);
    } catch (e) {
      abmeldenKnopf.hidden = false;
      return meldung('Keine Verbindung zu Supabase. Bitte die Internetverbindung prüfen und die Seite neu laden.', true);
    }
    if (r.abgelaufen) { vergiss(); return zeigeFormular('Die Anmeldung ist abgelaufen. Bitte neu anmelden.'); }
    abmeldenKnopf.hidden = false;
    if (r.status !== 200 || !Array.isArray(r.daten)) { liste.hidden = true; return meldung(listenFehler(r), true); }
    zeigeSeiten(r.daten);
  }

  // ---------- Bedienung
  oeffnenKnopf.addEventListener('click', function () {
    zeigeFormular();
    kasten.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    formular.elements.email.focus({ preventScroll: true });
  });
  document.getElementById('abbrechen').addEventListener('click', function () { schliesse(); oeffnenKnopf.focus(); });
  formular.addEventListener('keydown', function (e) { if (e.key === 'Escape') { schliesse(); oeffnenKnopf.focus(); } });
  zeigenKnopf.addEventListener('click', function () {
    var feld = formular.elements.passwort;
    var zeigen = feld.type === 'password';
    feld.type = zeigen ? 'text' : 'password';
    zeigenKnopf.textContent = zeigen ? 'Verbergen' : 'Zeigen';
    zeigenKnopf.setAttribute('aria-pressed', zeigen);
  });

  formular.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = formular.elements.email.value.trim();
    var passwort = formular.elements.passwort.value;
    if (!email || !passwort) { fehlerFeld.textContent = 'Bitte E-Mail-Adresse und Passwort eingeben.'; return; }
    fehlerFeld.textContent = '';
    sendenKnopf.disabled = true;
    sendenKnopf.textContent = 'Anmelden …';
    var r;
    try {
      r = await anmelden(email, passwort);
    } catch (err) {
      r = null;
    }
    sendenKnopf.disabled = false;
    sendenKnopf.textContent = 'Anmelden';
    if (!r) { fehlerFeld.textContent = 'Keine Verbindung zum Anmeldedienst. Bitte die Internetverbindung prüfen.'; return; }
    if (r.status !== 200 || !r.daten || !r.daten.access_token) {
      fehlerFeld.textContent = anmeldeFehler(r);
      formular.elements.passwort.select();
      return;
    }
    formular.reset();
    if (zeigenKnopf.getAttribute('aria-pressed') === 'true') zeigenKnopf.click();
    await zeigeAngemeldet(merke(r.daten));
    var erster = liste.querySelector('a');
    (erster || abmeldenKnopf).focus();
  });

  abmeldenKnopf.addEventListener('click', async function () {
    var s = sitzung();
    vergiss();
    liste.textContent = '';
    schliesse();
    oeffnenKnopf.focus();
    // Sitzung auch bei Supabase beenden (klappt das nicht, ist sie hier trotzdem gelöscht)
    if (s) { try { await anfrage('/auth/v1/logout?scope=local', { method: 'POST' }, s.zugang); } catch (err) { /* offline */ } }
    var hinweis = document.getElementById('abgemeldet');
    hinweis.hidden = false;
    setTimeout(function () { hinweis.hidden = true; }, 4000);
  });

  // Schon angemeldet (auf diesem Gerät)? Dann gleich die Liste zeigen – sonst bleibt alles versteckt und offline.
  var gemerkt = sitzung();
  if (gemerkt) zeigeAngemeldet(gemerkt);
})();
