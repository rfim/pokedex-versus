# Pokémon Lakehouse

Compare up to four Pokémon side by side, and browse trainers with maxed-out teams and secret bosses.

**Live site:** https://rfim.github.io/pokedex-versus/

## Features

- **Compare up to 4**: one slot each for Red, Blue, Yellow and Green, with search by name or Pokédex number, quick picks, Random 4, and a shareable link (`?p=6,445,…`).
- **Stats**: radar chart and bars, toggling between base stats and max stats at Lv. 50 or Lv. 100.
- **Speed race**: who moves first.
- **Matchups**: damage taken from all 18 types, plus a head-to-head grid of STAB attacks.
- **Size line-up**: artwork scaled to real height plus weight bars.
- **Profile, training & breeding**: catch rate with the odds per Poké Ball, base EXP, friendship, growth rate, egg groups and cycles, gender ratio, habitat.
- **Abilities**, **evolution families** you can click through, and the **latest Pokédex entries**.
- **Fun facts**: records worked out live across the whole dex (highest stats, heaviest, tallest), comparisons, breeding compatibility and type mismatches, hand-picked trivia, and which trainers use each Pokémon.
- **Trainers**: about 150 Gym Leaders, Elite Four, Champions, rivals, villains and every main-series protagonist (plus Ash). Each card shows:
  - a six-Pokémon team of fully evolved Pokémon. Pikachu stays as is, and dashed slots are filler picks matching the trainer's speciality and era.
  - their team's total stats at Lv. 200 with everything maxed.
- **Starters**: every starter, plus the Hisuian forms, is given to a different player in its Mega, Gigantamax or Tera form.
- **Special recruits**: every mythical, Ultra Beast, Paradox and non-box legendary joins at least one team, matched to a trainer of its type and era where possible.
- **Team rule**: exactly one power-up per team. A team with no Mega, Gigantamax, legendary, mythical, Paradox or Ultra Beast powers up its ace: Mega if it can, otherwise Gigantamax, otherwise Tera into the trainer's speciality type. Never more than one Mega, Gigantamax, Paradox, legendary, mythical, Ultra Beast or other powered-up form per team. Box and super legendaries (Arceus, Mewtwo, Hoopa and the like) join as a seventh "secret boss" in their strongest form (Primal, Origin, Ultra, Unbound, Crowned, Mega).
- **Power-up hints**: badges for Mega, Gigantamax and Tera, and a panel with the forms and suggested Tera types for attack and defence. Tera is open to every generation, unless the Pokémon has a Mega or Gigantamax form, or is legendary, Paradox or an Ultra Beast. Mythicals qualify if their base stat total is 600 or less. Paldea aces show their canonical Tera type.
- **Lv. 200 max mode**: for fun, every stat at full potential (31 IVs, 252 EVs, boosting nature) at Lv. 200, so you can face your Legends: Z-A rival.

## Mobile apps

- **Install from the browser (Android, iPhone, desktop):** open the live site and tap **Install app**. On iPhone, tap Share, then **Add to Home Screen**. It runs full-screen with a bottom tab bar, and once opened it works offline (service worker in `sw.js`).
- **Android APK:** every push to `main` runs `.github/workflows/android.yml`. It wraps the site with [Capacitor](https://capacitorjs.com) and publishes `pokemon-lakehouse.apk` to the [android-latest release](https://github.com/rfim/pokedex-versus/releases/tag/android-latest). Download it on your phone and open it to install.
- **Build it yourself:** `npm install`, `npm run build:www`, `npx cap add android`, `npx cap open android`. This needs Android Studio. For iOS use `npx cap add ios`, which needs a Mac with Xcode.

## Data: the lakehouse

The app's data comes from a small **medallion pipeline** in `pipeline/` (Python stdlib only). It's the starting point for a bigger data engineering project.

```
PokéAPI CSVs ──► bronze ──────────────► silver ─────────────────► gold
                 lake/bronze/pokeapi/   lake/silver/*.jsonl        data/dex.json
                 raw tables + manifest  pokemon, species,          compact file the
                 (22 tables)            abilities, type_efficacy   web + mobile apps read
```

```sh
python3 pipeline/run.py            # full refresh: download → clean → publish
python3 pipeline/run.py --offline  # rebuild silver + gold from existing bronze files
```

- **Bronze** (`bronze_ingest.py`): lands the raw PokéAPI tables unchanged, with an ingestion manifest of row counts and a timestamp.
- **Silver** (`silver_transform.py`): typed, English-only tables. That means one row per battle-relevant form, with types, stats, abilities, Mega/Gigantamax flags, species facts, the latest Pokédex entry, the evolution method, and whether it's in Scarlet & Violet and Legends: Z-A.
- **Gold** (`gold_publish.py`): the compact `data/dex.json` the site serves.
- **Seed data**: trainer teams and secret bosses are curated by hand in `data/trainers.js`. Team rules (power-ups, recruits, starters) are applied in the app.

`lake/` is generated and git-ignored. Coverage is Gen I–IX: 1,025 species plus Mega, regional and Gigantamax forms, including the Legends: Z-A Megas.

### Roadmap ideas

- Store silver and gold as **Parquet / Delta / Iceberg** tables and query them with DuckDB or Spark.
- **Orchestrate** with Airflow, Dagster or a scheduled GitHub Action, with incremental loads driven by the bronze manifest.
- **Data contracts and tests**: schema checks, row-count expectations and uniqueness on `pokemon_id`, for example with Great Expectations or dbt tests.
- **dbt models** for gold marts: team power, type coverage, matchup matrices.
- Move the **team rules** (one power-up, starters per player, recruits) into gold tables, so the app only renders them.
- Add more sources: moves and learnsets, competitive usage stats, encounter locations.

## Run locally

```sh
npx serve .        # or: python3 -m http.server
```

It's a static site with no build step. Fan project, not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company.
