"""Run the whole Pokémon Lakehouse pipeline: bronze → silver → gold.

    python3 pipeline/run.py            # full refresh from PokéAPI
    python3 pipeline/run.py --offline  # rebuild silver and gold from existing bronze files
"""
import sys

import bronze_ingest
import gold_publish
import silver_transform

if __name__ == "__main__":
    if "--offline" not in sys.argv:
        bronze_ingest.main()
    silver_transform.main()
    gold_publish.main()
