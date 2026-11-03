// Kleiner Presence-Client für Supabase Realtime, ohne Bibliothek (Protokoll vsn 1.0.0, JSON).
// Dieselbe Fassung steckt in Petri Heil (game.html, Abschnitt „Spieler online“).
// praesenz({ url, key, kanal, schluessel, aenderung })
//   .melde(daten)  im Kanal anmelden bzw. Daten ändern (null meldet ab)
//   aenderung(stand) bekommt bei jeder Änderung { schluessel: [metas…] }
function praesenz(o) {
  var ws = null, ref = 0, joinRef = null, herz = 0, versuche = 0, verbunden = false;
  var stand = {}, gemeldet = null;
  var thema = 'realtime:' + o.kanal;
  function sende(event, payload, eigenesThema) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ topic: eigenesThema || thema, event: event, payload: payload, ref: String(++ref), join_ref: joinRef }));
  }
  function schick() {
    if (!verbunden) return;
    if (gemeldet) sende('presence', { type: 'presence', event: 'track', payload: gemeldet });
    else sende('presence', { type: 'presence', event: 'untrack' });
  }
  function melde() { if (o.aenderung) o.aenderung(stand); }
  function verbinde() {
    stand = {}; verbunden = false;
    try {
      ws = new WebSocket(o.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(o.key) + '&vsn=1.0.0');
    } catch (e) { return spaeter(); }
    ws.onopen = function () {
      joinRef = String(++ref);
      ws.send(JSON.stringify({ topic: thema, event: 'phx_join', ref: joinRef, join_ref: joinRef, payload: {
        config: { broadcast: { ack: false, self: false }, presence: { key: o.schluessel || '', enabled: true }, postgres_changes: [], private: false },
      } }));
      clearInterval(herz);
      herz = setInterval(function () { sende('heartbeat', {}, 'phoenix'); }, 25000);
    };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.topic !== thema) return;
      if (m.event === 'phx_reply' && m.ref === joinRef) {
        if (m.payload && m.payload.status === 'ok') { verbunden = true; versuche = 0; schick(); }
      } else if (m.event === 'presence_state') {
        stand = {};
        for (var k in m.payload) stand[k] = (m.payload[k].metas || []).slice();
        melde();
      } else if (m.event === 'presence_diff') {
        var j = m.payload.joins || {}, l = m.payload.leaves || {}, k2;
        // wie in realtime-js: erst Neuzugänge, dann Abgänge (per phx_ref)
        for (k2 in j) {
          var neu = j[k2].metas || [], refs = neu.map(function (x) { return x.phx_ref; });
          stand[k2] = (stand[k2] || []).filter(function (x) { return refs.indexOf(x.phx_ref) < 0; }).concat(neu);
        }
        for (k2 in l) {
          if (!stand[k2]) continue;
          var weg = (l[k2].metas || []).map(function (x) { return x.phx_ref; });
          stand[k2] = stand[k2].filter(function (x) { return weg.indexOf(x.phx_ref) < 0; });
          if (!stand[k2].length) delete stand[k2];
        }
        melde();
      }
    };
    ws.onclose = function () { clearInterval(herz); ws = null; verbunden = false; stand = {}; melde(); spaeter(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  function spaeter() {
    // nicht sofort und nicht immer schneller: 1, 2, 5, 10, dann alle 30 s
    var warte = [1000, 2000, 5000, 10000][versuche++] || 30000;
    setTimeout(verbinde, warte);
  }
  verbinde();
  return {
    melde: function (daten) { gemeldet = daten || null; schick(); },
    verbunden: function () { return verbunden; },
  };
}
