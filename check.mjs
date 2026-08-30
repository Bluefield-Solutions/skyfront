// CI-Check: baut Master + alle Varianten, startet jede headless und schreibt
// einen kurzen Markdown-Bericht (dist/check-report.md, auch auf stdout).
// Exit 0 = alles gut, sonst != 0. Ideal für Git-Hook / Pipeline / PR-Kommentar.
//   node check.mjs
// (Boot-Test braucht Playwright: `npm i playwright`. Ohne bleibt es bei der
//  Struktur-Prüfung — dann kann der Check keine Laufzeitfehler finden.)
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { ladeChromium, startbar } from './tools/boot.mjs';

// Rueckgabe: 0 = gemessen und ohne Befund · 2 = NICHT (vollstaendig)
// gemessen · alles andere wirft.
//
// Der Unterschied zwischen 0 und 2 hat gefehlt, und das war eine Luecke.
// Sechs der acht Tafeln steigen still mit 0 aus, wenn Playwright fehlt —
// im Pruefbericht stand danach "✅ ohne Befund", obwohl nichts gemessen
// wurde. Ein Tor, das nichts geprueft hat, darf nicht aussehen wie eines,
// das bestanden hat.
function step(label, cmd) {
  console.log(`\n▶ ${label}`);
  try { execSync(cmd, { stdio: 'inherit' }); return 0; }
  catch (e) { if (e.status === 2) return 2; throw e; }
}

// Wer ein "nicht gemessen" hinnimmt, und wer nicht.
//
// Beim Arbeiten ist eine ausgefallene Messung ein Aergernis, kein Grund
// anzuhalten — ein Tor, das staendig rot ist, weil der Laeufer klemmt, wird
// ignoriert, und dann ist es gar kein Tor mehr.
//
// Vor der Auslieferung ist es das Gegenteil. Dort ist "nicht gemessen"
// genau so wenig wert wie "nicht bestanden": beides heisst, dass niemand
// nachgesehen hat. `--streng` (in der CI gesetzt) macht daraus einen roten
// Lauf. Ohne den Schalter bleibt es bei der Zeile "⚠ nicht gemessen" im
// Bericht — sichtbar, aber nicht anhaltend.
const STRENG = process.argv.includes('--streng') || process.env.SKF_STRENG === '1';

// Die Stufung.
//
// Gemessen: die Kette kostet seriell 302 s, davon 174 s allein das Bildtor.
// Wer bei jeder Aenderung fuenf Minuten wartet, prueft am Ende seltener —
// und das ist teurer als ein Tor, das erst in der CI laeuft.
//
//   npm run check              alles ausser dem Bildtor  (Stufe 2, vor dem Push)
//   node check.mjs --streng    alles                     (Stufe 3, CI)
//   node check.mjs --nur=farbtor,formen     nur diese
//   node check.mjs --ohne=bildtor,speicher  alles ausser diesen
//
// Das Bildtor faellt beim Arbeiten NICHT weg — es wandert dorthin, wo
// niemand darauf wartet. Vier von vier belegbaren roten Laeufen auf GitHub
// waren das Bildtor, und keiner davon ein Mangel am Spiel. Genau dafuer ist
// ein unbeaufsichtigter Lauf da.
const wert = (name) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3).split(',').map((x) => x.trim()).filter(Boolean) : null;
};
const NUR = wert('nur'), OHNE = wert('ohne');
const uebersprungenWarum = NUR ? `nicht in --nur=${NUR.join(',')}` : `--ohne=${(OHNE || []).join(',')}`;
const laeuft = (k) => (NUR ? NUR.includes(k) : !(OHNE || []).includes(k));

// Fuer die Gegenprobe: --ohne-naht wird an die Tore durchgereicht. Damit
// laesst sich der strenge Zweig herbeifuehren, statt ihn zu behaupten.
const DURCHREICHEN = process.argv.includes('--ohne-naht') ? ' --ohne-naht' : '';
const ungemessen = [];
function buchen(name, code) {
  if (code === 2) ungemessen.push(name);
  return code;
}

let ok = true;
try {
  if (existsSync('dist/boot-report.txt')) rmSync('dist/boot-report.txt');  // Stale-Schutz
  step('Build (Master)', 'node build.mjs');
  step('Version (Quelle, Bericht, Bau)', 'node tools/version.mjs');
  // Kostet unter einer Sekunde und faengt etwas, das sonst niemand sieht:
  // eine SKY-Nummer, die zwei verschiedene Dinge bezeichnet. Neun taten das,
  // bevor es jemand nachgezaehlt hat.
  step('Nummern (keine Doppelbelegung)', 'node tools/nummern.mjs');
  step('Build + Boot-Test aller Varianten', 'node build-variants.mjs --boot');
} catch { ok = false; }

// Die acht Tore als TABELLE, nicht als acht Verzweigungen.
//
// Bis v18 stand hier acht Mal derselbe Block mit ausgetauschten Namen. Das
// war nicht nur lang: jede Aenderung an der Logik musste acht Mal gemacht
// werden, und beim ersten Versuch war sie sechs Mal gemacht. Eine Regel, die
// acht Kopien hat, gilt bald in sieben.
//
// `schluessel` ist zugleich der Name fuer --ohne= und --nur=.
const TORE = [
  // Prueft nicht, ob etwas laeuft, sondern ob es aussieht wie vorgesehen.
  // Dafuer gab es lange kein Tor — der Nebel war seit jeher kaputt und alle
  // Tore meldeten gruen. Kostet 174 s, also 58 % der ganzen Kette.
  { schluessel: 'bildtor',     lauf: 'Bildtor (Modifikator-Modi)',           zeile: 'Bildtor (5 Modi)',           datei: 'tools/bildtor.mjs' },
  // Die drei Farbbaender duerfen sich nicht ueberschneiden — Gefahr,
  // Eigenfeuer, Aufsammler. Gezaehlt werden die Bildpunkte des GEBAUTEN
  // Spiels, nicht nachgebaute Werte.
  // Steht zu jeder offenen Bestellung ein Prompt im Auftragsbogen? Kostet
  // keine Sekunde und faengt den Fall, in dem jemand die Einbauliste
  // erweitert und den Auftrag vergisst — dann verschwindet eine Bestellung
  // still, und auffallen wuerde es erst, wenn das Bild nie kommt.
  { schluessel: 'bestellung', lauf: 'Bestellung (offene Bildauftraege)',   zeile: 'Bestellung (Bildauftraege)', datei: 'tools/bestellung.mjs' },
  { schluessel: 'farbtor',     lauf: 'Farbtor (Gefahr · Eigenfeuer · Aufsammler)', zeile: 'Farbtor (Projektile und Aufsammler)', datei: 'tools/farbtor.mjs' },
  // Seit alle Gegnerprojektile dieselbe Kennfarbe tragen, ist die FORM der
  // einzige Traeger der Information "wer hat geschossen".
  { schluessel: 'formen',      lauf: 'Formentor (Silhouetten bei Anzeigegroesse)', zeile: 'Formentor (Silhouetten)', datei: 'tools/formen.mjs' },
  // Die Beruhigungsschicht muss Kontrast nehmen und nicht Helligkeit —
  // Abdunkeln wuerde der Gegnerkugel den dunklen Rand nehmen.
  { schluessel: 'untergrund',  lauf: 'Untergrund (13 Biome)',                zeile: 'Untergrund (13 Biome)',      datei: 'tools/untergrund.mjs' },
  // Rechnet die Leiter gegen den Wellenplan JEDES Sektors und sieht danach
  // im laufenden Gefecht nach, dass es die Mechanik ueberhaupt gibt.
  { schluessel: 'feuerkraft',  lauf: 'Feuerkraft (120 Sektoren + Gefecht)',  zeile: 'Feuerkraft (120 Sektoren)',  datei: 'tools/feuerkraft.mjs' },
  // Auf iOS beendet Safari eine Seite, die zu viel Grafikspeicher haelt,
  // ohne Vorwarnung. Die teuerste Zeile war eine, die niemand sah.
  { schluessel: 'speicher',    lauf: 'Speicher (Texturen im Gefecht)',       zeile: 'Speicher (Texturen)',        datei: 'tools/speicher.mjs' },
  // Hat ein Sektor eine Form, oder ist er eine Rampe?
  { schluessel: 'rhythmus',    lauf: 'Rhythmus (120 Sektoren)',              zeile: 'Rhythmus (120 Sektoren)',    datei: 'tools/rhythmus.mjs' },
  // Sind die zwoelf Bausteine im BILD zwoelf Dinge? Die Rhythmus-Tafel
  // prueft, dass ein Sektor Vielfalt HAT — nicht, dass die Bausteine
  // unterschiedlich aussehen. Zwoelf Namen fuer dasselbe Bild waeren nach
  // jeder anderen Zahl gruen.
  { schluessel: 'formationen', lauf: 'Formationen (12 Bausteine)',           zeile: 'Formationen (12 Bausteine)', datei: 'tools/formationen.mjs' },
  // Wie lange dauert ein Sektor mindestens — und waechst der Boss ueber die
  // Kampagne ueberhaupt mit? Beides war bis v31 ungemessen, und beides lag
  // beim ersten Lauf daneben: 26 Sektoren unter einer Minute, Boss Stufe 3
  // mit Faktor 1,00 ueber 110 Sektoren.
  { schluessel: 'zeitachse',   lauf: 'Zeitachse (120 Sektoren + Gefecht)',   zeile: 'Zeitachse (120 Sektoren)',   datei: 'tools/zeitachse.mjs' },
  // Feuert jede Bossphase anders, oder nur mehr vom Gleichen? Solange ein
  // Boss drei Sekunden lebte, war das gleichgueltig. Seit v32 lebt er
  // zwanzig.
  { schluessel: 'bossmuster',  lauf: 'Bossmuster (5 Stufen x 3 Phasen)',     zeile: 'Bossmuster (15 Muster)',      datei: 'tools/bossmuster.mjs' },
  // Legt Geschosse und Gegner gross nebeneinander, auf dunklem UND hellem
  // Grund. Gemessen wird nur bei den Geschossen (Eckdeckung: ein Hof, der
  // nicht ins Bild passt, steht als dunkles Rechteck um die Kugel — auf
  // dunklem Grund sieht man das nie, und der Farbtor sah es auch nicht,
  // er zaehlt Anteile und keine Kanten). Der Gegnerbogen bewertet nichts;
  // er ist der Blick, den kein Tor ersetzt.
  { schluessel: 'geschossbogen', lauf: 'Bildbogen (Geschosse und Gegner)',      zeile: 'Bildbogen (Geschosse und Gegner)', datei: 'tools/geschossbogen.mjs' },
  // Zieht die Maschine bei 30, 60 und 120 Hz gleich schnell nach? Bis v34
  // sprang sie jedes Bild auf den Finger — kein Glaetten, und die
  // Geschwindigkeit haette an der Bildrate gehangen.
  // Wird waehrend des Gefechts noch eine Gegnertextur gebacken? Bis v44
  // beim ersten Spawn jeder Art — bis zu acht Bildschlaege je Sektor,
  // jeder genau im Einflug der Welle. Das war der Ruckler, den man auf dem
  // Telefon sieht, "wenn die Gegner kommen".
  // Wieviele Geschosse haelt EIN Gegner gleichzeitig im Bild? Der Elite
  // hielt 45 — mit Abstand die dichteste Quelle, alle anderen unter zehn.
  // Stapeln sich die Treffertoene, und klingt ein Abschuss nach seiner
  // Groesse? Bis v46 lief hit() ohne Sperre auf einer festen Tonhoehe,
  // und jeder Gegner starb mit demselben grossen Klang.
  // Laeuft in jedem Modus ein Stueck, und wie oft wiederholt es sich? Bis
  // v48 ein Achttakter von 9 s aus Oszillatoren, im laengsten Sektor
  // sechzehn Mal.
  { schluessel: 'musik',      lauf: 'Musik (drei Stuecke am Bau)',         zeile: 'Musik (3 Modi)', datei: 'tools/musik.mjs' },
  { schluessel: 'klang',      lauf: 'Klang (Treffer und Abschuss)',        zeile: 'Klang (Treffer, 4 Klassen)', datei: 'tools/klang.mjs' },
  { schluessel: 'geschossdichte', lauf: 'Geschossdichte (je Gegnerart)',    zeile: 'Geschossdichte (12 Arten)', datei: 'tools/geschossdichte.mjs' },
  { schluessel: 'vorwaermen', lauf: 'Vorwaermen (Backvorgaenge im Gefecht)', zeile: 'Vorwaermen (3 Sektoren)', datei: 'tools/vorwaermen.mjs' },
  // Kommt man aus dem Ergebnisbildschirm wieder heraus? Der Rauchtest
  // prueft, dass man ins Spiel KOMMT — hinaus hat nie jemand geprueft.
  { schluessel: 'niederlage', lauf: 'Ergebnis (Weg heraus, Sieg und Niederlage)', zeile: 'Ergebnis (3 Türen)', datei: 'tools/niederlage.mjs' },
  { schluessel: 'steuerung',   lauf: 'Steuerung (30, 60, 120 Hz)',          zeile: 'Steuerung (3 Bildraten)',    datei: 'tools/steuerung.mjs' },
  // Und zuletzt das, was ausgeliefert wird. Bis v51 hat die Torkette den
  // Pages-Bau NIE gebaut: v49, v50 und v51 gingen hier gruen durch, landeten
  // auf main und scheiterten dort an der Auslieferung — die Musik hob die
  // Seite von 3,4 auf 7,2 MB, die Lieferkette verlangt unter 5 MB. Drei
  // Fassungen, drei Fehlermeldungen per E-Mail, kein rotes Tor.
  //
  // Ein gruener Lauf, der eine rote Lieferung nicht ausschliesst, ist keiner.
  // Deckt im Menue etwas etwas anderes zu? Vierzehn Tore haben Farbe,
  // Silhouette und Kanten gemessen — wo etwas LIEGT, hat nie jemand
  // gefragt. Gefunden hat es der Nutzer, mit einem Bildschirmfoto: ein
  // Gegnerbild von 162 x 401 Weltpunkten quer ueber der Level-Vorschau,
  // in einer Spalte, die 88 breit ist.
  { schluessel: 'ueberlappung', lauf: 'Überlappung (9 Menüschirme)', zeile: 'Überlappung (9 Menüs)', datei: 'tools/ueberlappung.mjs' },
  // ELF SCHIRME: neun Menues, das Gefecht und die PAUSE. Dieses Tor gab es
  // seit v40 — als Handbefehl, den niemand aufrief. Damit war es das
  // einzige Tor, das die Pause misst, und zugleich das einzige, das nie
  // lief. Regel 47 in ihrer stillsten Form: nicht eine halb gepruefte
  // Tuer, sondern ein Waechter ohne Dienstplan.
  { schluessel: 'schirme', lauf: 'Schirme (11 Schirme inkl. Pause)', zeile: 'Schirme (11 inkl. Pause)', datei: 'tools/schirme.mjs' },
  // Dasselbe im GEFECHT — und dort gab es die zweite Tuer, nach der
  // niemand gefragt hat: die Bossleiste lag seit ihrer Einfuehrung ueber
  // der Kopfzeilentafel, der Erfahrungsbalken des Flugzeugs in jedem
  // Bosskampf darunter. Das Ueberlappungstor misst acht Menues und haette
  // darueber ewig gruen gemeldet (Regel 47).
  { schluessel: 'kopfzeile', lauf: 'Kopfzeile (Gefecht: ohne Boss, mit Boss, Endlos)', zeile: 'Kopfzeile (3 Zustände)', datei: 'tools/kopfzeile.mjs' },
  // Wirkt, was gekauft wurde? Die Rueckmeldung „gekaufte Drohnen und
  // Beiflugschiffe muessten auch sauber mitschiessen" hatte in beiden
  // Teilen recht — beim Beiflug an der Darstellung, bei der
  // Sekundaerwaffe an einem echten Fehler: der Kauf liess die Stufe auf 0,
  // und beide Feuerstellen verlangen Stufe > 0.
  { schluessel: 'ruestung', lauf: 'Rüstung (Kauf → Wirkung → Anzeige)', zeile: 'Rüstung (Kauf wirkt)', datei: 'tools/ruestung.mjs' },
  { schluessel: 'auslieferung', lauf: 'Auslieferung (Pages-Bau, im Browser)', zeile: 'Auslieferung (Web-App)', datei: 'tools/auslieferung.mjs' },
];

const torZeilen = [];
for (const t of TORE) {
  if (!ok) break;
  if (!laeuft(t.schluessel)) {
    torZeilen.push(`| ${t.zeile} | ⏭ uebersprungen | – |\n`);
    console.log(`\n(—) ${t.lauf} — uebersprungen (${uebersprungenWarum})`);
    continue;
  }
  try {
    const c = buchen(t.zeile, step(t.lauf, `node ${t.datei}${DURCHREICHEN}`));
    torZeilen.push(`| ${t.zeile} | ${c === 2 ? '⚠ nicht gemessen' : '✅ ohne Befund'} | ${c === 2 ? '–' : '0'} |\n`);
  } catch {
    ok = false;
    torZeilen.push(`| ${t.zeile} | ❌ Befund | – |\n`);
  }
}

// Der Master. Er wurde oben gebaut, aber bis v3 nie gestartet — ausgerechnet
// die Datei, die ausgeliefert wird, war die einzige ohne Boot-Test.
let masterZeile = '';
if (ok) {
  const chromium = await ladeChromium();
  if (!chromium) {
    masterZeile = '| `Skyfront.html` (Master) | ⚪ nicht getestet | – |\n';
    console.log('\n  (—) Master-Boot: Playwright nicht gefunden.');
  } else {
    console.log('\n▶ Boot-Test Master');
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
    const r = await startbar(browser, process.cwd() + '/dist/Skyfront.html');
    await browser.close();
    console.log(`  ${r.gestartet ? '✓' : '✗'} Skyfront.html — ${r.gestartet ? 'gestartet, 0 Fehler' : 'Boot fehlgeschlagen (' + r.fehler.length + ' Fehler)'}`);
    r.fehler.slice(0, 3).forEach(f => console.log('     ! ' + String(f).slice(0, 160)));
    ok = ok && r.gestartet;
    masterZeile = `| \`Skyfront.html\` (Master) | ${r.gestartet ? '✅ gestartet' : '❌ Boot-Fehler'} | ${r.fehler.length} |\n`;
  }
}

const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
let md = `# Skyfront — Check-Report\n\n_${date}_\n\n`;

if (existsSync('dist/boot-report.txt')) {
  const lines = readFileSync('dist/boot-report.txt', 'utf8').split('\n').filter(l => /^[✓✗]/.test(l));
  md += '| Datei | Status | Fehler |\n|---|:--:|:--:|\n' + masterZeile + torZeilen.join('');
  let allBoot = true;
  for (const l of lines) {
    const good = l.startsWith('✓');
    if (!good) allBoot = false;
    const file = (l.match(/(Skyfront-[^\s]+\.html)/) || [])[1] || l.slice(2).trim();
    const errs = (l.match(/(\d+)\s*Fehler/) || [])[1] || '0';
    md += `| \`${file}\` | ${good ? '✅ gestartet' : '❌ Boot-Fehler'} | ${errs} |\n`;
  }
  ok = ok && allBoot;
  // Das Urteil wird NACH der Buchung des Ungemessenen gefaellt, nicht davor.
  // Erster Anlauf schrieb "✅ bestanden" in den Bericht, waehrend der Lauf
  // mit Rueckgabe 1 endete — der Bericht sagte das Gegenteil des Ergebnisses.
  if (STRENG && ungemessen.length) ok = false;
  md += `\n**Ergebnis:** ${ok ? '✅ bestanden' : '❌ fehlgeschlagen'}\n`;
} else {
  md += (ok ? '✅ Alle Builds erzeugt. ' : '❌ Build fehlgeschlagen. ') +
    '_Boot-Test nicht gelaufen (Playwright nicht installiert) — nur Struktur-Prüfung._\n';
}

if (ungemessen.length) {
  md += `\n⚠ **Nicht gemessen:** ${ungemessen.join(', ')}${STRENG ? ' — im strengen Lauf zaehlt das als Fehlschlag.' : ''}\n`;
}

writeFileSync('dist/check-report.md', md);
console.log('\n' + md);

if (ungemessen.length) {
  console.log(`⚠ ${ungemessen.length} Tor(e) haben NICHT gemessen: ${ungemessen.join(', ')}`);
  if (STRENG) {
    console.log('  Im strengen Lauf ist das ein Fehlschlag — vor der Auslieferung ist');
    console.log('  "nicht nachgesehen" so wenig wert wie "nicht bestanden".');
    ok = false;  // schon oben gesetzt; hier fuer den Fall ohne Boot-Bericht
  } else {
    console.log('  (Beim Arbeiten kein Grund anzuhalten. Mit --streng schon.)');
  }
}

console.log(ok ? '✓ CHECK bestanden.' : '✗ CHECK fehlgeschlagen.');
process.exit(ok ? 0 : 1);
