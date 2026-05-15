import urllib.request
import json

PGA_URL = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard"
LIV_URL = "https://site.api.espn.com/apis/site/v2/sports/golf/liv/scoreboard"

TOP_N = 10


def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def parse_competitor(c):
    rounds = c.get("linescores", [])

    if rounds:
        current_round = rounds[-1]
        round_score = current_round.get("displayValue", "-")
        holes_played = len(current_round.get("linescores", []))
        thru = str(holes_played) if holes_played < 18 else "F"
    else:
        round_score = "-"
        thru = "-"

    return {
        "position":    c.get("order", "-"),
        "name":        c["athlete"]["displayName"],
        "total":       c.get("score", "-"),
        "round_score": round_score,
        "thru":        thru,
    }


def assign_positions(players):
    """Replace sequential order numbers with tie-aware display positions."""
    i = 0
    while i < len(players):
        score = players[i]["total"]
        j = i
        while j < len(players) and players[j]["total"] == score:
            j += 1
        label = f"T-{i + 1}" if j - i > 1 else str(i + 1)
        for k in range(i, j):
            players[k]["position"] = label
        i = j


def parse_event(data):
    events = data.get("events", [])
    if not events:
        return {"tournament": "No event found", "status": "unknown", "players": []}

    event = events[0]
    status = event.get("status", {}).get("type", {}).get("description", "Unknown")

    competitions = event.get("competitions", [])
    competitors = competitions[0].get("competitors", []) if competitions else []

    players = [parse_competitor(c) for c in competitors]
    assign_positions(players)
    players = players[:TOP_N]

    return {
        "tournament": event.get("name", "Unknown"),
        "status":     status,
        "players":    players,
    }


def fetch_golf():
    pga_data = fetch_url(PGA_URL)
    pga = parse_event(pga_data)

    liv_data = fetch_url(LIV_URL)
    liv = parse_event(liv_data)

    return {"pga": pga, "liv": liv}


if __name__ == "__main__":
    data = fetch_golf()
    print(json.dumps(data, indent=2))
