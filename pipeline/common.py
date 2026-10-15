"""Shared paths and helpers for the Pokémon Lakehouse pipeline (stdlib only)."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAKE = ROOT / "lake"
BRONZE = LAKE / "bronze" / "pokeapi"
SILVER = LAKE / "silver"
GOLD_DEX = ROOT / "data" / "dex.json"

SOURCE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
TABLES = [
    "pokemon", "pokemon_stats", "pokemon_types", "pokemon_species", "pokemon_species_names",
    "pokemon_species_flavor_text", "pokemon_abilities", "ability_names", "ability_flavor_text",
    "types", "type_efficacy", "pokemon_egg_groups", "egg_groups", "pokemon_colors",
    "pokemon_habitats", "pokemon_shapes", "growth_rates", "pokemon_evolution",
    "evolution_triggers", "pokemon_forms", "pokemon_form_names", "pokemon_dex_numbers",
]
ENGLISH = "9"


def read_bronze(name):
    with open(BRONZE / f"{name}.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_silver(name, rows):
    SILVER.mkdir(parents=True, exist_ok=True)
    with open(SILVER / f"{name}.jsonl", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(rows)


def read_silver(name):
    with open(SILVER / f"{name}.jsonl", encoding="utf-8") as f:
        return [json.loads(line) for line in f]
