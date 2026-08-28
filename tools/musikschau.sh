#!/bin/sh
# Die drei Stuecke messen und zeichnen. Kein Tor — es rendert neu und
# braucht dafuer Minuten. Die Bilder landen in art/bogen/musik-*.png.
exec python3 - "$@" <<'PY'
import importlib.util, numpy as np, sys
def lade(n,p):
    sp=importlib.util.spec_from_file_location(n,p); m=importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
mb=lade('mb','tools/musikbacken.py'); ms=lade('ms','tools/musikschau.py')
print("Musikschau — die drei Stuecke\n")
print(f"{'Stueck':<10} {'s':>6} {'Crest':>6} {'Pumpen':>7} {'Abwechslung':>12} {'Melodie':>8} {'Knacks':>7} {'Stufe dB':>9}")
for name, cfg in mb.STUECKE.items():
    st,bpm,sek = mb.bau(name,cfg)
    sp_ = mb.bau.spuren
    mel = sp_['pad']+sp_['arp']+sp_['bass']+sp_['lead']
    m = ms.messe(st,sek,name,melodisch=mel[:len(st)])
    ges = np.sqrt(np.mean((mel+sp_['drum'])**2)); rl = np.sqrt(np.mean(sp_['lead']**2))
    ms.bild(st,name,f'art/bogen/musik-{name}.png',sek)
    print(f"{name:<10} {sek:6.1f} {m['crest']:6.1f} {m['pump']:7.2f} {m['abwechslung']:12.3f} {rl/ges*100:7.1f}% {m['naht']:7.4f} {m['stufe']:9.1f}")
print("\n  Bilder in art/bogen/musik-*.png")
PY
