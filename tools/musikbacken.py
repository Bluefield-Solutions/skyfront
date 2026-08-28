#!/usr/bin/env python3
"""
Musikbacken — die drei Stuecke fuer Skyfront, gerendert statt gedudelt.

    python3 tools/musikbacken.py [--kurz]

WARUM SELBST GEBAUT und nicht heruntergeladen: diese Umgebung laesst nur
Paketregistries durch, keine Musikseiten (403 vom Gateway). Es waere also
gar nicht moeglich, ein fertiges Stueck zu holen. Und selbst wenn: bei
einem selbst gebauten Stueck ist die Lizenzkette luecken los, die
Schleifenlaenge exakt und die Naht wirklich nahtlos — die drei Sachen, an
denen fertige Stuecke in einer autarken HTML-Datei scheitern.

WAS DAS HIER IST — und was nicht: keine Oszillatoren zur Laufzeit wie bis
v48, sondern drei fertig arrangierte Stuecke, hier gerendert und als MP3
eingebacken. Mit Huellkurven, Filterfahrten, Hall, Sidechain und Aufbau.
Was fehlt, ist Gesang; den kann diese Werkbank nicht.

DER STIL kommt aus der Vorgabe: melodischer House, Kalkbrenner/Koelsch als
Referenz. Uebersetzt heisst das:
  - 122 bis 128 Schlaege, gerader Viervierteltakt
  - Moll, eine tragende Akkordfolge, die sich alle acht Takte dreht
  - ein Arpeggio als Melodietraeger (davon lebt die Sorte Musik)
  - Sidechain: alles ausser der Bassdrum atmet mit ihr. Das ist DAS
    Merkmal des Genres, und ohne es klingt es nach allem anderen.
  - Aufbau: Flaeche, Beat dazu, volle Breite, Break, Wiedereinstieg
"""
import argparse, math, os, struct, sys
import numpy as np

SR = 44100

def env(n, a, d, s, r, sus=1.0):
    """Huellkurve in Sekunden."""
    a, d, r = max(1, int(a*SR)), max(1, int(d*SR)), max(1, int(r*SR))
    s = max(0, n - a - d - r)
    out = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, sus, d),
        np.full(s, sus),
        np.linspace(sus, 0, r),
    ])
    return out[:n] if len(out) >= n else np.pad(out, (0, n-len(out)))

def saege(f, n, detune=0.0):
    t = np.arange(n) / SR
    ph = 2*np.pi*f*t
    y = 2*(ph/(2*np.pi) % 1.0) - 1.0
    if detune:
        ph2 = 2*np.pi*f*(1+detune)*t
        y = 0.5*y + 0.5*(2*(ph2/(2*np.pi) % 1.0) - 1.0)
    return y

def dreieck(f, n):
    t = np.arange(n) / SR
    return 2*np.abs(2*((f*t) % 1.0) - 1) - 1

def sinus(f, n, ph=0.0):
    t = np.arange(n) / SR
    return np.sin(2*np.pi*f*t + ph)

def tiefpass(x, fc, q=0.7):
    """Zustandsvariabler Filter, fc darf ein Feld sein (Filterfahrt)."""
    n = len(x)
    fc = np.asarray(fc, dtype=float)
    if fc.ndim == 0: fc = np.full(n, float(fc))
    f = 2*np.sin(np.pi*np.clip(fc, 20, SR*0.45)/SR)
    d = 1.0/q
    lp = np.zeros(n); bp = 0.0; l = 0.0
    for i in range(n):
        h = x[i] - l - d*bp
        bp += f[i]*h
        l += f[i]*bp
        lp[i] = l
    return lp

def hochpass(x, fc):
    a = math.exp(-2*math.pi*fc/SR)
    y = np.empty_like(x); prev_x = 0.0; prev_y = 0.0
    for i in range(len(x)):
        prev_y = a*(prev_y + x[i] - prev_x); prev_x = x[i]; y[i] = prev_y
    return y

def rauschen(n, seed=0):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(n)

def hall(x, zeit=0.35, rueck=0.34, mix=0.3):
    """Einfacher Kammfilter-Hall — vier Verzoegerungen, unterschiedlich lang."""
    out = x.copy()
    for k, d in enumerate([0.0297, 0.0371, 0.0411, 0.0437]):
        dn = int(d*SR)
        buf = np.zeros(len(x)+dn)
        buf[:len(x)] = x
        y = np.zeros(len(x))
        for i in range(len(x)):
            y[i] = buf[i]
            if i+dn < len(buf): buf[i+dn] += y[i]*rueck
        out = out + mix*y*(0.7**k)
    return out

def echo(x, sek, rueck=0.32, mix=0.28):
    dn = int(sek*SR)
    y = x.copy()
    for k in range(1, 5):
        v = np.zeros_like(x)
        s = dn*k
        if s < len(x): v[s:] = x[:len(x)-s]*(rueck**k)
        y += mix*v
    return y

# ---- Schlagwerk ----------------------------------------------------------
def kick(n=None):
    n = n or int(0.34*SR)
    t = np.arange(n)/SR
    f = 120*np.exp(-t*38) + 44
    y = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*7.5)
    y += rauschen(n, 1)*np.exp(-t*320)*0.30          # Anschlag
    y = np.tanh(y*1.7)*0.92                            # Saettigung
    return y

def clap(n=None):
    n = n or int(0.30*SR)
    t = np.arange(n)/SR
    y = np.zeros(n)
    for k, v in enumerate([0, 0.010, 0.020, 0.031]):   # vier Haende
        s = int(v*SR)
        if s < n:
            e = np.exp(-(t[:n-s])*(52 if k < 3 else 12))
            y[s:] += rauschen(n-s, 2+k)*e*(0.8 if k < 3 else 1.0)
    y = hochpass(y, 780)
    return y*0.5

def hat(offen=False):
    n = int((0.20 if offen else 0.055)*SR)
    t = np.arange(n)/SR
    y = rauschen(n, 7)*np.exp(-t*(16 if offen else 62))
    return hochpass(y, 7200)*0.21

# ---- Musik ---------------------------------------------------------------
def hz(midi): return 440.0*2**((midi-69)/12)

# Die Melodie ist das, was fehlte.
#
# Bis v49 gab es eine Flaeche (Akkorde) und ein Arpeggio (Sechzehntel).
# Beides zusammen klingt nach Bewegung, aber nach nichts, das man
# mitsingen kann — und genau das war die Vorgabe: „gerne auch Gesang, aber
# eben melodisch". Eine getragene Linie in halben und ganzen Noten ist das,
# was einer Gesangsmelodie am naechsten kommt, wenn keine Stimme da ist.
#
# Geschrieben als (Halbton ueber dem Grundton, Laenge in Schlaegen). Null
# Laenge heisst Pause. Acht Takte, dann von vorn.
MELODIE = {
    'a': [(19,2),(17,2), (15,4), (12,2),(15,2), (17,4),
          (19,2),(22,2), (19,4), (17,2),(14,2), (12,4)],
    'b': [(24,4), (22,2),(19,2), (20,4), (19,4),
          (22,2),(24,2), (26,4), (24,2),(22,2), (19,4)],
    # Der Boss singt nicht, er droht: kuerzere Motive, tiefer, mit Pausen.
    'boss': [(12,2),(15,1),(14,1), (12,4), (10,2),(12,2), (7,4),
             (12,2),(17,1),(15,1), (14,4), (12,2),(10,2), (7,4)],
}

STUECKE = {
    # Name        BPM  Takte  Grundton  Akkorde A            Akkorde B
    'menue':   dict(bpm=118, takte=32, grund=57, beat=False,
                    folge=[(0,'m'),(-4,'M'),(3,'M'),(-2,'M')],
                    folgeB=[(3,'M'),(-2,'M'),(0,'m'),(-4,'M')],
                    melodie='a', melodieB='b'),
    'gefecht': dict(bpm=124, takte=48, grund=57, beat=True,
                    folge=[(0,'m'),(-4,'M'),(3,'M'),(-2,'M')],
                    folgeB=[(-4,'M'),(3,'M'),(-2,'M'),(0,'m')],
                    melodie='a', melodieB='b'),
    'boss':    dict(bpm=128, takte=32, grund=50, beat=True,
                    folge=[(0,'m'),(-3,'M'),(-5,'m'),(-1,'M')],
                    folgeB=[(-5,'m'),(-1,'M'),(0,'m'),(-3,'M')],
                    melodie='boss', melodieB='boss'),
}
DREIKLANG = {'m': [0,3,7,10], 'M': [0,4,7,11]}

def bau(name, cfg, kurz=False):
    bpm, takte = cfg['bpm'], (8 if kurz else cfg['takte'])
    schlag = 60.0/bpm
    takt = 4*schlag
    n = int(takte*takt*SR)
    schwanz = int(3.0*SR)               # Hallfahne, wird umgelegt
    N = n + schwanz

    pad = np.zeros(N); arp = np.zeros(N); bass = np.zeros(N)
    drum = np.zeros(N); lead = np.zeros(N); pump = np.ones(N)

    grund = cfg['grund']

    # A oder B? Ein Stueck, das achtundvierzig Takte lang dieselbe
    # Akkordfolge dreht, ist genau das, was mit „Rumgedudel" gemeint war —
    # nur laenger. Der B-Teil dreht dieselben vier Akkorde weiter, das
    # bleibt zusammenhaengend, klingt aber anders herum.
    def teil(t):
        q = t/takte
        return 'b' if (0.33 <= q < 0.44) or (0.62 <= q < 0.79) else 'a'

    # Und wer singt wann? Nicht durchgehend — eine Melodie, die nie
    # aussetzt, hoert man nach zwei Runden nicht mehr.
    def singt(t):
        q = t/takte
        if not cfg['beat']: return q >= 0.25
        return 0.16 <= q < 0.44 or 0.52 <= q < 0.62 or q >= 0.70

    # --- Aufbau: welcher Takt traegt was? --------------------------------
    def dichte(t):
        """0 = nur Flaeche, 1 = alles."""
        if not cfg['beat']: return 0.0
        q = t/takte
        # KEIN Intro. Ein Stueck, das leise anfaengt und laut aufhoert, hat
        # bei jedem Umlauf eine Stufe — gemessen 2,1 dB beim Gefecht, und
        # eine Stufe hoert man auch dann, wenn kein Knacks drin ist.
        # Anfang und Ende tragen deshalb dieselbe Dichte; der Atem kommt
        # aus dem Break in der Mitte. Man steigt hier ohnehin mittendrin
        # ein, nicht am Anfang eines Konzerts.
        if 0.44 <= q < 0.52: return 0.2   # Break
        if 0.52 <= q < 0.60: return 0.5   # Wiedereinstieg
        return 1.0

    for t in range(takte):
        t0 = int(t*takt*SR)
        folge = cfg['folge'] if teil(t) == 'a' else cfg['folgeB']
        akk_ver, akk_art = folge[(t//2) % len(folge)]
        wurzel = grund + akk_ver
        toene = [wurzel + i for i in DREIKLANG[akk_art]]
        d = dichte(t)

        # Flaeche: breiter Akkord, langsam geoeffnet
        ln = int(takt*SR)
        e = env(ln, 0.45, 0.5, 0, 0.9, sus=0.75)
        # Die Flaeche tritt im B-Teil zurueck. Abwechslung entsteht in
        # dieser Musik nicht dadurch, dass mehr passiert, sondern dadurch,
        # dass etwas WEGGELASSEN wird — und dann wiederkommt.
        e = e * (1.0 if teil(t) == 'a' else 0.45)
        for i, m in enumerate(toene):
            f = hz(m + (12 if i == 3 else 0))
            v = saege(f, ln, detune=0.004*(1 + i*0.3))*0.10
            v += saege(f*0.5, ln, detune=0.003)*0.06
            pad[t0:t0+ln] += v*e
        # Filterfahrt ueber das ganze Stueck
        # (wird unten in einem Rutsch gemacht, hier nur sammeln)

        # Arpeggio — der Melodietraeger. 16tel, Auf und Ab durch den Akkord.
        # Zwei Muster, eines je Teil. Dasselbe Arpeggio ueber ein ganzes
        # Stueck ist eine Textur, kein Verlauf.
        if name == 'boss':
            muster = [0,2,1,3,2,4,3,5, 0,2,1,3,2,4,3,2] if teil(t) == 'a' else [0,3,2,4,3,5,4,2, 1,3,2,4,3,2,1,0]
        else:
            muster = [0,1,2,3,2,1,2,3, 0,1,2,3,4,3,2,1] if teil(t) == 'a' else [3,2,1,0,1,2,3,4, 2,3,4,3,2,1,2,3]
        for s in range(16):
            sn = int((t*takt + s*schlag/4)*SR)
            grad = muster[s % len(muster)]
            m = toene[grad % len(toene)] + 12*(1 + grad//len(toene))
            an = int(schlag/4*SR*2.4)
            if sn+an >= N: continue
            amp = 0.21 if cfg['beat'] else 0.16
            if d < 0.4: amp *= 0.8
            # Wo die Melodie steht, macht das Arpeggio ihr Platz. Zwei
            # Stimmen im selben Register kaempfen, und gewinnen tut keine.
            if singt(t): amp *= 0.62
            y = dreieck(hz(m), an)*0.7 + saege(hz(m), an, 0.006)*0.3
            arp[sn:sn+an] += y*env(an, 0.004, 0.06, 0, 0.20, sus=0.35)*amp

        # Bass: Grundton auf 1, Offbeat-Achtel dazwischen — House.
        if d >= 0.4:
            for s in range(8):
                if s % 2 == 0 and s != 0: continue
                sn = int((t*takt + s*schlag/2)*SR)
                an = int(schlag/2*SR*0.92)
                if sn+an >= N: continue
                m = wurzel - 12
                y = saege(hz(m), an, 0.002)*0.5 + sinus(hz(m), an)*0.5
                bass[sn:sn+an] += y*env(an, 0.006, 0.05, 0, 0.10, sus=0.8)*0.34

        # Die Melodie. Sie laeuft ueber acht Takte und richtet sich NICHT
        # nach dem Akkord unter ihr — sie ist die Linie, der Akkord ist die
        # Farbe. Portamento zwischen den Toenen: der Uebergang wird
        # gezogen, nicht gesprungen. Das ist es, was eine Synthesizerlinie
        # nach Stimme klingen laesst.
        if singt(t):
            mel = MELODIE[cfg['melodie'] if teil(t) == 'a' else cfg['melodieB']]
            # Wo im Achttakter stehen wir? Die Melodie ist in Schlaegen
            # notiert, also aufsummieren, bis der Takt erreicht ist.
            pos, i = 0.0, 0
            ziel = (t % 8)*4
            while pos < ziel + 4 and i < len(mel)*4:
                ton, dauer = mel[i % len(mel)]
                if pos + dauer > ziel and pos < ziel + 4:
                    sn = int((t*takt + (pos - ziel)*schlag)*SR)
                    if sn < t0: sn = t0
                    an = int(dauer*schlag*SR*0.94)
                    if 0 <= sn and sn+an < N:
                        f0 = hz(grund + ton + 12)
                        # Vorheriger Ton fuer das Portamento
                        vton = mel[(i-1) % len(mel)][0]
                        fv = hz(grund + vton + 12)
                        gl = int(min(an*0.18, 0.055*SR))
                        ff = np.concatenate([np.geomspace(fv, f0, gl), np.full(an-gl, f0)]) if gl > 1 else np.full(an, f0)
                        # Vibrato ab der Haelfte des Tons
                        vib = 1 + 0.006*np.sin(2*np.pi*5.2*np.arange(an)/SR)*np.clip(np.linspace(-0.6, 1, an), 0, 1)
                        ph = 2*np.pi*np.cumsum(ff*vib)/SR
                        y = (2*((ph/(2*np.pi)) % 1.0) - 1)*0.55 + np.sin(ph)*0.45
                        ph2 = 2*np.pi*np.cumsum(ff*vib*1.004)/SR
                        y = 0.6*y + 0.4*(2*((ph2/(2*np.pi)) % 1.0) - 1)
                        amp = 0.20 if cfg['beat'] else 0.15
                        lead[sn:sn+an] += y*env(an, 0.03, 0.12, 0, 0.22, sus=0.78)*amp
                pos += dauer; i += 1
                if i > 64: break

        # Schlagwerk
        if d >= 0.4:
            for s in range(4):
                sn = int((t*takt + s*schlag)*SR)
                k = kick()
                if sn+len(k) < N: drum[sn:sn+len(k)] += k*0.95
                # Sidechain-Kurve: bei jedem Kick runter, dann atmen
                an = int(schlag*SR)
                if sn+an < N:
                    kurve = 0.22 + 0.78*(1-np.exp(-np.linspace(0, 4.2, an)))
                    pump[sn:sn+an] = np.minimum(pump[sn:sn+an], kurve)
            if d >= 0.9:
                for s in [1, 3]:
                    sn = int((t*takt + s*schlag)*SR)
                    c = clap()
                    if sn+len(c) < N: drum[sn:sn+len(c)] += c*0.55
                for s in range(8):
                    if s % 2 == 0: continue
                    sn = int((t*takt + s*schlag/2)*SR)
                    h = hat(offen=(s == 7))
                    if sn+len(h) < N: drum[sn:sn+len(h)] += h
        elif d > 0:
            for s in [0, 2]:
                sn = int((t*takt + s*schlag)*SR)
                k = kick()
                if sn+len(k) < N: drum[sn:sn+len(k)] += k*0.7
                an = int(schlag*SR)
                if sn+an < N:
                    kurve = 0.35 + 0.65*(1-np.exp(-np.linspace(0, 4.2, an)))
                    pump[sn:sn+an] = np.minimum(pump[sn:sn+an], kurve)

    # Filterfahrt ueber die Flaeche: zu, auf, zu — das ist der Atem.
    q = np.linspace(0, 1, N)
    fc = 380 + 2600*(0.5 - 0.5*np.cos(2*np.pi*np.clip(q, 0, 1)*2))
    pad = tiefpass(pad, fc, q=0.9)
    # Das Arpeggio traegt die Melodie — es darf nicht ins Zischeln
    # ausweichen. Der Tiefpass macht deshalb nur bis 3,5 kHz auf.
    #
    # Und er faehrt IM KREIS, wie die Flaeche. Der erste Entwurf oeffnete
    # ihn linear ueber das ganze Stueck (800 Hz bis 4 kHz): am Ende stand
    # das Arpeggio hell und offen, am Anfang dumpf, und der Umlauf hatte
    # eine Stufe von 17 dB. Bei acht Takten Probe fiel das nicht auf, bei
    # dreiundneunzig Sekunden sofort — jede Fahrt in einem Loop muss dort
    # enden, wo sie anfaengt.
    arp = tiefpass(arp, 900 + 2600*(0.5 - 0.5*np.cos(2*np.pi*q*3)), q=1.1)
    bass = tiefpass(bass, 220 + 180*np.sin(2*np.pi*q*3), q=1.4)

    # Die Melodie bekommt einen weichen Tiefpass, der im Kreis faehrt —
    # offener im Refrain, geschlossener drumherum.
    lead = tiefpass(lead, 1400 + 1500*(0.5 - 0.5*np.cos(2*np.pi*q*2)), q=1.3)

    # Raum
    lead = echo(lead, schlag*1.5, 0.26, 0.22)
    lead = hall(lead, mix=0.26)
    arp = echo(arp, schlag*0.75, 0.30, 0.26)
    pad = hall(pad, mix=0.34)
    arp = hall(arp, mix=0.20)

    # Sidechain auf alles ausser dem Schlagwerk
    # Das Arpeggio tritt zurueck, wo die Melodie steht — zwei Stimmen im
    # selben Register kaempfen, und gewinnen tut keine.
    misch = (pad*0.82 + arp*0.86 + lead*1.15 + bass*1.0)*pump + drum

    # Stereo: Flaeche und Arpeggio leicht auseinander
    li = misch + 0.10*np.roll(pad, 320) + 0.06*np.roll(arp, -210)
    re = misch + 0.10*np.roll(pad, -320) + 0.06*np.roll(arp, 210)

    # Hallfahne umlegen: was nach dem Ende klingt, gehoert an den Anfang.
    # Genau das macht die Naht unhoerbar.
    for kanal in (li, re):
        kanal[:schwanz] += kanal[n:n+schwanz]
    li, re = li[:n], re[:n]

    # Ein- und Ausblende: VIER MILLISEKUNDEN, nicht ein Sechzehntel.
    #
    # Der erste Entwurf blendete ueber eine Sechzehntelnote ein und aus —
    # bei 124 Schlaegen sind das 121 ms. Beide Enden gingen damit auf null,
    # und genau das hoert man bei jedem Umlauf als Loch. Auf dem Bild in
    # art/bogen/ war es als Einschnuerung am Rand zu sehen.
    #
    # Noetig sind nur die paar Millisekunden, die einen Knacks verhindern.
    # Den Rest der Naht macht die umgelegte Hallfahne unhoerbar.
    ra = int(0.004*SR)
    ramp = np.linspace(0, 1, ra)
    for kanal in (li, re):
        kanal[:ra] *= ramp; kanal[-ra:] *= ramp[::-1]

    # Die Einzelspuren mitgeben. tools/musikschau.py misst die Abwechslung
    # auf der MELODISCHEN Mischung, ohne Schlagwerk — sonst misst es den
    # Puls, und der soll gleich bleiben.
    bau.spuren = dict(pad=pad, arp=arp, bass=bass, drum=drum, lead=lead)

    st = np.stack([li, re], axis=1)
    # Pegel: Spitze auf -1 dB, dann weiche Begrenzung
    st = np.tanh(st*1.15)
    st = st/np.max(np.abs(st))*0.891
    return st, bpm, takte*takt

def schreibe_mp3(pfad, st, bitrate=112):
    import lameenc
    e = lameenc.Encoder()
    e.set_bit_rate(bitrate); e.set_in_sample_rate(SR); e.set_channels(2)
    e.set_quality(2)
    pcm = (np.clip(st, -1, 1)*32767).astype('<i2').tobytes()
    daten = e.encode(pcm) + e.flush()
    with open(pfad, 'wb') as f: f.write(daten)
    return len(daten)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--kurz', action='store_true', help='acht Takte je Stueck, zum Ausprobieren')
    p.add_argument('--ziel', default='art/musik')
    a = p.parse_args()
    os.makedirs(a.ziel, exist_ok=True)
    print(f"Musikbacken — {'kurz' if a.kurz else 'voll'}\n")
    print("  Stueck     BPM   Laenge     Datei      kbit/s")
    for name, cfg in STUECKE.items():
        st, bpm, sek = bau(name, cfg, a.kurz)
        pfad = os.path.join(a.ziel, f"{name}.mp3")
        gr = schreibe_mp3(pfad, st)
        print(f"  {name:<10} {bpm:>3}   {sek:6.1f} s   {gr/1024:7.0f} KB   {gr*8/sek/1000:5.0f}")
    print(f"\n  geschrieben nach {a.ziel}/")

if __name__ == '__main__':
    main()
