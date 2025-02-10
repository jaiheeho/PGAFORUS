from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class BetEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner = db.Column(db.String(100), unique=True, nullable=False)
    players = db.Column(db.JSON, nullable=False)
    hidden = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'owner': self.owner,
            'players': self.players,
            'hidden': self.hidden
        } 
