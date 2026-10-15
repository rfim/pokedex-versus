"""Gold: the compact data/dex.json the web and mobile apps read."""
import json

from common import GOLD_DEX, read_silver

STAT_KEYS = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"]
TYPE_ORDER = ["normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel",
              "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark", "fairy"]


def main():
    pokemon = read_silver("pokemon")
    species = read_silver("species")
    abilities = {a["ability_id"]: a for a in read_silver("abilities")}
    used = {a["ability_id"] for p in pokemon for a in p["abilities"]}
    dex = {
        "pokemon": [{
            "id": p["pokemon_id"], "s": p["species_id"], "n": p["name"], "d": p["is_default"], "t": p["types"],
            "st": [p["stats"][k] for k in STAT_KEYS], "h": p["height_dm"], "w": p["weight_hg"], "x": p["base_experience"],
            "a": [[a["ability_id"], int(a["is_hidden"])] for a in p["abilities"]], "mega": p["is_mega"],
        } for p in pokemon],
        "species": {str(s["species_id"]): {
            "g": s["genus"], "gen": s["generation"], "ch": s["evolution_chain_id"], "c": s["color"], "sh": s["shape"],
            "hb": s["habitat"], "gr": s["gender_rate"], "cr": s["capture_rate"], "hp": s["base_happiness"], "baby": s["is_baby"],
            "hc": s["hatch_counter"], "leg": s["is_legendary"], "myth": s["is_mythical"], "grw": s["growth_rate"],
            "eg": s["egg_groups"], "f": s["flavor_text"], "fc": s["flavor_text_count"], "n": s["name"],
            "ev": s["evolution_method"], "from": s["evolves_from"], "sv": s["in_scarlet_violet"], "za": s["in_legends_za"],
        } for s in species},
        "abilities": {str(k): [abilities[k]["name"], abilities[k]["description"]] for k in used if k in abilities},
        "eff": {f"{e['attacker']}>{e['defender']}": e["multiplier"] for e in read_silver("type_efficacy") if e["multiplier"] != 1},
        "types": TYPE_ORDER,
    }
    GOLD_DEX.parent.mkdir(parents=True, exist_ok=True)
    GOLD_DEX.write_text(json.dumps(dex, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"gold    {GOLD_DEX.relative_to(GOLD_DEX.parent.parent)}  {len(dex['pokemon'])} Pokémon, {len(dex['species'])} species")


if __name__ == "__main__":
    main()
