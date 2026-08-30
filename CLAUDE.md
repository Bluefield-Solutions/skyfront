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
npm run schirme    zehn Schirme nachmessen: Rand, Ueberlappung, Schriftgroesse
npm run ueberlappung  acht MENUEschirme: deckt etwas etwas anderes zu?
npm run kopfzeile  dasselbe im GEFECHT, ohne und mit Boss
npm run symbol     App-Symbol + 11 iOS-Startbilder aus web/icon.svg backen
npm run bilder     WebP-Bahnen neu codieren (q78)
npm run variants   alle Profile + Launcher
npm run package    verteilbares Skyfront-dist.zip
```

Die Torkette: `build` → `build-variants --boot` (elf Dateien) → `bildtor` →
`farbtor` → `formen` → `untergrund` → `feuerkraft` → `speicher` → `rhythmus`
→ `ueberlappung` → `kopfzeile` → `auslieferung` → Boot-Test des Masters →
`dist/check-report.md`.

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
   aus dem man nicht herauskommt.** Das Tor hiess „Niederlage" und hat
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

**Offen — aus der Rueckmeldung des Nutzers zu v56, drei von fuenf Punkten:**
- Gekaufte Drohnen und Beiflugschiffe: die Mechanik STIMMT (nachgemessen:
  „Beiflug 2 von 2 feuernd", drei Drohnen, Geschosse fliegen). Was fehlt,
  ist das Zeichen, dass sie aktiv sind — beide Beiflugschiffe werden
  IMMER gezeichnet, das ungekaufte nur mit `setScale(.24)` statt `.32`
  und grauem Ton. Auf dem Telefon ist der Unterschied unsichtbar.
- Neu gekaufte Spezialwaffen wirken (Waffe, Sekundaerwaffe und Gadget
  werden gesetzt und feuern), zeigen es aber nicht an.
- Die Bilddauer beim Ausloesen einer Spezialwaffe ist HIER NICHT MESSBAR
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
- Gepusht wird auf `main`; die Web-App aktualisiert sich danach von selbst.
