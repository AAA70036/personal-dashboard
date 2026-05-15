import feedparser
from datetime import datetime, timezone
import time

FEEDS = {
    "BBC":  "http://feeds.bbci.co.uk/news/rss.xml",
    "NPR":  "https://feeds.npr.org/1001/rss.xml",
    "NYT":  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
}

ITEMS_PER_FEED = 5
TOTAL_ITEMS = 10


def parse_entry(entry, source):
    published = entry.get("published_parsed") or entry.get("updated_parsed")
    if published:
        dt = datetime(*published[:6], tzinfo=timezone.utc)
        timestamp = dt.isoformat()
        sort_key = time.mktime(published)
    else:
        timestamp = None
        sort_key = 0

    return {
        "title":     entry.get("title", ""),
        "link":      entry.get("link", ""),
        "source":    source,
        "published": timestamp,
        "_sort_key": sort_key,
    }


def fetch_news():
    all_items = []

    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:ITEMS_PER_FEED]:
                all_items.append(parse_entry(entry, source))
        except Exception as e:
            print(f"Warning: could not fetch {source}: {e}")

    all_items.sort(key=lambda x: x["_sort_key"], reverse=True)

    items = all_items[:TOTAL_ITEMS]
    for item in items:
        del item["_sort_key"]

    return {"items": items}


if __name__ == "__main__":
    import json
    data = fetch_news()
    print(json.dumps(data, indent=2))
