"""Bronze: land PokéAPI's raw CSV tables unchanged in lake/bronze/pokeapi/."""
import json
import time
import urllib.request

from common import BRONZE, SOURCE, TABLES


def main():
    BRONZE.mkdir(parents=True, exist_ok=True)
    manifest = {"source": SOURCE, "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "tables": {}}
    for name in TABLES:
        with urllib.request.urlopen(SOURCE + name + ".csv", timeout=120) as r:
            body = r.read()
        (BRONZE / f"{name}.csv").write_bytes(body)
        manifest["tables"][name] = {"bytes": len(body), "rows": body.count(b"\n") - 1}
        print(f"bronze  {name:32} {manifest['tables'][name]['rows']:>7} rows")
    (BRONZE / "_manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
