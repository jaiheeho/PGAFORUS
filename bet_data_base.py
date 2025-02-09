from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class BetEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner = db.Column(db.String(100), unique=True, nullable=False)
    players = db.Column(db.JSON, nullable=False)  # Store players as JSON array

    def to_dict(self):
        return {
            'owner': self.owner,
            'players': self.players
        }

class BetDatabase:
    def __init__(self):
        # Initialize with some sample bet entries
        # In a real implementation, this would connect to a proper database
        self._bet_entries = [
        {"owner": "이프로", "players": ["Sepp Straka", "Sam Burns", "Justin Thomas", "Hideki Matsuyama", "Nick Taylor"]},
        {"owner": "허프로", "players": ["Sungjae Im", "Sam Burns", "Justin Thomas", "Hideki Matsuyama", "Tom Kim"]},
        {"owner": "희프로", "players": ["Sungjae Im", "K.H. Lee", "Tom Kim", "Hideki Matsuyama", "Sepp Straka"]}
    ]

    def get_all_entries(self):
        """Return all betting entries"""
        return self._bet_entries

    def add_entry(self, owner, players):
        """Add a new betting entry"""
        self._bet_entries.append({
            "owner": owner,
            "players": players
        })

    def remove_entry(self, owner):
        """Remove a betting entry by owner name"""
        self._bet_entries = [entry for entry in self._bet_entries if entry["owner"] != owner]

    def update_entry(self, owner, players):
        """Update players for an existing owner"""
        for entry in self._bet_entries:
            if entry["owner"] == owner:
                entry["players"] = players
                return True
        return False
