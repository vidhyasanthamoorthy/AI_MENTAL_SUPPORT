# train_models.py
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

# tiny demo train — replace with better dataset
emotion_X = ["i feel sad","i'm anxious","i'm stressed","i'm happy","i feel okay"]
emotion_y = ["sad","anxious","stressed","happy","neutral"]
emotion_pipeline = Pipeline([("tfidf", TfidfVectorizer()), ("clf", LogisticRegression(max_iter=1000))])
emotion_pipeline.fit(emotion_X, emotion_y)
joblib.dump(emotion_pipeline, "emotion_model.joblib")

stress_X = ["i'm calm","a bit worried","overwhelmed and panicking"]
stress_y = ["Low","Medium","High"]
stress_pipeline = Pipeline([("tfidf", TfidfVectorizer()), ("clf", LogisticRegression(max_iter=1000))])
stress_pipeline.fit(stress_X, stress_y)
joblib.dump(stress_pipeline, "stress_model.joblib")
