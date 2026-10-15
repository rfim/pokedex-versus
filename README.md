# Pokédex Versus

Compare up to four Pokémon side by side, and browse trainers with their Pokémon Masters EX sync pairs.

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
- **Trainers & Masters EX**: about 130 Gym Leaders, Elite Four, Champions, rivals, villains and Pasio originals, with signature teams and Masters EX sync partners. "Compare team" sends four of a trainer's Pokémon to the compare view.

## Data

`data/dex.json` is built from the [PokéAPI](https://github.com/PokeAPI/pokeapi) CSV dataset. It covers Gen I–IX: all 1,025 species plus Mega, regional and other battle forms, including the Legends: Z-A Megas. Artwork loads from the PokéAPI sprites repository.

Trainer and Masters EX data is curated by hand in `data/trainers.js`.

## Run locally

```sh
npx serve .        # or: python3 -m http.server
```

It's a static site with no build step. Fan project, not affiliated with Nintendo, Creatures, GAME FREAK or The Pokémon Company.
