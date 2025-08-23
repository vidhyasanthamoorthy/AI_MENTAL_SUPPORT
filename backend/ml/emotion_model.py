from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Tiny, synthetic starter dataset for demonstration.
TRAIN_DATA = [
    ("i feel so sad and tired", "sad"),
    ("i'm anxious about exams", "anxious"),
    ("i'm stressed with deadlines", "stressed"),
    ("i'm feeling happy today", "happy"),
    ("i feel okay and neutral", "neutral"),
    ("i can't stop worrying", "anxious"),
    ("i'm overwhelmed and stressed", "stressed"),
    ("i'm grateful and joyful", "happy"),
    ("i'm down and low", "sad"),
    ("just normal day", "neutral"),
]

class EmotionClassifier:
    def __init__(self):
        self.labels = ["sad", "anxious", "stressed", "happy", "neutral"]
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1,2), min_df=1)),
            ('clf', LogisticRegression(max_iter=1000))
        ])

    def train(self):
        X = [t for t, _ in TRAIN_DATA]
        y = [l for _, l in TRAIN_DATA]
        self.pipeline.fit(X, y)
        return self

    def predict(self, text: str) -> str:
        return self.pipeline.predict([text])[0]
