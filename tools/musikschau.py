#!/usr/bin/env python3
"""
Musikschau — die drei Stuecke ansehen und nachmessen.

    python3 tools/musikschau.py

WOZU: „Kein Tor ersetzt den Blick." Hier kann kein Ohr hoeren, also wird
das Stueck GEZEIGT: Wellenform, Lautheitsverlauf und Frequenzband ueber
die Zeit. Auf so einem Bild sieht man das meiste von dem, was ein Ohr
hoeren wuerde:

  - das Sidechain-Pumpen als regelmaessiges Saegezahnmuster
  - den Aufbau (Intro, Beat, Break, Wiedereinstieg) als Stufen
  - eine tote Frequenz (kein Bass, keine Hoehen) als leeres Band
  - eine schlechte Naht als Sprung zwischen Ende und Anfang
"""
import sys, math
import numpy as np
from PIL import Image

SR = 44100

def lies_mp3(pfad):
    """MP3 ueber lameenc gibt es nicht zum Dekodieren — also die Rohspur
    aus musikbacken neu bauen waere Unsinn. Stattdessen: das Werkzeug
    bekommt die PCM-Daten direkt vom Backen (siehe --wav)."""
    raise SystemExit('bitte tools/musikbacken.py --wav benutzen')

def bild(st, name, pfad, sek):
    B, H = 1100, 300
    im = Image.new('RGB', (B, H), (16, 21, 28))
    px = im.load()
    n = len(st)
    mono = st.mean(axis=1)

    # 1. Wellenform (oben, 150 px)
    schritt = max(1, n // B)
    for x in range(B):
        a = x*schritt; b = min(n, a+schritt)
        if a >= n: break
        lo, hi = mono[a:b].min(), mono[a:b].max()
        y0 = int(75 - hi*70); y1 = int(75 - lo*70)
        for y in range(max(0, y0), min(150, y1+1)):
            px[x, y] = (120, 200, 255)

    # 2. Lautheit in 50-ms-Fenstern (Mitte, 60 px) — hier sieht man das Pumpen
    f = int(0.012*SR)
    for x in range(B):
        a = x*schritt
        if a+f >= n: break
        r = float(np.sqrt(np.mean(mono[a:a+f]**2)))
        h = int(min(58, r*260))
        for y in range(158+58-h, 158+58):
            px[x, y] = (255, 190, 90)

    # 3. Frequenzband (unten, 70 px): tief / mittel / hoch
    fen = 2048
    for x in range(B):
        a = x*schritt
        if a+fen >= n: break
        sp = np.abs(np.fft.rfft(mono[a:a+fen]*np.hanning(fen)))
        hzs = np.fft.rfftfreq(fen, 1/SR)
        baender = [(20,180),(180,1200),(1200,16000)]
        for i,(lo,hi) in enumerate(baender):
            m = (hzs>=lo)&(hzs<hi)
            e = float(sp[m].mean()) if m.any() else 0.0
            v = int(min(255, e*120))
            for y in range(226+i*22, 226+i*22+20):
                px[x, y] = (v, int(v*0.55), int(v*0.3)) if i==0 else ((int(v*0.4), v, int(v*0.8)) if i==1 else (int(v*0.7), int(v*0.8), v))
    im.save(pfad)

def messe(st, sek, name):
    mono = st.mean(axis=1)
    rms = float(np.sqrt(np.mean(mono**2)))
    spitze = float(np.max(np.abs(mono)))
    crest = 20*math.log10(spitze/max(1e-9, rms))
    # Pumpen: Schwankung der Kurzzeit-Lautheit
    f = int(0.012*SR)
    r = np.array([np.sqrt(np.mean(mono[i:i+f]**2)) for i in range(0, len(mono)-f, f)])
    pump = float(np.std(r)/max(1e-9, np.mean(r)))
    # Die Naht — und dieses Mass ist der zweite Anlauf.
    #
    # Der erste verglich die letzten 0,2 s mit den ersten und nahm den
    # Abstand. Das belohnt STILLE an den Raendern: ein Stueck, das aus- und
    # wieder einblendet, bekam die beste Note — und genau dieses Loch hoert
    # man bei jedem Umlauf. Gemessen wurde die Aehnlichkeit zweier
    # Wellenformen, gemeint war die Unhoerbarkeit des Uebergangs.
    #
    # Ein Umlauf faellt aus zwei Gruenden auf:
    #   Knacks         der letzte Abtastwert springt zum ersten
    #   Lautheitsstufe der Pegel vor und nach der Naht ist verschieden
    # EINE SEKUNDE Fenster, nicht ein Zehntel — dritter Anlauf.
    #
    # Mit 0,1 s meldete das Mass 17 dB Stufe fuer ein Stueck, dessen
    # Uebergang in Ordnung ist. Nachgesehen: die ersten 100 ms tragen den
    # Kick auf der Eins (RMS 0,50), die letzten 100 ms liegen im tiefsten
    # Punkt der Sidechain-Senke davor (RMS 0,07). Beides ist genau so
    # gewollt — bei House laeuft die Senke in den Kick, das IST der
    # Uebergang. Verglichen wurden zwei Stellen, die im Takt an
    # verschiedenen Punkten liegen.
    #
    # Ueber eine Sekunde gemittelt (zwei Schlaege bei 124) faellt der
    # Zyklus heraus und uebrig bleibt, was gemeint war: der Pegel vor und
    # nach der Naht. Aus 17 dB werden 0,5.
    k = int(1.0*SR)
    knacks = float(abs(mono[-1] - mono[0]))
    r_ende = float(np.sqrt(np.mean(mono[-k:]**2)))
    r_anfang = float(np.sqrt(np.mean(mono[:k]**2)))
    stufe = float(abs(20*math.log10(max(1e-6, r_ende)/max(1e-6, r_anfang))))
    naht = knacks
    # Frequenzverteilung
    sp = np.abs(np.fft.rfft(mono[:min(len(mono), SR*8)]))
    hzs = np.fft.rfftfreq(min(len(mono), SR*8), 1/SR)
    def band(lo, hi):
        m = (hzs>=lo)&(hzs<hi); return float(sp[m].sum())
    ges = band(20, 20000) or 1.0
    return dict(name=name, sek=sek, rms=rms, spitze=spitze, crest=crest, pump=pump, naht=naht, stufe=stufe,
                tief=band(20,180)/ges, mitte=band(180,1200)/ges, hoch=band(1200,16000)/ges)
