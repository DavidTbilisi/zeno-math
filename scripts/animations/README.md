# Short explanations

The first pilot is a roughly 28-second, silent Manim Community animation of
`1/2 = 2/4 = 4/8`. English teaching text is part of the animation; a separate
WebVTT caption track and an HTML transcript accompany it.

Render from the repository root (Podman or Docker):

```sh
podman run --rm --userns=keep-id --user 0:0 \
  -v "$PWD/scripts/animations:/work:ro,Z" \
  -v "$PWD/public/explanations:/output:Z" \
  docker.io/manimcommunity/manim:stable \
  manim -qm --media_dir /output/render /work/equivalent_fractions.py EquivalentFractions
ffmpeg -y -i public/explanations/render/videos/equivalent_fractions/720p30/EquivalentFractions.mp4 \
  -c copy -movflags +faststart public/explanations/equivalent-fractions.mp4
```

Alternatively, use a local Manim installation with the same scene and output flags.
Open `/explanations/` on the Vite dev server to review the player, captions,
transcript and practice question. Nothing autoplays. The pilot is a standalone
preview; it is not yet connected to the fraction tools or practice flow.

Generated render intermediates are ignored. Keep the final MP4 with the player.

## Practical trigonometry

`trigonometry.py PracticalTrig` renders the 40-second ladder example. Use the
same command above, replacing the source and scene names. Copy the result from
`render/videos/trigonometry/720p30/PracticalTrig.mp4` to `trigonometry.mp4` with
the same faststart command. Preview at `/explanations/trigonometry.html`.
The angle is rounded from a 3–4–5 triangle to 37°; numerical results are
calculated using 37° and shown as approximations. No narration is included.
