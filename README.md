# AI Mental Support – All-in-One Starter

Features: chatbot conversation, emotion detection, stress prediction, mood tracking (chart), resource suggestions, optional voice (STT/TTS in browser).

## Run Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```
API: http://127.0.0.1:5000

## Run Frontend
Option A: open `frontend/index.html` in Chrome  
Option B (recommended):
```bash
cd frontend
python -m http.server 5500
```
Open http://127.0.0.1:5500/index.html

## Notes
- ML models use tiny synthetic datasets for quick demo training. Replace with real datasets for accuracy (e.g., emotion datasets from Kaggle).
- Data stored in `database/mental_support.db` (SQLite). To switch to MySQL, update `backend/config.py` and install `pymysql`.
- Educational use only; not medical advice.
