# Altercast promo video

`altercast-promo.mp4` — 50 s, 1920×1080, 30 fps, H.264 + AAC, −14 LUFS (YouTube / store ready).

Everything is original: the animation is `promo.html` (brand artwork, drawn pitch — no footage),
the music is synthesized in `mix.py`, the narration is the app's built-in "Coach" voice and the
before/after demo is the synthetic test match (original line) and the app's "Hype Host" voice.

Rebuild:
1. Narration/demo audio: `POST /api/voices/<voice>/say` for each line (see `mix.py` docstring).
2. `node promo/render.js <frames dir> 30 50` → 1500 JPEG frames.
3. `python promo/mix.py <audio dir> mix.wav`
4. `ffmpeg -framerate 30 -i <frames>/f%05d.jpg -i mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -af loudnorm=I=-14:TP=-1.5 -shortest altercast-promo.mp4`
