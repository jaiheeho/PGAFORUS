import requests
import pandas as pd
import json
import random
import os
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, render_template_string, request, redirect, url_for, flash
from leaderboard_fetcher import get_pga_leaderboard
from upcoming_players_fetcher import get_upcoming_players
from flask_sqlalchemy import SQLAlchemy
from bet_data_base import db, BetEntry
from flask_migrate import Migrate

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///bets.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# The secret key is essential for session management and security in Flask applications.
# It is used to sign session cookies and protect against certain attacks.
app.secret_key = os.urandom(24)  # Generate a random secret key for better security

db.init_app(app)
migrate = Migrate(app, db)

# Add this function
def init_db():
    with app.app_context():
        try:
            # Create tables if they don't exist
            db.create_all()
            # Run migrations
            from flask_migrate import upgrade
            upgrade()
        except Exception as e:
            print(f"Database initialization error: {e}")

# Call init_db() when starting the app
init_db()

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
                "Today": player_row.iloc[0]["Today"],
                "Total_Score": player_row.iloc[0]["Total Score"],
                "Round_Scores": player_row.iloc[0]["Round Scores"],
                "Points": player_points
            })
            total_points += player_points
    
    points_summary.sort(key=lambda x: x["Rank"])  # Sort points_summary by Rank
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
    leaderboard = get_pga_leaderboard()
    if leaderboard is None:
        return jsonify({"error": "Failed to fetch leaderboard"}), 500

    # Get entries where hidden is NULL or False
    entries = BetEntry.query.filter(
        (BetEntry.hidden.is_(None)) | (BetEntry.hidden == False)  # noqa: E712
    ).all()
    
    results = []
    for entry in entries:
        bet_result = calculate_betting_points(entry.players, leaderboard)
        results.append({
            "owner": entry.owner,
            "total_points": bet_result["total_points"],
            "details": bet_result["details"]
        })
    
    return render_template('bet.html', results=results)

@app.route("/manage")
def manage_bets():
    entries = BetEntry.query.all()
    
    # Get upcoming players with error handling
    try:
        upcoming_players = get_upcoming_players()
        if upcoming_players is None:
            # Create empty DataFrame if fetch fails
            upcoming_players = pd.DataFrame(columns=['Player', 'PlayerURL'])
            flash('Unable to fetch player list. Showing empty table.', 'error')
    except Exception as e:
        upcoming_players = pd.DataFrame(columns=['Player', 'PlayerURL'])
        flash(f'Error fetching player list: {str(e)}', 'error')
    
    return render_template('manage_bets.html', 
                         entries=entries,
                         upcoming_players=upcoming_players)

@app.route("/manage/add", methods=["POST"])
def add_bet():
    owner = request.form.get('owner')
    players = [p.strip() for p in request.form.get('players').split(',')]
    # Get hidden state from form checkbox
    hidden = request.form.get('hidden') == 'on'  # Checkbox returns 'on' when checked
    
    if not owner:
        flash('Owner name is required!', 'error')
        return redirect(url_for('manage_bets'))
        
    if len(players) != 5:
        flash('Exactly 5 players are required!', 'error')
        return redirect(url_for('manage_bets'))
    
    try:
        bet_entry = BetEntry(owner=owner, players=players, hidden=hidden)
        db.session.add(bet_entry)
        db.session.commit()
        flash(f'Bet entry added successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding bet: Owner name might already exist', 'error')
        print(f"Error adding bet: {e}")
    
    return redirect(url_for('manage_bets'))

@app.route("/manage/remove", methods=["POST"])
def remove_bet():
    owner = request.form.get('owner')
    if owner:
        try:
            bet_entry = BetEntry.query.filter_by(owner=owner).first()
            if bet_entry:
                db.session.delete(bet_entry)
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error removing bet: {e}")
    
    return redirect(url_for('manage_bets'))

@app.route("/manage/toggle_hidden", methods=["POST"])
def toggle_hidden():
    owner = request.form.get('owner')
    if owner:
        try:
            bet_entry = BetEntry.query.filter_by(owner=owner).first()
            if bet_entry:
                # Toggle the hidden state
                bet_entry.hidden = not bet_entry.hidden if bet_entry.hidden is not None else True
                db.session.commit()
                status = "hidden" if bet_entry.hidden else "visible"
                flash(f'Bet is now {status}!', 'success')
            else:
                flash('Bet not found!', 'error')
        except Exception as e:
            db.session.rollback()
            flash('Error updating visibility', 'error')
            print(f"Error toggling hidden: {e}")
    
    return redirect(url_for('manage_bets'))

@app.route("/get_players")
def get_players():
    df = get_upcoming_players()
    if df is None:
        return jsonify([])
    
    try:
        players = df["Player"].tolist()
        return jsonify(players)
    except Exception as e:
        print(f"Error getting players: {e}")
        return jsonify([])

if __name__ == "__main__":
    import os
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080, help="Port to run the server on")
    args = parser.parse_args()

    app.run(host="0.0.0.0", port=args.port, debug=True)
