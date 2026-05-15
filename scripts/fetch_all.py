import json
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from fetch_markets import fetch_markets
from fetch_news import fetch_news
from fetch_golf import fetch_golf

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def write_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  wrote {filename}")


def run():
    statuses = {}

    print("Fetching markets...")
    try:
        write_json("markets.json", fetch_markets())
        statuses["markets"] = "ok"
    except Exception as e:
        statuses["markets"] = f"failed: {e}"
        print(f"  ERROR: {e}")

    print("Fetching news...")
    try:
        write_json("news.json", fetch_news())
        statuses["news"] = "ok"
    except Exception as e:
        statuses["news"] = f"failed: {e}"
        print(f"  ERROR: {e}")

    print("Fetching golf...")
    try:
        golf = fetch_golf()
        write_json("pga.json", {"leaderboard": golf["pga"]})
        write_json("liv.json", {"leaderboard": golf["liv"]})
        statuses["golf"] = "ok"
    except Exception as e:
        statuses["golf"] = f"failed: {e}"
        print(f"  ERROR: {e}")

    write_json("last_updated.json", {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "statuses": statuses,
    })

    print("\nDone.")
    for source, status in statuses.items():
        print(f"  {source}: {status}")


if __name__ == "__main__":
    run()
