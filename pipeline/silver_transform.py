"""Silver: clean, typed, English-only tables in lake/silver/*.jsonl.

Tables: pokemon, species, abilities, type_efficacy.
"""
import collections
import re

from common import ENGLISH, read_bronze, write_silver

# Cosmetic or event-only forms that add nothing to a comparison.
SKIP_FORMS = re.compile(r"(totem|-cap$|cosplay|-rock-star|-belle|-pop-star|-phd|-libre|starter|minior-(?!red-meteor)"
                        r"|-busted|-family-of-three|-build$|-mode$|pikachu-.*|zygarde-10-power|koraidon-|miraidon-)")
SV_DEXES = {"31", "32", "33"}   # Paldea, Kitakami, Blueberry
ZA_DEXES = {"34", "35"}         # Lumiose City, Hyperspace
STAT_KEYS = ["hp", "attack", "defense", "sp_attack", "sp_defense", "speed"]


def latest_english(rows, key, version_field):
    best = {}
    for r in rows:
        if r.get("language_id", r.get("local_language_id")) != ENGLISH:
            continue
        v = int(r[version_field])
        if r[key] not in best or v >= best[r[key]][0]:
            best[r[key]] = (v, " ".join(r["flavor_text"].replace("\f", " ").split()))
    return {k: v[1] for k, v in best.items()}


def main():
    types = {r["id"]: r["identifier"] for r in read_bronze("types")}

    # ---- type_efficacy
    eff = [{"attacker": types[r["damage_type_id"]], "defender": types[r["target_type_id"]],
            "multiplier": int(r["damage_factor"]) / 100} for r in read_bronze("type_efficacy")]
    print("silver  type_efficacy", write_silver("type_efficacy", eff))

    # ---- abilities
    names = {r["ability_id"]: r["name"] for r in read_bronze("ability_names") if r["local_language_id"] == ENGLISH}
    desc = latest_english(read_bronze("ability_flavor_text"), "ability_id", "version_group_id")
    abilities = [{"ability_id": int(k), "name": v, "description": desc.get(k, "")} for k, v in names.items()]
    print("silver  abilities", write_silver("abilities", abilities))

    # ---- species
    sp_names, genus = {}, {}
    for r in read_bronze("pokemon_species_names"):
        if r["local_language_id"] == ENGLISH:
            sp_names[r["pokemon_species_id"]] = r["name"]
            genus[r["pokemon_species_id"]] = r["genus"]
    lookup = lambda t: {r["id"]: r["identifier"] for r in read_bronze(t)}
    colors, habitats, shapes, growth, eggs = (lookup(t) for t in ("pokemon_colors", "pokemon_habitats", "pokemon_shapes", "growth_rates", "egg_groups"))
    egg_by_species = collections.defaultdict(list)
    for r in read_bronze("pokemon_egg_groups"):
        egg_by_species[r["species_id"]].append(eggs[r["egg_group_id"]])
    flav_rows = read_bronze("pokemon_species_flavor_text")
    flavor = latest_english(flav_rows, "species_id", "version_id")
    flavor_count = collections.Counter(r["species_id"] for r in flav_rows if r["language_id"] == ENGLISH)
    triggers = lookup("evolution_triggers")
    evo = {}
    for r in read_bronze("pokemon_evolution"):
        sid = r["evolved_species_id"]
        if sid in evo:
            continue
        t = triggers.get(r["evolution_trigger_id"], "")
        if r["minimum_level"]: d = f"Lv. {r['minimum_level']}"
        elif t == "trade": d = "Trade"
        elif t == "use-item": d = "Use item"
        elif r["minimum_happiness"]: d = "Friendship"
        elif r["known_move_type_id"] or r["known_move_id"]: d = "Know a move"
        elif r["location_id"]: d = "Special location"
        else: d = t.replace("-", " ").capitalize() or "Special"
        if r["time_of_day"]: d += f" ({r['time_of_day']})"
        evo[sid] = d
    dex_sets = collections.defaultdict(set)
    for r in read_bronze("pokemon_dex_numbers"):
        dex_sets[r["species_id"]].add(r["pokedex_id"])
    species = []
    for s in read_bronze("pokemon_species"):
        sid = s["id"]
        species.append({
            "species_id": int(sid), "name": sp_names.get(sid, s["identifier"]), "genus": genus.get(sid, ""),
            "generation": int(s["generation_id"]), "evolves_from": int(s["evolves_from_species_id"] or 0),
            "evolution_chain_id": int(s["evolution_chain_id"] or 0), "evolution_method": evo.get(sid, ""),
            "color": colors.get(s["color_id"], ""), "shape": shapes.get(s["shape_id"], ""), "habitat": habitats.get(s["habitat_id"], ""),
            "gender_rate": int(s["gender_rate"]), "capture_rate": int(s["capture_rate"]), "base_happiness": int(s["base_happiness"] or 0),
            "hatch_counter": int(s["hatch_counter"] or 0), "growth_rate": growth.get(s["growth_rate_id"], ""), "egg_groups": egg_by_species[sid],
            "is_baby": s["is_baby"] == "1", "is_legendary": s["is_legendary"] == "1", "is_mythical": s["is_mythical"] == "1",
            "flavor_text": flavor.get(sid, ""), "flavor_text_count": flavor_count[sid],
            "in_scarlet_violet": bool(dex_sets[sid] & SV_DEXES), "in_legends_za": bool(dex_sets[sid] & ZA_DEXES),
        })
    print("silver  species", write_silver("species", species))

    # ---- pokemon (one row per battle-relevant form)
    stats = collections.defaultdict(dict)
    for r in read_bronze("pokemon_stats"):
        k = int(r["stat_id"])
        if 1 <= k <= 6:
            stats[r["pokemon_id"]][STAT_KEYS[k - 1]] = int(r["base_stat"])
    ptypes = collections.defaultdict(list)
    for r in sorted(read_bronze("pokemon_types"), key=lambda r: int(r["slot"])):
        ptypes[r["pokemon_id"]].append(types[r["type_id"]])
    pab = collections.defaultdict(list)
    for r in sorted(read_bronze("pokemon_abilities"), key=lambda r: int(r["slot"])):
        pab[r["pokemon_id"]].append({"ability_id": int(r["ability_id"]), "is_hidden": r["is_hidden"] == "1"})
    default_form = {f["pokemon_id"]: f for f in read_bronze("pokemon_forms") if f["is_default"] == "1"}
    form_names = {r["pokemon_form_id"]: r for r in read_bronze("pokemon_form_names") if r["local_language_id"] == ENGLISH}
    pokemon, seen = [], set()
    for p in read_bronze("pokemon"):
        pid, default = p["id"], p["is_default"] == "1"
        if not default and SKIP_FORMS.search(p["identifier"]):
            continue
        if not stats[pid].get("hp"):
            continue
        f = default_form.get(pid)
        name = sp_names[p["species_id"]]
        if not default:
            fn = form_names.get(f["id"]) if f else None
            if fn and fn["pokemon_name"]: name = fn["pokemon_name"]
            elif fn and fn["form_name"]: name = f"{name} ({fn['form_name']})"
            else: name = p["identifier"].replace("-", " ").title()
        if name in seen:  # e.g. male and female Mega Meowstic share a display name
            name += " (Female)" if "female" in p["identifier"] else f" ({p['identifier']})"
        seen.add(name)
        pokemon.append({
            "pokemon_id": int(pid), "species_id": int(p["species_id"]), "name": name, "is_default": default,
            "types": ptypes[pid], "stats": stats[pid], "height_dm": int(p["height"]), "weight_hg": int(p["weight"]),
            "base_experience": int(p["base_experience"] or 0), "abilities": pab[pid],
            "is_mega": bool(f and f["is_mega"] == "1"), "is_gigantamax": p["identifier"].endswith("-gmax"),
        })
    print("silver  pokemon", write_silver("pokemon", pokemon))


if __name__ == "__main__":
    main()
