from flask import Flask, jsonify
import pandas as pd
import requests
import json
import random
from bs4 import BeautifulSoup

app = Flask(__name__)

def get_pga_leaderboard():
    url = "https://www.pgatour.com/leaderboard"
    headers = {"User-Agent": "Mozilla/5.0"}
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
        score = scoring_data.get("total", "N/A")
        
        leaderboard.append({
            "Rank": rank,
            "Player": name,
            "Score": score
        })
    
    return pd.DataFrame(leaderboard)

def calculate_betting_points(selected_players, leaderboard_df):
    points_summary = []
    total_points = 0

    for player in selected_players:
        player_row = leaderboard_df[leaderboard_df["Player"] == player]
        player_points = 0
        
        if not player_row.empty:
            rank = player_row.iloc[0]["Rank"]
            rank_cleaned = ''.join(filter(str.isdigit, rank))

            if rank_cleaned.isdigit():
                rank_num = int(rank_cleaned)
                if rank_num == 1:
                    player_points = 3
                elif rank_num <= 10:
                    player_points = 1
                elif rank_num >= 31:
                    player_points = -1

            points_summary.append({"Player": player, "Rank": rank, "Points": player_points})
            total_points += player_points

    return {"total_points": total_points, "details": points_summary}

@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    df = get_pga_leaderboard()
    if df is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500
    return jsonify(df.to_dict(orient="records"))

@app.route("/bet", methods=["GET"])
def bet():
    df = get_pga_leaderboard()
    if df is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500
    
    selected_players = random.sample(list(df["Player"][:10]), min(5, len(df)))
    results = calculate_betting_points(selected_players, df)
    return jsonify({"selected_players": selected_players, "betting_results": results})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
