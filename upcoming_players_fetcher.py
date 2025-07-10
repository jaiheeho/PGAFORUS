import requests
import pandas as pd
import json
from bs4 import BeautifulSoup

def get_upcoming_players():
    url = "https://www.pgatour.com/leaderboard"
    headers = {"User-Agent": "Mozilla/5.0"}  # To prevent blocking
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        return None
    
    soup = BeautifulSoup(response.text, "html.parser")
    script_tag = soup.find("script", id="__NEXT_DATA__")
    
    if not script_tag:
        return None
    
    try:
        script_content = script_tag.get_text()
        if not script_content:
            return None
        json_data = json.loads(script_content)
    except json.JSONDecodeError:
        return None
    
    leaderboard_data = json_data.get("props", {}).get("pageProps", {}).get("leaderboard", {}).get("players", [])
    
    if not leaderboard_data:
        return None
    
    leaderboard = []
    for player in leaderboard_data:
        player_info = player.get("player", {})
        scoring_data = player.get("scoringData", {})

        # Use POS field instead of position
        rank = scoring_data.get("POS", scoring_data.get("pos", "-"))
        name = player_info.get("displayName", "Unknown")
        total = scoring_data.get("total", "N/A")
        thru = scoring_data.get("thru", "N/A")
        today = scoring_data.get("score", "N/A")
        round_scores = scoring_data.get("rounds", [])
        
        # Skip players with Unknown names, but allow rank "-" since that's valid for pre-tournament
        if name == "Unknown":
            continue
        
        leaderboard.append({
            "Rank": rank,
            "Player": name,
            "Today": today,
            "Total Score": total,
            "Round Scores": ", ".join(round_scores) if round_scores else "N/A"
        })
    
    return pd.DataFrame(leaderboard) 