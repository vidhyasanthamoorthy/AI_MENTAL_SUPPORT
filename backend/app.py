# backend/app.py
# Full-featured Flask backend for AI Mental Support project
# Features:
# - MySQL connection via SQLAlchemy (pymysql)
# - Signup / Login (JWT)
# - Chat endpoint (JWT-protected) with emotion detection & stress prediction
# - Store messages and mood history in DB
# - Moods endpoint for dashboard
# - Resources endpoint for tips/links
# - Test DB connectivity endpoint

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, create_engine, text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime, timedelta
import urllib.parse

# ML imports
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# ---------------------------
# Configuration
# ---------------------------
DB_USER = "root"
DB_PASSWORD_RAW = "apple56orange12@grape34"  # your password
DB_HOST = "localhost"
DB_NAME = "ai_mental_support"

JWT_SECRET = "replace_with_a_strong_secret_for_production"

# ---------------------------
# App & DB setup
# ---------------------------
app = Flask(__name__)
CORS(app)

DB_PASSWORD = urllib.parse.quote_plus(DB_PASSWORD_RAW)
SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

engine = create_engine(SQLALCHEMY_DATABASE_URI, future=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

app.config["JWT_SECRET_KEY"] = JWT_SECRET
jwt = JWTManager(app)

# ---------------------------
# Models
# ---------------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    moods = relationship("MoodEntry", back_populates="user", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender = Column(String(10), nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="messages")

class MoodEntry(Base):
    __tablename__ = "mood_history"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood = Column(String(50), nullable=False)
    stress_level = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="moods")

Base.metadata.create_all(engine)

# ---------------------------
# Simple ML Models
# ---------------------------
class EmotionClassifier:
    def __init__(self):
        TRAIN_DATA = [
            ("i feel so sad and tired", "sad"),
            ("i'm anxious about exams", "anxious"),
            ("i'm stressed with deadlines", "stressed"),
            ("i'm feeling happy today", "happy"),
            ("i feel okay and neutral", "neutral"),
        ]
        X = [t for t, _ in TRAIN_DATA]
        y = [l for _, l in TRAIN_DATA]
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=1)),
            ("clf", LogisticRegression(max_iter=1000))
        ])
        self.pipeline.fit(X, y)

    def predict(self, text: str) -> str:
        return self.pipeline.predict([text])[0]

class StressClassifier:
    def __init__(self):
        TRAIN_DATA = [
            ("i'm fine and relaxed", "Low"),
            ("i feel a bit worried", "Medium"),
            ("i'm extremely overwhelmed", "High"),
        ]
        X = [t for t, _ in TRAIN_DATA]
        y = [l for _, l in TRAIN_DATA]
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=1)),
            ("clf", LogisticRegression(max_iter=1000))
        ])
        self.pipeline.fit(X, y)

    def predict(self, text: str) -> str:
        return self.pipeline.predict([text])[0]

emotion_model = EmotionClassifier()
stress_model = StressClassifier()

# ---------------------------
# Routes
# ---------------------------
@app.get("/")
def home():
    return jsonify({
        "ok": True,
        "message": "AI Mental Support Backend Running",
        "endpoints": [
            "/api/ping",
            "/api/signup",
            "/api/login",
            "/api/chat",
            "/api/moods",
            "/api/messages",
            "/api/resources",
            "/test-db"
        ]
    })

@app.get("/api/ping")
def ping():
    return {"ok": True, "message": "AI Mental Support Backend Running"}

@app.post("/api/signup")
def signup():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400

    with SessionLocal() as session:
        existing = session.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing:
            return jsonify({"error": "username or email already exists"}), 400

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        session.add(user)
        session.commit()
        return jsonify({"message": "user created", "username": username}), 201

@app.post("/api/login")
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    with SessionLocal() as session:
        user = session.query(User).filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "invalid credentials"}), 401
        access_token = create_access_token(identity=user.username, expires_delta=timedelta(days=7))
        return jsonify({"access_token": access_token, "username": user.username})

@app.post("/api/chat")
@jwt_required()
def chat():
    data = request.get_json(force=True) or {}
    current_user = get_jwt_identity()  # Get username from JWT token
    text_input = (data.get("message") or "").strip()

    if not text_input:
        return jsonify({"error": "message is required"}), 400

    with SessionLocal() as session:
        user = session.query(User).filter_by(username=current_user).first()
        if not user:
            return jsonify({"error": "user not found"}), 404

        umsg = Message(user_id=user.id, sender="user", text=text_input)
        session.add(umsg)

        try:
            emotion = emotion_model.predict(text_input)
        except Exception:
            emotion = "neutral"
        try:
            stress = stress_model.predict(text_input)
        except Exception:
            stress = "Low"

        entry = MoodEntry(user_id=user.id, mood=emotion, stress_level=stress)
        session.add(entry)

        reply_text = f"I hear you. Your mood seems {emotion} and stress level is {stress}."
        bmsg = Message(user_id=user.id, sender="bot", text=reply_text)
        session.add(bmsg)
        session.commit()

        return jsonify({
            "reply": reply_text,
            "emotion": emotion,
            "stress": stress,
            "timestamp": entry.timestamp.isoformat()
        })

# --- New moods endpoint ---
@app.get("/api/moods")
@jwt_required()
def moods():
    """Return the current user's mood history for the last N days (default 7)."""
    days = int(request.args.get("days", 7))
    current_user = get_jwt_identity()

    with SessionLocal() as session:
        user = session.query(User).filter_by(username=current_user).first()
        if not user:
            return jsonify({"error": "user not found"}), 404

        cutoff = datetime.utcnow() - timedelta(days=days)
        rows = (
            session.query(MoodEntry)
            .filter(MoodEntry.user_id == user.id, MoodEntry.timestamp >= cutoff)
            .order_by(MoodEntry.timestamp.desc())
            .all()
        )
        return jsonify([
            {
                "mood": r.mood,
                "stress": r.stress_level,
                "timestamp": r.timestamp.isoformat()
            } for r in rows
        ])

@app.route('/test-db', methods=['GET'])
def test_db():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            count = result.scalar()
            return jsonify({"status": "success", "user_count": count}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/protected-test", methods=["GET"])
@jwt_required()
def protected_test():
    current_user = get_jwt_identity()
    return jsonify({
        "message": "You are authorized!",
        "user": current_user
    }), 200

# --- Compatibility routes for frontend ---
@app.post("/signup")
def signup_alias():
    return signup()

@app.post("/login")
def login_alias():
    return login()

# ---------------------------
# Run
# ---------------------------
if __name__ == "__main__":
    print("Starting AI Mental Support backend...")
    print("DB URI:", SQLALCHEMY_DATABASE_URI.replace(DB_PASSWORD, "****"))
    app.run(debug=True, host="0.0.0.0", port=5000)
