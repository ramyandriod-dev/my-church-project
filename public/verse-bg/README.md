# Verse background images

Background photography for the member PWA **Verse of the Day** hero.

## Expected input

- **50 files** — JPEG (`.jpg` / `.jpeg`), also accepted: `.webp`, `.png`, `.avif`
- Landscape, ideally **16:9** or **3:2** (a few portrait crops are tolerated;
  they are displayed through `object-cover`, so only the center survives)
- Target: **≤1600 px** on the longest side, **~100–200 KB** each, JPEG q60–75

The shipped set was normalized with macOS `sips`:

```sh
sips -Z 1600 --setProperty format jpeg --setProperty formatOptions 60 \
  "./in.jpg" --out "./out.jpg"
```

`-Z` resamples the longest side and *upscales* smaller images, so only pass it
when a dimension actually exceeds 1600. Prefix names with `./` — several files
begin with `-` and would otherwise be parsed as flags.

Subjects that read well behind white scripture text: sunrises and sunsets,
light through a window, open fields, paths and roads, mountains, sky and
clouds, still water, candle light, doors and architecture, olive branches,
wheat.

## How they are used

`scripts/build-verses.mjs` enumerates this directory at build time and writes
the sorted list into `src/data/verses.ts` as `VERSE_IMAGES`. The browser cannot
glob the filesystem, so the manifest must be regenerated whenever files are
added, removed or renamed:

```sh
node scripts/build-verses.mjs
```

`src/lib/verses/rotation.ts` picks one per local calendar day
(`imageIndexOf` = days-since-epoch mod image count), so every user sees the
same background for a given date. The verse cycle (148 days) and the image
cycle (50 days) are different lengths, so a verse/background pair repeats only
every 3,700 days.

If this folder is empty, the hero falls back to its built-in navy gradient —
no network request is issued.

## Attribution

Photos in this folder are expected to be licensed for this use (church-owned
photography or royalty-free stock). Keep the source records outside the repo if
your license requires it. Nothing here ships in a location where attribution
text would be required by the verse translation — Lockman attribution, when the
Amplified Bible is selected, is rendered separately in the hero itself.
