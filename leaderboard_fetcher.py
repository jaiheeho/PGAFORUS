import requests
import pandas as pd
import json
from bs4 import BeautifulSoup

def get_pga_leaderboard():
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
        json_data = json.loads(script_tag.string)
    except json.JSONDecodeError:
        return None
    
    leaderboard_data = json_data.get("props", {}).get("pageProps", {}).get("leaderboard", {}).get("players", [])
    
    if not leaderboard_data:
        return None
    
    leaderboard = []
    for player in leaderboard_data:
        player_info = player.get("player", {})
        scoring_data = player.get("scoringData", {})

        rank = scoring_data.get("position", "N/A")
        name = player_info.get("displayName", "Unknown")
        total = scoring_data.get("total", "N/A")
        thru = scoring_data.get("thru", "N/A")
        today = scoring_data.get("score", "N/A")
        round_scores = scoring_data.get("rounds", [])
        

        if(name == "Thomas Detry"):
            print (player)
        # Skip players with N/A or Unknown values
        if name == "Unknown" or rank == "N/A" or total == "N/A":
            continue
        
        leaderboard.append({
            "Rank": rank,
            "Player": name,
            "Today": today,
            "Total Score": total,
            "Round Scores": ", ".join(round_scores) if round_scores else "N/A"
        })
    
    return pd.DataFrame(leaderboard) 