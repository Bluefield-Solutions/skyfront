# Skyfront

Senkrecht scrollender Shmup, deutsch, Phaser 3. Aus dem ausgelieferten
Single-File-Build zurueckgewonnener, wieder baubarer Quellcode — kein
Original-TypeScript mehr, aber voll editier- und baubar.

**Diese Datei wird zu Beginn jeder Sitzung gelesen. Sie ist kurz gehalten, weil
eine lange Datei nicht gelesen wird. Alles Ausfuehrliche steht in `README.md`,
`HANDOVER.md` und `docs/`.**

**Das ist NICHT Towerfront.** Beide Projekte laufen in derselben Sitzung, und
ein Befund aus Towerfronts Doku ist hier schon einmal als Skyfront-Befund
gelandet (die „Infanterie mit 0,22 statt 0,35 Bildpunkten je Weltpunkt" — die
gibt es hier nicht, ebensowenig einen Genre-Abgleich). Wer eine Zahl nennt,
nennt die Datei, aus der sie stammt.

---

## Zwei Auslieferungen, ein Quellcode

|  | `dist/Skyfront.html` | `dist/pages/` |
|---|---|---|
| Was | eine Datei, alles inline | Web-App mit Nachbardateien |
| Groesse | 14,98 MB | index.html 2,93 MB + 68 Bilder (9,2 MB) + 11 Startbilder (2,2 MB) |
| Wofuer | weitergeben, Mail, USB | GitHub Pages, iPhone-Startbildschirm, offline |
| Befehl | `npm run build` | `npm run pages` |

Autark heisst autark: in der Einzeldatei sind alle 71 Bilder weiterhin
`data:`-Adressen. Das prueft der Bau selbst.

---

## Befehle

```
npm run zeichenwerk Pufferwechsel je Bild, acht Schirme gegen einen Sektor
npm run sektor     90 s Spielzeit je Sektor, ohne Zeichnen — Anzeigeliste
npm run check      die Torkette: bauen, alle zwoelf starten, Bildtor, Farbtor
                   ~2,5 min oertlich, ~4 min auf GitHub
npm run build      Einzeldatei
npm run pages      Web-App (Manifest, Symbol, Startbilder, Dienst-Arbeiter)
npm run bildtor    sieht das Spiel so aus, wie es soll?  (-- --bilder legt sie ab)
npm run farbtor    drei Farbbaender: Gefahr, Eigenfeuer, Aufsammler
                   (-- --nurstatisch laesst den Browserteil weg, ~2 s)
npm run farbproben acht Gegenproben zu Farb- und Formentor (-- --alle, ~6 min)
npm run formen     Silhouettenabstand der Gegnerprojektile
npm run untergrund Kantenenergie der dreizehn Biome und die Beruhigung
npm run feuerkraft die Leiter gegen den Wellenplan aller 120 Sektoren
npm run speicher   was im Gefecht an Texturen im Speicher liegt
npm run rhythmus   hat ein Sektor eine Form, oder ist er eine Rampe?
npm run schirme    ELF Schirme nachmessen (inkl. Pause): Rand, Ueberlappung,
                   Schriftgroesse — haengt seit v61 in der Torkette
npm run ueberlappung  acht MENUEschirme: deckt etwas etwas anderes zu?
npm run kopfzeile  dasselbe im GEFECHT, ohne und mit Boss
npm run ruestung   wirkt, was gekauft wurde? Und sieht man es? (acht Wege)
npm run messtafel  misst die Messtafel auch EINGEKLAPPT weiter?
npm run symbol     App-Symbol + 11 iOS-Startbilder aus web/icon.svg backen
npm run bilder     WebP-Bahnen neu codieren (q78)
npm run variants   alle Profile + Launcher
npm run package    verteilbares Skyfront-dist.zip
```

Die Torkette: `build` → `build-variants --boot` (elf Dateien) → `bildtor` →
`farbtor` → `formen` → `untergrund` → `feuerkraft` → `speicher` → `rhythmus`
→ `ueberlappung` → `schirme` → `messtafel` → `kopfzeile` → `ruestung` →
`auslieferung` → Boot-Test des Masters → `dist/check-report.md`.

Zwei Workflows: `check.yml` bei jedem Push, `pages.yml` bei Push auf `main`.

---

## Eiserne Regeln

Jede hat mindestens eine Runde gekostet.

1. **Erst einchecken, dann gegenproben.** Die Gegenproben bauen absichtlich
   Fehler ein. `tools/farbproben.mjs` arbeitet deshalb NIE mit `git checkout`:
   es legt vorher eine Kopie an und schreibt daraus zurueck, auch bei einem
   Abbruch. Frische, noch nicht eingecheckte Arbeit ueberlebt das. Wer eine
   neue Probe baut, haelt sich daran.
2. **Grenzen anteilig, nie absolut.** Eine feste Bildtor-Schwelle von 45 hat
   die Hauptlinie **drei Mal rot gemacht**: auf GitHub misst dieselbe heile
   Szene deutlich hoeher als hier (anderer Chromium, andere Rasterung). Bezug
   ist jetzt der Modus „Aus", zweimal gemessen. Die Schirmpruefung fiel
   **danach noch einmal** derselben Falle zum Opfer (Streuung 3 gesetzt,
   GitHub misst am heilen Menue 4,8); dort ist der Median der acht Schirme
   der Bezug. Wer hier eine Zahl hinschreibt, hat schon verloren.
   Ausnahme: eine Notgrenze fuer den Fall, dass ALLES kaputt ist und kein
   gesunder Bezug mehr existiert — weit weg von allem je Gemessenen.
3. **Phasers Schleife kann schlafen.** `renderer.snapshot*` loest den Rueckruf
   am Ende des naechsten Bildes ein. Steht die Schleife (verlorener Fokus auf
   einem CI-Laeufer), kommt nie eins, und der Aufruf haengt fuer immer. Vor
   jeder Aufnahme `loop.wake()`. Nachgestellt mit `loop.sleep()`: ohne Wecken
   haengt es, mit Wecken 922 ms.
4. **Eine Pruefung, die nie etwas meldet, ist kein Beweis.** Jedes Tor hier ist
   mit einem absichtlich eingebauten Fehler gegengeprobt. Steht das nicht in
   der Commit-Nachricht, ist es nicht passiert.
5. **Wer eine Wirkung misst, schaltet sie zuerst ab.** Das Bildtor misst „Aus"
   zweimal; der Abstand beider ist das Rauschen. Liegt kein Modus darueber,
   hat das Tor fuenf Mal dasselbe gemessen und nichts bezeugt — dann schlaegt
   es an.
6. **Jede Zahl traegt ihre Messstelle mit.** Gemessen woran, in welcher
   Aufloesung, in welcher Umgebung. Vier Fehlmessungen kosteten genau das:
   das Nebelloch am ganzen Bild statt im mittleren Band, der Nachlade-Verkehr
   inklusive meines eigenen Vorladens (9,2 MB behauptet, 702 KB gemessen), die
   Schriftgroesse am Puffer statt am Layoutraum (Faktor zwei), und ein
   Befund aus dem falschen Projekt.
7. **Der Layoutraum ist 540 x 960, der Puffer 1080 x 1920.** Die Kameras haben
   Zoom 2. `getBounds()` liefert Layoutpunkte. Wer sie mit `renderer.width`
   vergleicht, misst doppelt so gross — das erzeugte einmal 300
   Phantom-Befunde und machte die Randpruefung wirkungslos.
8. **Kein Tor ersetzt den Blick — und was der Blick findet, wird ein Tor.**
   Die Torkette prueft, dass etwas funktioniert, nicht ob es gut aussieht. Der
   zu schwache HUD-Untergrund (Deckkraft 0,46 ueber heller Stadtkulisse) fiel
   bei keinem Tor auf, sondern beim Ansehen einer Aufnahme. Zuletzt (v2 des
   Farbtors) genauso: `eb_needle`, `eb_bolt` und `eb_diamond` trugen die
   richtige Kennfarbe an den Raendern und ein breites weisses Band in der
   Mitte — auf dem Kontaktbogen lasen sie sich als EIGENES Feuer, alle
   statischen Pruefungen waren gruen. Der zweite Teil des Satzes ist der
   wichtigere: der Befund ist erst erledigt, wenn er gemessen wird. Aus dem
   Blick wurde Pruefung F, die die Pixel des gebauten Spiels zaehlt (alte
   Nadel 23 % eigenes Signal, neue 73 %).
9. **`src/assets.js` ist auto-generiert.** Ein Eintrag darf **geleert**, aber
   nie **entfernt** werden — die Nummern sind Positionen, die `app.js` direkt
   anspringt.
10. **Schriftboden 13 Layoutpunkte** (9,4 Anzeigepunkte bei 390 px Breite).
   Darunter ist auf dem Telefon nichts mehr zu lesen. `npm run schirme`
   meldet jede Unterschreitung.
11. **`intensity` im Stage-Array ist wirkungslos.** Die echte Schwierigkeit
   steckt in der Wellen-Formel `tn` bzw. der `curve` in `balance.js`.
12. **Ein Abnahmekriterium muss an der richtigen Stelle messen.** Das Audit
   verlangte fuer SKY-020 „Kontrast der Gegnerkugel gegen den Untergrund
   >= 3:1". Gerechnet gegen den Median-Untergrund faellt `#ff3a2a` auf sieben
   von dreizehn Biomen durch — obwohl die Kugel dort tadellos zu sehen ist.
   Eine Kugel hat drei Schichten: weisser Kern, Kennfarbe, dunkler Rand.
   **Gefunden** wird sie ueber Kern und Rand, **eingeordnet** ueber die
   Kennfarbe. Wer beides in eine Zahl presst, misst keines von beiden. Wenn
   ein Kriterium nicht erreichbar scheint, erst pruefen, ob es die richtige
   Frage stellt — nicht die Grenze senken, bis die eigene Leistung
   hineinpasst.
13. **Additiv gemischt heisst: es gibt keinen dunklen Rand.** `BlendModes.ADD`
   kann nur aufhellen. Die vier Spielergeschosse waren deshalb ueber heller
   Kulisse bei 2,7 bis 2,9:1 — sie hatten keinen Rand, weil ein Rand dort
   gar nicht ankommen konnte. Das Leuchten gehoert in Spur und
   Muendungsfeuer, nicht in den Koerper.
14. **Eine Kennzahl allein misst nie eine Gestalt.** Der Formentor rechnete
   erst nur die gemeinsame Flaeche (IoU). Als eb_bolt von der runden Kapsel
   zum kantigen Leuchtspurkoerper wurde — fuer das Auge sofort ein anderes
   Ding —, STIEG die Zahl von 0,75 auf 0,80, weil der Bolzen laenger geworden
   war. Erst die zweite Zahl (Breitenprofil ueber sechzehn Hoehen) sagt, WIE
   die Flaeche verteilt ist. Verwechselbar ist ein Paar nur, wenn beide Zahlen
   eng sind.
15. **Was sich dreht, sieht man sich drehen.** Der Formentor urteilte erst
   ueber die schlimmste Lage. Eine Raute mit 90 Grad in der Sekunde deckt den
   Pfeil in einem Augenblick von vieren und steht in den anderen dreien quer —
   das ist kein Lesbarkeitsfehler, sondern ein Einzelbild. Gemittelt wird ueber
   alle Lagen, die schlimmste steht daneben.
16. **Der Schluessel einer TileSprite ist eine interne GUID.** Phaser baut
   sich fuer die Kachelung eine eigene Textur; `this.sea.texture.key` gibt
   `a3363582-eb6d-...` zurueck, nicht `bg_city`. Wer damit etwas nachschlaegt,
   findet nichts und merkt es nicht — die Beruhigungsschicht kam so mit
   Deckkraft 0 heraus und sah aus wie eine Schicht, die nichts tut.
   `this.bodenKey` haelt den wirklich gesetzten Namen fest.
17. **Ein Tor, das die Formel NACHRECHNET, prueft nichts.** Die
   Untergrund-Tafel rechnete die Deckkraft und die Mittelfarbe zuerst selbst
   aus. Die Gegenprobe „Schicht auf Schwarz" blieb deshalb gruen: das
   Werkzeug bekam die Farbe des Spiels nie zu sehen. Die Messung sitzt jetzt
   als Modulfunktion `bodenMessung` im Spiel, `window.__SKF_UNTERGRUND` ist
   die Pruefnaht, und die Tafel ruft sie auf. Wer eine Berechnung im Tor
   wiederholt, bezeugt sie, statt sie zu pruefen.
18. **Kurze Namen im gebauten Buendel sind vergeben.** `function Vt` gab es
   schon (`var Vt = {...}` in Zeile 27). Die Funktionsdeklaration wurde still
   ueberschrieben, `window.__SKF_UNTERGRUND` zeigte auf ein Objekt, und
   `untergrundRuhe` haette zur Laufzeit geworfen. Neuer Code bekommt
   ausgeschriebene Namen — `bodenMessung`, nicht `Vt`.
19. **Eine Anzeige, die sich selbst neu zeichnet, reisst ihre Knoepfe mit.**
   Die Messtafel schrieb alle zwoelf Bilder ihr ganzes innerHTML neu — auf
   einem 60-Hz-Geraet alle 200 ms. Das Ersatzfeld, aus dem man die Messzeile
   markiert, waere dem Nutzer unter den Fingern verschwunden. Werte und
   Bedienung gehoeren in getrennte Elemente.
20. **`ht()` loescht und legt neu an — es gibt ein Fenster ohne die Textur.**
   Der Bildvorrat ersetzt dieselben Schluessel noch einmal, asynchron. Bei
   2000 ms fehlten fuenf von dreizehn Gegnertexturen; ein Tor, das dann misst,
   misst acht und meldet gruen. Nicht auf eine FRIST warten, sondern auf
   STILLSTAND: Bestand und Groessen zwei Runden lang gleich.
21. **Fuer Speicher ist eine absolute Grenze richtig — als einzige.**
   Sonst gilt Regel 2. Aber Texturspeicher MISST sich nicht, er RECHNET sich
   (Breite mal Hoehe mal vier). Derselbe Build gibt auf jedem Rechner
   dieselbe Zahl; da waere eine anteilige Grenze nur Nebel.
22. **Bild und Trefferflaeche sind zwei Dinge.** Der Spaeher war 17
   Anzeigepunkte gross — kleiner als jedes Geschoss. Groesser ZEICHNEN, ohne
   groesser zu TREFFEN, geht ueber `hitScale`: der Koerper wird um
   hitScale/scale zurueckgerechnet. So aendert sich am Spiel nichts, was hier
   ohnehin nicht messbar waere. Nachgerechnet, nicht angenommen: 21 x 32 x
   0,22 = 4,62 Weltpunkte, danach 10,04 x 15,3 x 0,46 = 4,62.
23. **Wer eine Formel ersetzt, rechnet die ALTE nach — und prueft den
   Nachbau.** Der erste Nachbau des alten Wellengenerators stimmte nicht: er
   nahm die Quellformel, die aufgezeichneten Zahlen kamen aber aus dem
   GEBAUTEN Spiel mit Balance-Auflage. Erst mit derselben Auflage passte es.
   Ohne diese Gegenprobe haette der Vergleich zwei verschiedene Spiele
   verglichen — und die beiden Rueckfall-Fehler (Sektoren auf 57 % bzw. 47 %
   der Gegnerzahl) waeren nie aufgefallen.
24. **Elf Profile haengen an den Balance-Ankern.** `waveBase` und
   `spacingBase` werden beim Bauen in den Quelltext gepatcht; der Build bricht
   ab, wenn der Anker fehlt (und hat das beim ersten Versuch getan). Die
   BEDEUTUNG darf sich ebenso wenig aendern wie der Ausdruck: `waveBase` sind
   WELLEN, in elf Profilen zwischen 16 und 34. Wer daraus Bausteine macht,
   stellt still elf Spielarten um.
25. **Ein Einbruch ist relativ, nicht absolut.** Der Atemzug-Test der
   Rhythmus-Tafel brauchte drei Anlaeufe. „Unteres Drittel des Gesamtbandes"
   bestand genau bei dem Fehler, den er finden soll: bei einer reinen Rampe
   liegt der ganze Anfang darunter, die Gegenprobe blieb gruen. „Erst nachdem
   der Druck oben war" meldete 93 Sektoren rot — die zweite Delle liegt
   absolut hoeher als die erste, weil der Anstieg sie mithebt. Richtig ist der
   Vergleich gegen die OERTLICHE Umgebung.
26. **Vor einem Vorher-Nachher-Vergleich die Szene anhalten.** `scene.pause()`
   zeichnet weiter, bewegt aber nichts. Ohne das misst der Vergleich die
   Bewegung des Untergrunds: die erste Messung der Beruhigungsschicht meldete
   -24 % Kantenenergie, obwohl die Schicht mit Deckkraft 0 unsichtbar war.
   Dasselbe schon beim Schatten der Maschine — dritter Anlauf, bis die Zahl
   stimmte.

27. **Der Farbkreis ist VOLL — sag, was Du nicht beweist.** Gefahr,
   Eigenfeuer und sieben Aufsammler belegen ihn fast lueckenlos. Als die
   Gegner eine Kennleuchte bekamen, war der beste erreichbare reine
   Farbtonabstand zu einem Aufsammler **33 Grad**. Ein Tor, das daraus
   „getrennt" macht, luegt. Die Kennleuchte ist getrennt ueber Farbton PLUS
   Helligkeit — und vor allem ueber die GROESSE: 4,8 Anzeigepunkte gegen
   31,8. Das Tor schreibt beides hin, auch den Satz „das beweist es nicht".

28. **Eine Groesse im Bild hat drei Faktoren, nicht einen.** Die erste
   Fassung der Groessenregel nahm die breiteste `ht()`-Anmeldung (der
   Traeger, 297 px — der traegt gar keine Leuchte) und liess `cfg.scale`
   weg. Ergebnis: Faktor 1,67 statt 6,6, das Tor rot, und beides aus
   demselben Grund. Texturbreite × `cfg.scale` × 0,722 — und die
   Texturbreite steht in keiner Tabelle, sie kommt aus dem WebP-Vorrat.
   Also am gebauten Spiel messen, nicht in der Quelle raten.

29. **Eine Gegenprobe muss sagen, WORAN das Tor rot wird.** Bis v9b prueften
   die Proben an den Tafeln nur, DASS es rot wird. Das reicht nicht: die
   Probe „Keil ohne Staffelung" war rot und meldete ein Paar, das der
   Eingriff nicht betraf; die Probe „Bausteine duerfen sich wiederholen"
   war rot ueber die Atemzuege, gedacht war die Vielfalt. Beide zaehlten
   als bestanden und bewiesen nichts. Das sechste Feld in `PROBEN` haelt
   jetzt einen Text, der im Befund vorkommen MUSS — und hat sofort **zwei
   wirkungslose Pruefungen** aufgedeckt.

30. **Eine Pruefung, deren Massstab aus dem Beurteilten stammt, prueft
   nichts** — und das faellt nicht auf, weil sie gruen meldet. Zweimal in
   einer Runde: die Vielfalt-Pruefung nahm ihr Druckband aus der Folge, die
   sie beurteilte (vier von zwoelf Bausteinen: null Befunde). Die
   Formationentafel normierte auf die Streuung des gemessenen Feldes (eine
   Aenderung an A meldete einen Befund ueber B und C). Der Massstab kommt
   aus dem Spiel — die Druckkurve, die Schrittweite 62/46, der Versatz 400 —
   oder aus dem Geraet. Nie aus der Messung selbst.

31. **Zusammenfassen und dann Nachbarn vergleichen ist immer tot.** Die
   Wiederholungspruefung entfernte gleiche Nachbarn und suchte danach
   gleiche Nachbarn. Sie KONNTE nicht anschlagen. Wer eine Folge
   verdichtet, verdichtet nach der Instanz (`bnr`), nicht nach dem Namen.

32. **Wird die Kette rot, ohne dass sich etwas geaendert hat: den ALTEN
   Commit noch einmal laufen lassen.** Am 23.08. fiel das Bildtor aus, und
   der eigene Commit war der einzige Unterschied — dreizehn Zeilen, die den
   Renderer nicht beruehren. Der Beweis dauerte sieben Minuten: derselbe
   Commit, der um 21:45 gruen war, fiel um 22:55 identisch durch. Ohne
   dieses Experiment haette ich stundenlang im eigenen Diff gesucht.

33. **Ein zweiter Messweg ist keine zweite Messstelle.** Phasers
   `snapshotArea` liest den Bildspeicher, Playwrights Bildschirmabzug nimmt
   die zusammengesetzte Seite: Helligkeit 20,4 gegen 48,4, Streuung 6,0
   gegen 19,1. Ein Ersatzweg darf nur dort urteilen, wo das Urteil
   MASSSTABSFREI ist — die Menue-Schirme messen am Median der acht, das
   traegt; die Querkanten messen an einer Grundlinie, das traegt nicht. Der
   erste Anlauf liess ihn ueberall urteilen und erfand eine harte Querkante.

34. **`world.update()` bewegt die Koerper, `postUpdate()` die Bilder.** Wer
   die Physik des Spiels selbst antreibt und nur `update()` ruft, sieht
   unveraenderte Sprite-Koordinaten und schliesst daraus, dass sich nichts
   bewegt. Gemessen: nach `update()` y = -50, nach `postUpdate()` y = 104,
   Koerper bei 86. Dieselbe Sorte Fehler wie bei der Uhr — gerechnet, aber
   an der falschen Stelle abgelesen.

35. **Wer eine Wirkung filmt, filmt lang genug — und schuetzt BEIDE
   Seiten.** Zwei Anlaeufe: erst endete der Durchgang mitten im Film, weil
   die unsterblich gemachten Gegner den Spieler rammten (drei von vier
   Formationen kamen gar nicht ins Bild). Dann war der Film zu kurz — bei
   0,9 s je Bild ist ein langsamer Gegner noch nicht im Sichtfeld, und die
   Formation sah aus wie drei einzelne. Ich habe daraufhin die Formation
   geaendert statt den Film. Das Ergebnis trug, die Reihenfolge war falsch.

36. **Ein Kommentar ist keine Zusicherung.** In tools/bildtor.mjs stand
   woertlich „solange alle acht ueber denselben Weg kommen, faellt der
   Faktor heraus" — und nirgends war es durchgesetzt. Auf GitHub kam ein
   gemischter Satz heraus (Menue ueber Phaser, sieben ueber den Abzug), der
   Median lief auf den falschen Wert, und das Tor meldete einen Befund, den
   es nicht gibt. Wer eine Bedingung aufschreibt, schreibt sie in den Code.

37. **Ein frueher Abbruch darf nicht verschlucken, was schon gefunden
   wurde.** `process.exit(1)` mitten im Lauf beendete das Bildtor, bevor die
   bereits gesammelten Befunde ausgegeben waren — die Konstanten-Sperre hatte
   angeschlagen und niemand sah es. Ein Befund, den niemand sieht, ist kein
   Befund.

38. **„Nicht messbar" ist kein Befund — aber es darf nicht leise sein.** Ein
   Tor, das immer rot ist, weil die Laeufer kaputt sind, wird ignoriert, und
   dann schuetzt es gar nichts mehr. Was nicht gemessen werden KONNTE, geht
   in die Hinweise, wird laut ausgegeben und behauptet nichts. Was gemessen
   werden konnte, urteilt weiter.

39. **Die Version muss mitwandern.** `SKF_VERSION` steht einmal in
   src/app.js, der Bau stempelt sie in die Huelle, und sie steht unten im
   Bild — Menue wie Gefecht. Sie zaehlt mit den Nachtraegen im
   Auditbericht: wer einen Nachtrag schreibt, hebt sie
   (`npm run version -- --setzen`). Eine Version, die sich nie aendert,
   behauptet etwas. `npm run version` haengt in der Torkette und prueft
   Quelle, Bericht und BAU — ein nicht ersetzter Platzhalter sieht in der
   Quelle voellig in Ordnung aus.

40. **Rueckgabe 2 heisst „nicht gemessen".** Ein Tor, das nichts geprueft
   hat, darf im Bericht nicht aussehen wie eines, das bestanden hat. 0 =
   gemessen und ohne Befund, 2 = nicht (vollstaendig) gemessen (Kette bleibt
   gruen, Bericht sagt „⚠ nicht gemessen"), alles andere = Befund.

41. **Gleiche Zahlen sind keine Messung.** Der Bildschirmabzug lieferte fuer
   sieben Schirme sieben Mal 43,6 / 1,9. Der Median daraus ist trotzdem eine
   Zahl. Wo mehrere Dinge gemessen werden, die verschieden sein MUESSEN,
   gehoert eine Sperre hin, die genau das prueft.

42. **Der dritte Ausgang gehoert in JEDES Tor, nicht in die Kette.** Regel 40
   sagt, was Rueckgabe 2 bedeutet — sechs von acht Toren konnten sie
   trotzdem nur fuer den einen Fall „Playwright fehlt". Alles andere fiel auf
   die falsche Seite, und zwar in beide Richtungen: das Formentor meldete
   eine fehlende Textur als BEFUND (ein roter Lauf, der ueber das Spiel
   nichts sagt), die Untergrund-Tafel meldete neun von dreizehn Biomen als
   GRUEN. Die Trennlinie ist immer dieselbe: sagt das SPIEL etwas Falsches,
   ist es ein Befund; hat der APPARAT keine Zahl geliefert, ist es die 2.
   `tools/messstelle.mjs` haelt alle drei Ausgaenge — wer ein Tor baut,
   nimmt sie von dort.

43. **Der Ausgang 2 muss sich herbeifuehren lassen.** Ein Ausgang, der nie
   genommen wird, ist kein Ausgang, sondern eine Behauptung — und das ist
   Regel 5 in ihrer teuersten Fassung, weil es hier den AUSFALL der Messung
   betrifft. `--ohne-naht` nimmt jedem Tor die Messstelle weg, an der es
   haengt; die acht Modusproben verlangen dann genau die 2. Das ist kein
   nachgestellter Zustand: es ist derselbe, den ein zu frueh oder auf einem
   klemmenden Laeufer messendes Tor antrifft.

44. **Beim Arbeiten ist „nicht gemessen" hinnehmbar, vor der Lieferung nicht.**
   Ein Tor, das staendig rot ist, weil der Laeufer klemmt, wird ignoriert —
   dann ist es gar kein Tor mehr. Vor der Auslieferung ist es umgekehrt:
   dort ist „nicht nachgesehen" so wenig wert wie „nicht bestanden".
   Deshalb `--streng`, und deshalb nur in der CI.

45. **Ruhe misst man am Bestand, den der Code laedt — nicht an allem.** Die
   erste Ruhepruefung der Speicher-Tafel zaehlte Phasers Kachelpuffer mit.
   Die schwanken im Gefecht von Bild zu Bild (141, eine halbe Sekunde
   spaeter 139, bei unveraenderten 63,0 MB) und kommen nie zur Ruhe: der
   erste strenge Lauf meldete „nicht gemessen" auf einem vollkommen gesunden
   Stand. Wer auf Stillstand wartet, muss vorher sagen, WESSEN Stillstand.
   Und der Vorgaenger dieser Pruefung war noch schlimmer — eine Grenze
   `< 100 Texturen`, wo der kleinste je beobachtete Wert 119 war (Regel 2).

46. **Eine Regel, die nur in EINER Datei steht, gilt nur in dieser Datei.**
   In `tools/vorwaermen.mjs` steht seit v45: die Einweisung laesst sich
   nicht wegtippen („drei Anlaeufe gekostet und nie funktioniert"), also
   wird `startStage()` gerufen. In v56 habe ich in der Speicher-Tafel
   dasselbe Problem drei Mal neu geloest — auf das aktive Menue gewartet,
   auf `__bootStats.totalMs` gewartet, dazwischen getippt. Lokal jedes Mal
   gruen, auf dem Laeufer jedes Mal rot. **Vier rote Laeufe, um eine
   Antwort wiederzufinden, die schon aufgeschrieben war.**

   Wer ein Werkzeug baut, das ins Gefecht muss, sieht zuerst nach, wie die
   anderen es tun. Der Weg heisst: Szene benannt starten, kurz warten, und
   wenn der Sektor nicht von selbst anlaeuft, `startStage()` rufen. Nicht
   tippen.

47. **Ein Tor, das eine von zwei Tueren prueft, meldet gruen ueber ein Haus,
   aus dem man nicht herauskommt.** (v61: auf alle Tore angewandt —
   `schirme` 10 → 11 Schirme (+ Pause), `ueberlappung` 8 → 9 Menues
   (+ Gear), `kopfzeile` 2 → 3 Zustaende (+ Endlos), `Ergebnis` 2 → 3
   Tueren (+ Niederlage im Endlos). Kein einziger Befund ueber das Spiel —
   aber vier Tueren, die nie jemand geoeffnet hat. Und der eigentliche
   Fund: `npm run schirme` hing GAR NICHT in der Torkette. Das einzige
   Tor, das die Pause misst, war zugleich das einzige, das nie lief —
   Regel 47 in ihrer stillsten Form: kein halb geprueftes Haus, sondern
   ein Waechter ohne Dienstplan.) Das Tor hiess „Niederlage" und hat
   gemessen, was sein Name sagt: den Weg aus dem Niederlagenbildschirm.
   Der SIEGES-Bildschirm hatte seit v49 keinen Weg hinaus — nach jedem
   gewonnenen Level, sieben Fassungen lang. Gefunden hat es der Nutzer.
   Wer einen Zustand prueft, zaehlt vorher auf, wieviele es davon gibt.

48. **Eine Zeile, die nur im Fehlerfall laeuft, ist ungeprueft, bis der
   Fehler eintritt.** Die Diagnosezeile, die den roten Lauf erklaeren
   sollte, warf selbst `ReferenceError: stand is not defined` — sie las
   eine Variable ausserhalb ihres Gueltigkeitsbereichs. Lokal lief der
   Zweig nie, weil der Sektor immer startete. Fehlerzweige werden von Hand
   herbeigefuehrt, sonst sind sie Dekoration.

49. **Ein Layout wird mit dem LAENGSTEN Text gemessen, nicht mit dem
   naechstbesten.** Die neue Kopfzeile war gruen — mit „General" (sieben
   Zeichen) und „STUFE 7". Mit „Oberleutnant" (zwoelf) ragt der Rangname
   aus der Tafel, mit „STUFE 10 MAX" liegt die Stufe auf ihrer eigenen
   Beschriftung: 17 Layoutpunkte Deckung, gefunden im ERSTEN Lauf des
   neuen Tors, nachdem sein Spielstand auf den schlimmsten Fall gestellt
   war (neun Sterne, 999999 Erfahrung). Ein Werkzeug, das sich einen
   bequemen Zustand herstellt, misst den bequemen Zustand.

52. **Eine Voraussetzung wird gesetzt UND nachgewiesen.** Das
   Ruestungstor drueckte den Kaufknopf und las danach den Spielstand —
   und meldete „Laser gekauft → weapon=''", einen Befund ueber das Spiel,
   der in Wahrheit ueber das Werkzeug war: nach dem Hochlauf stand
   `gold: 0`, ein `addInitScript` VOR dem Laden haelt nicht, und
   `spendGold(1400)` scheiterte still. Jetzt setzt das Tor das Gold nach
   dem Hochlauf, prueft, dass es angekommen ist, und VERLANGT, dass beim
   Kauf Gold abgeht. Geht keines ab, ist nichts gemessen (Rueckgabe 2)
   statt etwas behauptet.

53. **Ein Spielraum, der groesser ist als der Abstand der Dinge, trifft
   das Falsche.** Dieselbe Trefferwahl gab 40 Punkte Luft nach oben und
   unten. Die Waffenkarten stehen 82 Punkte auseinander und sind 74 hoch —
   die Karte darueber und die richtige lagen beide im Fenster, beide
   gleich gross, gedrueckt wurde die erste in der Liste. Erst streng
   pruefen, Luft nur, wenn streng nichts trifft.

49b. **Ein Kaufweg wird GEGANGEN, nicht nachgebildet.** Das Ruestungstor
   betritt das Arsenal und drueckt die Schaltflaeche an „Suchraketen".
   Haette es stattdessen `secondary` und `up_sec` selbst gesetzt, waere
   genau der Fehler unsichtbar geblieben, um den es ging: der Kauf setzte
   nur `secondary` und liess die Stufe auf 0 — und beide Feuerstellen
   verlangen Stufe > 0. Wer 1000 Gold zahlte, sah „✓ Aktiv" und es
   passierte nichts. Ein Tor, das den Weg abkuerzt, prueft die Abkuerzung.

57. **Ein Regler mit festen Schwellen hat ein TOTES BAND, und darin lebt
   das Geraet.** Die Effekt-Absenkung senkte unter 46 Bildern je Sekunde
   und hob erst ueber 56. Gemessen auf dem iPhone, Sektor 106: 55,6
   Bilder je Sekunde, Effektbudget 0,35 nach 88 Sekunden — der Regler
   KONNTE nicht mehr hochkommen und lief den Rest des Sektors ohne
   Schmuck. Die Schwellen sind jetzt Anteile des Bildschirmtakts (78 %
   runter, 90 % hoch), und der Takt kommt aus dem SCHNELLSTEN gesehenen
   Bild. Dieselbe Ueberlegung wie bei der Messtafel (Regel 54), nur im
   Spiel: ein Massstab, der aus dem Gemessenen stammt, misst nichts mehr.

58. **Was diese Umgebung nicht herstellen kann, misst das GERAET — dafuer
   wird das Instrument erweitert, nicht die Vermutung.** Neun Sekunden
   Sektor 106 ergeben hier 95 Objekte und keinen einzigen Gegner; das
   Geraet sah 519. Statt zu raten, woraus sie bestehen, nennt die
   Messtafel jetzt die VORRAETE (Kugeln, Gegnerkugeln, Gegner,
   Aufsammler, fx, Texte) und zaehlt die Aufraeumvorgaenge mit. Die
   naechste Kopierzeile beantwortet die Frage, statt sie zu verlaengern.

67. **Ein Rig treibt nur, was es treibt — der Rest ist eingefroren, nicht
   ruhig.** Das Sektor-Rig taktet die Spielschleife von Hand. Der
   Modifikator (`src/modifier.js`) taktet sich aber SELBST, ueber
   `requestAnimationFrame`, und wird dabei nie aufgerufen. Seine
   Wetterebenen standen deshalb im Messprotokoll als „steht" — sie stehen
   nicht, sie werden nur nicht bewegt. Wer das als Befund meldet, meldet
   einen Befund ueber sein eigenes Werkzeug. Sie sind an `sp.__skf` zu
   erkennen, werden gezaehlt und ausdruecklich NICHT beurteilt.

   Das war der vierte Messfehler derselben Runde, alle in derselben
   Familie: etwas gemessen, das nicht das Gemeinte war. Mit Alpha
   gewichtet (Wirkung statt Kosten), `fillAlpha` mit `alpha` verwechselt,
   `alpha 0` mitgezaehlt (erfundene Kosten), und jetzt eingefrorene
   Ebenen fuer ruhende gehalten. Jeder einzelne sah fuer sich plausibel
   aus.

68. **Ein Budget, das den Fehler nicht mehr faengt, gegen den es gebaut
   wurde, ist keins.** Sektor 61 (Gewitter) traegt zehn bildfuellende
   Ebenen, weil der Wettereffekt vier bewegte uebereinanderlegt. Um ihn
   durchzulassen, war das Budget auf zwoelf gehoben — und damit lief die
   Gegenprobe, die die gebackenen Farbebenen wieder trennt, glatt durch.
   Die Grenze gilt jetzt den STEHENDEN Ebenen: eine stehende ist immer
   backbar, eine bewegte ist eine gestalterische Entscheidung, die ein
   Tor nicht trifft. Budget zwei, heute eins, nach dem Rueckbau drei.

66. **Ein Instrument, das bei jeder Unterbrechung zurueckspringt, misst
   nicht den Vorgang, sondern die letzte Unterbrechung.** Die Messtafel
   setzte zurueck, sobald `scene.isActive()` einmal falsch war — und
   beim PAUSIEREN ist die Spielszene nicht aktiv. GEMESSEN: 8 Bilder vor
   der Pause, 4 danach. Die v69-Zeile vom Geraet meldete daraufhin
   `Q 0.15` bei „2,4 s / 144 Bilder" in Sektor 111, und aus ihr war NICHT
   zu entscheiden, ob der Regler zu schnell gefallen war: die 2,4
   Sekunden waren nicht das Alter des Sektors, sondern die Zeit seit dem
   letzten Fortsetzen. Zurueckgesetzt wird jetzt, wenn der Sektor einen
   NEUEN LAUF zaehlt (`laufNr`) — nicht, wenn er kurz stillsteht.

   Und dieselbe Zeile hat noch etwas gezeigt: eine Zahl ohne ihre
   Geschichte ist nicht zu lesen. Dasselbe `Q 0.15` heisst „eben
   eingebrochen" oder „klebt seit einer Minute unten", und nur das zweite
   ist ein Befund. Die Tafel nennt jetzt beides: wie oft gefallen, wie oft
   gestiegen, vor wieviel Sekunden zuletzt, und wie alt der Sektor ist.

63. **Was in beide Richtungen wirken soll, braucht in beiden Richtungen
   eine Bremse.** Der Effekt-Regler war getaktet — aber nur beim STEIGEN
   (alle 900 ms um 0,05). Das FALLEN lief ungebremst mit der Regel selbst,
   also dreimal je Sekunde um 0,12: von 1,00 auf den Boden in 2,7
   Sekunden. Gemessen auf dem Geraet, **Sektor 1**: 58,8 Bilder je
   Sekunde, 89 % der Bilder unter 17 ms — und trotzdem `Q 0.15`. EIN
   Ruckler von 90 ms hat gereicht, und zurueck haette es fuenfzehn
   Sekunden Ruhe gebraucht. Wer eine Groesse nach oben taktet und nach
   unten nicht, hat keinen Regler gebaut, sondern eine Rutsche.

64. **Ein zweiter Weg zu derselben Sache wird zur Falle, sobald der erste
   sichtbar ist.** Die vier Tipps in die obere rechte Ecke waren der
   Notweg zur Messtafel, bevor es den 📊-Knopf gab. GEMESSEN an
   393 x 852: die Ecke ist 71 px gross, und darin liegen PAUSE (370, 138)
   und TON (335, 138). Vier Mal pausieren schaltete damit die Messung um
   und warf die laufende Messung weg. Rueckmeldung des Nutzers: „Der
   Pause Button ging gerade nicht." Ein Notweg gilt fuer den Fall, fuer
   den er gemacht ist — hier: die Spielszene kommt nicht hoch. Genau dann
   laeuft sie nicht, also kostet die Sperre nichts.

65. **Eine Zahl, die an drei Stellen ANGEZEIGT wird, muss an EINER Stelle
   gerechnet werden.** Die Combo hatte drei Anzeigen und drei
   Geschichten: die Kopfzeile `COMBO 12 ×2.5`, die Meldung `COMBO ×12`
   (dieselbe 12, aber mit einem Kreuz davor — also Faktor zwoelf statt
   2,5), und eine Leiste, die auf die ZEHNERMARKE fuellte, waehrend der
   Faktor alle VIER steigt und ab 28 stillsteht. Rueckmeldung des
   Nutzers: „Das mit den Combos macht keinen Sinn." Er hatte recht, und
   kein Tor hatte es je gesehen, weil jede Anzeige fuer sich richtig
   aussah. Jetzt kommt alles aus `comboWerte()`, und das Kopfzeilentor
   prueft die Rechnung an acht Faellen.

66. **Ausliefern und ankommen sind zwei Dinge, und nur eines davon war
   geprueft.** Rueckmeldung des Nutzers zu v73: „Ich habe die App jetzt
   mehrfach geschlossen, weggeschoben und gestartet, aber es steht immer
   V72 unten." Zwei Ursachen, und die zweite ist der Fehler:

   Der Dienst-Arbeiter legte seine Huelle mit `cache.addAll(['./', …])`
   ab. `addAll` fragt durch den Zwischenspeicher des BROWSERS, und
   GitHub Pages liefert HTML mit `max-age=600`. Der neue Arbeiter legte
   damit die ALTE Seite unter der NEUEN Marke ab — und weil die Marke
   stimmte, wurde sie nie wieder erneuert. Das Geraet blieb stehen, bis
   jemand den Speicher von Hand loeschte.

   Vierzehn Fassungen lang stand in dieser Datei „die Web-App
   aktualisiert sich danach von selbst". Geprueft war davon genau ein
   Teil: dass sich EIN Arbeiter anmeldet. Ob je ein ZWEITER durchkommt,
   hat kein Tor je gemessen — und das ist der Weg, auf dem eine Lieferung
   das Geraet erreicht.

   Das Auslieferungstor misst es jetzt am echten Weg: die alte Fassung
   ist installiert, die neue liegt auf dem Server, und gezaehlt wird, wie
   oft man starten muss. Der Testserver sendet dafuer `max-age=600` wie
   GitHub Pages — ohne diese Zeile koennte die Probe den Fehler gar nicht
   sehen. Gemessen: mit `addAll` nach VIER Starten nicht da, mit
   `fetch(pfad, { cache: 'reload' })` nach ZWEI. Zusage sind zwei: der
   erste Start holt den neuen Arbeiter, der zweite wird von ihm bedient.

67. **Eine Gegenprobe haengt an einer Stelle in der Quelle — und Stellen
   wandern.** Dreimal in sechs Fassungen ist eine Probe verrottet: ihr
   Eingriff traf nicht mehr, wo er sitzen sollte, und sie belegte seither
   nichts. v69 (`boss: 2` → 4), v73 (`boss: 3` → 4), v75
   (`this.endeKnoepfe = [` traf ab v56 ZWEI Stellen).

   Der dritte Fall ist der lehrreiche: die zweite Fundstelle entstand als
   KORREKTUR eines Fehlers, den eine Nachbarprobe bewacht. Eine
   Verbesserung hat eine Gegenprobe erschlagen — und beide sahen gruen aus.

   Die Pruefung dagegen gab es die ganze Zeit. Sie stand nur am falschen
   Ort: ohne `--alle` wird jede Probe mit Neubau uebersprungen, BEVOR ihr
   Anker geprueft wird. Ausgerechnet die Pruefung, die Drift findet, war an
   den Lauf gekettet, der fuenfzig Minuten dauert und im Alltag nicht
   stattfindet. Jetzt ist sie das 27. Tor und kostet 0,16 s.

   **Wer einen Anker waehlt, waehlt keine Zahl, die sich beim Balancieren
   bewegt, und keinen Ausschnitt, den ein spaeterer Zusatz ein zweites Mal
   erzeugen kann.** Kapitelgrenze statt Bosszahl. Und: eine Aenderung, die
   eine zweite Fundstelle schafft, ist eine Aenderung an den Proben — auch
   wenn sie wie eine Verbesserung am Spiel aussieht.

68. **Eine Pruefung, deren Preis niemand kennt, wird weggelassen, wenn es
   eilt.** Der Probensatz lief in einen Zeitdeckel und wurde abgewuergt;
   erst daran fiel auf, dass seine Dauer nirgends stand — weder im ganzen
   noch je Probe. Fuer die Modusproben gab es die Messung einmal, und sie
   war lehrreich: 174 von 230 s lagen in ZWEI Bildtor-Laeufen, daraus wurde
   `--ohnebild`. Fuer den ganzen Satz wurde die Frage nie gestellt.

   Er misst sich jetzt selbst und schreibt seine Messstelle dazu: auf
   diesem Rechner, in diesem Lauf, nicht uebertragbar. Vergleichbar ist
   nur, was INNERHALB eines Laufs nebeneinander steht — Regel 12 fuer
   Sekunden.

62. **Vor dem Justieren den Raum ansehen — und die Fehlanzeige stehen
   lassen.** Der fx-Deckel war nach v67 der plausibelste Hebel: 170 aktive
   Effekte sind der groesste Block der Anzeigeliste. Durchprobiert
   (170 · 130 · 100 · 70 · 45) ergab das nichts:

   | Deckel | Zeichenaufrufe | Rechnen p50 | bemalte Flaeche |
   |---|---|---|---|
   | 170 | 29 | 0,80 ms | 5,87 Bildschirme |
   | 45 | 26 | 0,60 ms | 5,96 Bildschirme |

   Die Effekte sind klein und werden gebuendelt. Das Geraet hatte es
   ohnehin gesagt: bei Q 0,35 stand der Deckel auf 89 und es reichte
   trotzdem nicht. **Nichts geaendert** — ein Deckel, der nichts bewegt,
   kostet beim Senken nur Aussehen.

   Was der Raum stattdessen zeigt: die Rechenzeit des ganzen Spiels liegt
   bei **0,9 ms von 16,7**. Die Zeit steckt im ZEICHNEN, und dort in
   wenigen grossen Posten — in Sektor 3 bemalen **sieben Rechtecke 1,86
   Bildschirme**, mehr als alles andere zusammen. Bemalte Flaeche ist
   reine Geometrie und uebertraegt sich eins zu eins aufs Telefon; sie
   steht seit v68 als Pruefung E in `npm run sektor`.

61. **„Diese Umgebung kann die Last nicht herstellen" war ein Irrtum ueber
   den Flaschenhals.** Vier Runden lang hiess es, die 519 Anzeigeobjekte
   aus Sektor 106 seien hier nicht zu messen: neun Sekunden unter
   SwiftShader ergaben 95 Objekte und keinen Gegner. Zu langsam war aber
   nicht das RECHNEN, sondern das ZEICHNEN. Wer das Zeichnen abschaltet
   und die Spielschleife von Hand taktet, rechnet 90 Sekunden Spielzeit
   in gut vier Sekunden Wanduhr — mit derselben Wellensteuerung,
   derselben Physik, denselben Vorraeten:

       g.renderer.render = () => {};
       for (let i = 0; i < N; i++) g.loop.step(t += 16.7);

   Bevor etwas „auf dem Geraet gemessen werden muss", gehoert die Frage
   gestellt, WELCHER Teil hier eigentlich nicht geht. Bildzeiten: nicht.
   Alles, was Spiellogik ist: doch.

   Und ein Rig traegt seine Verzerrung mit (Regel 12): der Spieler ist
   unverwundbar und weicht nicht aus, trifft also weniger als ein Mensch —
   es leben MEHR Gegner als im echten Spiel (54 hier gegen 15 auf dem
   Geraet). Fuer die Frage „waechst die Liste" ist das die unguenstigere
   Seite, und damit die richtige.

60. **Ein Vor-Effekt ist kein Zierrat, sondern ein Zielwechsel je Bild.**
   `preFX.addGlow` auf einer Ueberschrift sieht aus wie eine Zeile Code und
   kostet, GEMESSEN, zwei Pufferwechsel je Bild und Objekt — solange der
   Schirm steht, nicht einmal beim Aufbauen. Das Menue kam so auf fuenf
   Pufferwechsel je Bild, ein laufender Sektor braucht EINEN. Auf einer
   Kachel-Grafikeinheit, wie sie in jedem iPhone steckt, ist der
   Zielwechsel der teure Posten. Was nicht wackelt, wird gebacken.

   Und der Ersatz ist erst fertig, wenn man ihn ANGESEHEN hat. Zwei
   Anlaeufe waren in jedem Tor gruen und im Bild unbrauchbar: ein Kranz in
   voller Aufloesung sieht aus wie zwoelf versetzte Kopien der Schrift, und
   klein gebacken plus gross angezeigt wird zu Kloetzchen, weil die
   Zeichenflaeche beim Vergroessern nicht filtert. Getragen hat erst der
   dritte Weg — `shadowBlur` auf einer Leinwand, die Schrift dabei NEBEN
   dem Blatt, damit nur der weiche Schein ankommt.

59. **Ein Instrument, das man BEDIENT, misst seine eigene Bedienung mit.**
   Die dritte Geraetemessung meldete als laengste Bildluecke 115,0 ms bei
   121,8 s — bei 122,5 s Gesamtlauf. Der Ausschlag lag im letzten Prozent
   des Laufs, also genau dort, wo man aufklappt und kopiert, um ihn
   abzulesen. Ob er vom Spiel kam oder vom Ablesen, war NICHT zu
   entscheiden: hier unter SwiftShader dauert jedes Bild 350 ms, darin
   ist ein Umbau von 30 ms unsichtbar (Regel 58). Also raet man nicht,
   sondern bucht getrennt: das eine Bild nach einem Formwechsel oder
   einem Kopieren zaehlt als „Umbau" und faellt aus den Bildzeiten, die
   laufende Auffrischung bleibt drin (sie ist waehrend jeder Messung da)
   und wird nebenher verglichen. Und weil eine Buchung, die zuviel
   einsammelt, sich die Zahlen schoenrechnet, prueft das Tor BEIDE
   Richtungen: ohne Umbau darf der Zaehler nicht steigen.

56. **Ein festes Element ueber der Leinwand schluckt jeden Zug, der auf
   ihm beginnt.** Die Messtafel steht seit v62 eingeklappt WAEHREND des
   Spiels da — knapp ueber der Knopfreihe, also genau dort, wo der Daumen
   liegt. Rueckmeldung des Nutzers: „der Aufklapper stoert total das
   Fliegen, man kann das Flugzeug kaum sauber steuern." Wer etwas ueber
   die Leinwand legt, macht es durchlaessig (`pointer-events: none`) und
   nimmt nur die KNOEPFE aus. Und geprueft wird nicht, was dort LIEGT,
   sondern ob ein Zug von dort im Spiel ANKOMMT — gegen eine freie
   Flaeche gemessen, sonst hiesse „kommt nicht an" womoeglich nur, dass
   Ziehen ueberhaupt nicht ankommt.

54. **Eine Anzeige, die beim Einbruch mitgeht, bezeugt ihn, statt ihn zu
   melden.** Die Messtafel schaetzte den Bildschirmtakt aus dem MEDIAN der
   Bildzeiten — also aus dem, was das Spiel gerade schafft. Bei 3,2
   Bildern je Sekunde kam „~3 Hz" heraus, das Budget wurde 533 ms, und
   ein p95 von 350 ms stand GRUEN da. Ein Massstab, der sich der Leistung
   anpasst, misst nichts mehr (verwandt mit Regel 30). Der Takt kommt
   jetzt aus den SCHNELLSTEN Bildern; reicht das nicht fuer 45 Hz, sagt
   sie „unbekannt" und misst gegen 60 Hz.

55. **Was in der HUELLE steht, sichert die Gegenprobe nicht mit.**
   `tools/farbproben.mjs` legte nur von `src/app.js` eine Kopie an. Die
   Messtafel haengt in `index.head.html` — bewusst, damit sie einen
   Absturz des Spiels ueberlebt. Ein Eingriff dort waere nie angekommen
   und haette wie eine bestandene Probe ausgesehen. Eine Probe nennt
   jetzt ihre Datei.

51. **Den Text zu LESEN ist nicht dasselbe, wie ihn zu SEHEN.** Das
   Ruestungstor meldete „Knopf zeigt 2.2 s", auf dem Bildschirmfoto war
   nichts. Ich habe daraufhin eine halbe Stunde in Phasers Texturen
   gesucht und einen Befund erfunden („leer erzeugter Text bleibt 1x1") —
   `texW` ist bei ALLEN Texten 1, auch bei den sichtbaren. Der Grund war
   banal: zwischen Messung und Abzug war die Wirkung ABGELAUFEN.
   Gemessen bei t₀, fotografiert bei t₁, Differenz groesser als die
   Wirkdauer. Wer eine fluechtige Sache misst, misst und fotografiert im
   selben Augenblick — oder nimmt eine, die lange genug steht.

50. **Was gezeichnet, aber nicht als Objekt angelegt wird, ist fuer jedes
   Werkzeug unsichtbar.** Tafel, Kraftleiter, Lebensgurt und Bossleiste
   sind `Graphics` — kein `getBounds()`, keine Anzeigeliste, nichts zu
   messen. Deshalb lief die Bossleiste neun Fassungen lang quer ueber die
   Kopfzeilentafel und der Erfahrungsbalken des Flugzeugs lag in jedem
   Bosskampf darunter. Wer eine Flaeche zeichnet, traegt ihr Rechteck in
   `KOPFZEILE` ein — beim ZEICHNEN, nicht im Tor nachgerechnet (Regel 17).

---

## Aufbau

```
src/balance.js     ★ Kernwerte an EINER Stelle (HP, Feuerrate, Kurve, Preise)
src/app.js         der Spielcode, ~2,8 MB, minifiziert-aber-lesbar
src/modifier.js    Level-Modifikator (Nacht/Sturm/Daemmerung/Nebel), lebende Schicht
src/assets.js      AUTO-GENERIERT, 71 Base64-Blobs

index.head.html    <head> UND Rumpfanfang (#game, #splash, #diag)
pages.mjs          baut die Web-App aus der fertigen Einzeldatei
tools/             boot · bildtor · farbtor · formen · untergrund · feuerkraft
                   speicher · rhythmus · farbproben · schirme · symbol · bilder
web/icon.svg       ★ QUELLE des App-Symbols (#grund / #maschine / #schleier)
profiles/          je eine Spielvariante
```

Szenen: Boot · Menu · Options · Hangar · Workshop · Arsenal · Levels ·
Briefing · Loadout · Gear · Game · Pause.

Bezeichner sind minifiziert (`tt`, `pe`, `bt`, `J`=540, `rt`=960). Werte und
Texte sind lesbar; grosse Umbauten sind muehsam. Der Build spielt
`balance.js` **anker-basiert** ein und bricht ab, wenn er einen Anker nicht
findet — statt still das Falsche zu bauen.

---

## Stand

Einzeldatei 14,98 MB, Web-App auf GitHub Pages, auf dem iPhone-Startbildschirm
ablegbar, offline spielbar (68 von 68 Bildern im Speicher).

Zehn Schirme nachgemessen: 0 ueber den Rand, 0 unter 9 Anzeigepunkten, 0
Ueberlappungen. Bildtor prueft acht Menue-Schirme plus fuenf
Modifikator-Modi im Gefecht. Die Kopfzeile im Gefecht trennt Pilot (Gold,
Sterne, ueber alle Flugzeuge) und Flugzeug (Gruen, Erfahrung, je Flugzeug)
in zwei gleich gebaute Bloecke; die Feuerkraft ist eine Leiter aus zehn
Kammern mit der Wirkung daneben (`5 BAHNEN`, `STRAHL 32`).

**Der Tier-Bonus zaehlt den BESTAND — bestaetigt, nicht vermutet (v60).**
Er zuendet ueber die Seltenheiten der ANGELEGTEN Module und rechnet dann
jedes BESESSENE Stueck dieser Seltenheit mit. Gemessen mit gleichen
epischen Modulen (Krit 20): 1 angelegt → 21 %, 1 angelegt und 4 im Lager
→ 25 %, 0 angelegt und 5 im Lager → 0 %. Der Nutzer hat das bestaetigt
(„zaehlt mit"), also ist es eine Zusicherung: `npm run ruestung` faellt
um, wenn jemand es auf die angelegten Stuecke zurueckschneidet. Auf dem
Schirm steht es jetzt auch — `Tier-Bonus: Episch ×3` in der Kopfzeile und
eine Zeile neben „Zerlegen".

**GEMESSEN AM GERAET (v63), die erste belastbare Leistungszahl des
Projekts.** iPhone, iOS 18.7, 393 x 793 @3x:

| | Sektor 2 | Sektor 106 |
|---|---|---|
| Bildrate | 58,8/s | 55,6/s |
| p50 / p95 | 17,0 / 18,0 ms | **18,0 / 24,0 ms** |
| Bilder unter 17 ms | 88 % | **39 %** |
| Effektbudget Q | 1,00 | **0,35** |

In spaeten Sektoren liegt der MEDIAN ueber dem 60-Hz-Budget. Und die
Partikel sind es nicht: bei Q 0,35 ist `fxCap` 89, und im schlechtesten
Bild standen genau 89 — die Effekte werden bereits weggelassen, es reicht
trotzdem nicht.

Das `Q 0,35` selbst war ein eigener Befund und ist behoben (v64, Regel
57): der Regler hob erst ueber 56 Bilder je Sekunde, das Geraet lieferte
55,6 — er konnte nicht mehr hochkommen.

**BEANTWORTET (v67), und zwar hier, ohne Geraet.** „Diese Umgebung kann
die Last nicht herstellen" war ein Irrtum ueber den Flaschenhals: zu
langsam ist das ZEICHNEN, nicht das Rechnen. `npm run sektor` schaltet
das Zeichnen ab und taktet die Schleife von Hand — 90 Sekunden Spielzeit
in gut vier Sekunden (Regel 61).

Sektor 106, 90 s: die Anzeigeliste steigt in acht Sekunden auf rund 620
und bleibt dort. **Kein Leck** — das mittlere gegen das letzte Drittel:
+2 %. Sie besteht aus lauter arbeitenden Dingen, nicht aus Muell: der
groesste einzelne Block sind die **170 aktiven Effekte, also genau der
fx-Deckel**, dazu rund 100 Gegnerkugeln und 50 Gegner.

Die Spur `trimPools()` trug trotzdem etwas — nur nicht das, was vermutet
war. Gemessen:

| | Gegner im Mittel | Tor offen | aufgeraeumt in 90 s |
|---|---|---|---|
| Sektor 3 (v66) | 14 | 5,9 % | 8x |
| Sektor 106 (v66) | 54 | **0,7 %** | **1x** |

Die Bedingung hing an `enemies.countActive() > 2` und war damit genau
dort zu, wo die Vorraete am groessten sind. Wovor sie schuetzte, ist
ebenfalls gemessen: EIN Aufraeumen kostet 0,3 bis 0,9 ms, die naechsten
elf je 0,0 — bei hoechstens einem Aufruf alle vier Sekunden. Eine Bremse
gegen eine Last, die es nicht gibt. Seit v67 haengt sie an der Bildzeit
und am Muellstand, beides anteilig: **23x statt 1x**, abgeschaltete
Objekte in Sektor 106 von 28 % auf 9 %.

**Das ist Ordnung, keine Leistung** — abgeschaltete Objekte kosten kein
Zeichnen.

**Die v68-Zahlen zur bemalten Flaeche waren FALSCH — korrigiert in v71.**
Zwei eigene Messfehler, beide in dieselbe Richtung „Wirkung statt
Kosten": mit der Deckkraft gewichtet (eine ueberblendete Flaeche kostet
dasselbe, ob sie zu vier Prozent deckt oder zu hundert), und bei
Phaser-FORMEN mit dem falschen Feld (`alpha` statt `fillAlpha`). Dazu ein
dritter in die Gegenrichtung: Objekte mit `alpha 0` mitgezaehlt, die
Phaser gar nicht erst einreicht. Richtig ist:

| | bemalt je Bild | bildfuellende Ebenen |
|---|---|---|
| Sektor 3 (v70) | 8,30 Bildschirme | **7** |
| Sektor 3 (v71) | **6,31** | **5** |
| Sektor 106 (v70) | 13,61 | **10** |
| Sektor 106 (v71) | **11,69** | **8** |

Drei bildfuellende Ebenen (`gradeTop`, `gradeBot`, `stageOverlay`) lagen
uebereinander, aenderten sich innerhalb eines Sektors NIE und kosteten
trotzdem drei volle Bildschirme Ueberblendung je Bild — bei 4, 6 und
4 Prozent Deckung. Seit v71 werden sie einmal je Biom zusammengebacken
(Regel 60: was sich nicht bewegt, wird gebacken). Vorher und nachher
angesehen, in Stadt und Lava: kein Unterschied im Ton.

**Und der fx-Deckel ist es auch nicht (v68, Fehlanzeige).** Durchprobiert
von 170 bis 45: Zeichenaufrufe 29 → 26, Rechenzeit 0,80 → 0,60 ms,
bemalte Flaeche 5,87 → 5,96 Bildschirme. Nichts davon bewegt sich. Was
sich zeigt: das ganze Spiel RECHNET 0,9 ms von 16,7 — die Zeit steckt im
Zeichnen. Und dort in wenigen grossen Posten:

```
Sektor   3   bemalt 3,57 Bildschirme:  Rectangle 1,86 (7x) · <Ebene> 1,00 · …
Sektor 106   bemalt 5,67 Bildschirme:  Rectangle 1,42 (7x) · <Ebene> 1,00 · e_weaver 0,98 (68x) · …
```

Die Zahlen dieser Zeilen sind mit dem korrigierten Mass ueberholt — siehe
oben. Bemalte Flaeche und Ebenenzahl stehen als Pruefung E in
`npm run sektor`, mit Budget statt Bestmarke.

**Die dritte Geraetemessung (v64) beantwortet sie NICHT.** Sie traegt die
Marke `(im Menue gemessen — bitte IM GEFECHT messen)`: `lage()` gibt
ausserhalb der Spielszene nichts heraus, also fehlen Q, Lage und
Vorraete. Was sie zeigt, ist das MENUE — und dort steht p50 17,0 / p95
24,0 ms bei 15 % Bildern ueber 20 ms. Fuer einen Schirm ohne Gefecht ist
das viel; nachgesehen ist es noch nicht.

**Das Menue selbst ist nachgesehen (v66) — und es war etwas dran.**
Gezaehlt wurden GL-Befehle statt Millisekunden: ihre Zahl ist auf dem
Telefon dieselbe, nur ihr Preis ist ein anderer.

| | Zeichenaufrufe | Pufferwechsel |
|---|---|---|
| Menue (v65) | 8 | **5** |
| Sektor 3 (laufend) | 18 | **1** |
| Menue (v66) | 6 | **1** |

Ein Schirm, auf dem nichts fliegt, brauchte FUENFMAL soviel Zielwechsel wie
ein laufendes Gefecht. Ursache: `preFX.addGlow` auf Ueberschriften, an
sieben Stellen. Alle sieben backen das Leuchten jetzt einmal auf eine
Leinwand (Regel 60). `npm run zeichenwerk` haelt es fest, anteilig gegen
den Sektor gemessen.

Ob damit auch p95 faellt, sagt erst das Geraet — hier sind Millisekunden
nicht messbar.

Ihr auffaelligster Wert taugte gar nicht: laengste Bildluecke 115,0 ms
bei 121,8 s, bei 122,5 s Gesamtlauf — im letzten Prozent des Laufs, also
genau dort, wo aufgeklappt und kopiert wird. Ob das Aufklappen ihn
erzeugt hat, ist HIER nicht zu entscheiden (350 ms je Bild unter
SwiftShader, gemessen: 350 ms ohne Umbau gegen 383 ms mit — im Rauschen).
Seit v65 bucht die Tafel es deshalb selbst getrennt (Regel 59): die Zeile
`Tafel selbst  Umbau Nx, laengster X ms` steht neben den Bildzeiten, und
`laengste` enthaelt diese Bilder nicht mehr. Die naechste Messung sagt es
ohne Vermutung.

**Erledigt:** die Bilddauer war HIER NICHT MESSBAR
  (SwiftShader, rund zwei Bilder je Sekunde). Sie gehoert auf das Geraet,
  `#messung`. Was hier gemessen werden konnte, sind die Objektkosten je
  Gadget: `emp +23 · shield +5 · napalm +1 · drones +24 · repair +28 ·
  blitz +3` Anzeigeobjekte.
- Der Modul-Schirm bleibt auch mit der neuen Tafel unter dem letzten Drittel
  leer, solange nichts erbeutet ist. Das ist ehrlich, aber nicht schoen.
- Die Sprites sind nachgemessen und in Ordnung (33 Texturen, alle ≥ 0,92
  Schaerfe ausser dem erzeugten `spark`-Partikel — der ist Bauart, kein
  Mangel). Hier ist nichts zu holen.
- Das Bildtor kostet auf GitHub rund drei Minuten. Weiter runter ginge nur
  ueber weniger Modi oder weniger Bilder — beides kostet Empfindlichkeit.

---

## Was der Nutzer erwartet

- Deutsch, auch im Quelltext (Kommentare, Bezeichner, Ausgaben) und in
  Commit-Nachrichten.
- **Nach jeder Runde: vier naechste Schritte, sortiert, davon mindestens
  einer technisch und einer grafisch.** Grafik ist ihm wichtig.
- Getestet wird auf dem **iPhone hochkant**, 390 px breit. Das ist das
  Zielgeraet, nicht der Schreibtisch.
- **Der Nutzer sitzt in Cancun, UTC-5 ganzjaehrig (keine Sommerzeit).**
  GitHub-Laeufe und Zeitstempel hier sind UTC. Wer ihm eine Uhrzeit
  nennt, rechnet sie um oder schreibt die Zone dazu — sonst hoert sich
  "um 21:29 fertig" nach heute Nacht an, obwohl es 16:29 bei ihm war.
  Das ist Regel 12 fuer Uhrzeiten: die Zone IST die Messstelle.
- Gepusht wird auf `main`. Die Web-App holt sich die neue Fassung dann in
  ZWEI Starts: der erste holt den neuen Dienst-Arbeiter, der zweite wird
  von ihm bedient. Das ist keine Behauptung mehr, sondern eine Zahl aus
  dem Auslieferungstor (siehe Regel 66).
