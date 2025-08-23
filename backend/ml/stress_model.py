from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

TRAIN_DATA = [
    ("i'm fine and relaxed", "Low"),
    ("i feel a bit worried", "Medium"),
    ("i'm extremely overwhelmed and panicking", "High"),
    ("manageable stress", "Medium"),
    ("calm and peaceful", "Low"),
    ("too many deadlines and can't sleep", "High"),
]

class StressClassifier:
    def __init__(self):
        self.labels = ["Low", "Medium", "High"]
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
