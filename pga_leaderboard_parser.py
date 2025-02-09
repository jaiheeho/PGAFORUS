import requests
import pandas as pd
import json
import random
import os
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, render_template_string
from leaderboard_fetcher import get_pga_leaderboard

app = Flask(__name__)

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
    return render_template('leaderboard.html', table=html_table)

@app.route("/bet", methods=["GET"])
def bet():
    df = get_pga_leaderboard()
    if df is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500

    from bet_data_base import BetDatabase
    bet_db = BetDatabase()
    bet_entries = bet_db.get_all_entries()
    
    results = []
    for entry in bet_entries:
        bet_result = calculate_betting_points(entry["players"], df)
        results.append({
            "owner": entry["owner"],
            "total_points": bet_result["total_points"],
            "details": bet_result["details"]
        })
    
    return render_template('bet.html', results=results)

if __name__ == "__main__":
    import os
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080, help="Port to run the server on")
    args = parser.parse_args()

    app.run(host="0.0.0.0", port=args.port, debug=True)
