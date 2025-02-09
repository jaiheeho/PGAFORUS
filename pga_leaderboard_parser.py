import requests
import pandas as pd
import json
import random
import os
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template_string

app = Flask(__name__)

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
        score = scoring_data.get("total", "N/A")
        thru = scoring_data.get("thru", "N/A")
        round_scores = scoring_data.get("rounds", [])
        
        leaderboard.append({
            "Rank": rank,
            "Player": name,
            "Score": score,
            "Total Score": score,
            "Round Scores": ", ".join(round_scores) if round_scores else "N/A"
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
            
            points_summary.append({
                "Player": player, 
                "Rank": rank, 
                "Total Score": player_row.iloc[0]["Total Score"],
                "Round Scores": player_row.iloc[0]["Round Scores"],
                "Points": player_points
            })
            total_points += player_points
    
    return {"total_points": total_points, "details": points_summary}

@app.route("/")
def home():
    return jsonify({"message": "Welcome to the PGA Leaderboard API! Use /leaderboard or /bet"})

@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    df = get_pga_leaderboard()
    if df is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500
    
    html_table = df.to_html(classes='table table-striped', index=False)
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>PGA Leaderboard</title>
        <link rel="stylesheet" 
              href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
        <div class="container mt-4">
            <h2 class="text-center">PGA Leaderboard</h2>
            {{ table | safe }}
        </div>
    </body>
    </html>
    """
    return render_template_string(html_template, table=html_table)

@app.route("/bet", methods=["GET"])
def bet():
    df = get_pga_leaderboard()
    if df is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500
    
    bet_entries = [
        {"owner": "이프로", "players": ["Sepp Straka", "Sam Burns", "Justin Thomas", "Hideki Matsuyama", "Nick Taylor"]},
        {"owner": "허프로", "players": ["Sungjae Im", "Sam Burns", "Justin Thomas", "Hideki Matsuyama", "Tom Kim"]},
        {"owner": "희프로", "players": ["Sungjae Im", "K.H. Lee", "Tom Kim", "Hideki Matsuyama", "Sepp Straka"]}
    ]
    
    results = []
    for entry in bet_entries:
        points_result = calculate_betting_points(entry["players"], df)
        results.append({"owner": entry["owner"], "players": points_result["details"], "total_score": points_result["total_points"]})
    
    bet_table = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Betting Results</title>
        <link rel="stylesheet" 
              href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.2/css/bootstrap.min.css">
    </head>
    <body>
        <div class="container mt-4">
            <h2 class="text-center">Betting Results</h2>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Owner</th>
                        <th>Players with Current Rank, Total Score, and Round Scores</th>
                        <th>Total Score</th>
                    </tr>
                </thead>
                <tbody>
                    {% for result in results %}
                    <tr>
                        <td>{{ result['owner'] }}</td>
                        <td>
                            <ul>
                                {% for player in result['players'] %}
                                    <li>{{ player['Player'] }} (Rank: {{ player['Rank'] }}, Total Score: {{ player['Total Score'] }}, Round Scores: {{ player['Round Scores'] }})</li>
                                {% endfor %}
                            </ul>
                        </td>
                        <td>{{ result['total_score'] }}</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """
    return render_template_string(bet_table, results=results)

if __name__ == "__main__":
    import os
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080, help="Port to run the server on")
    args = parser.parse_args()

    app.run(host="0.0.0.0", port=args.port, debug=True)
