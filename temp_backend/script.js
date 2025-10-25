const base = "http://127.0.0.1:5000";
let token = localStorage.getItem("token") || null;
let username = localStorage.getItem("username") || "demo";

const moodMap = { stressed: 0, sad: 1, neutral: 2, happy: 3, anxious: 1 };
const stressMap = { Low: 0, Medium: 1, High: 2 };

// === Chat ===
async function sendChat() {
  const text = document.getElementById("msg").value;
  if (!text) return;

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + (token || "")
    },
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  appendMsg("You: " + text);
  appendMsg("Bot: " + data.reply + " (" + data.emotion + ", " + data.stress + ")", true);
  document.getElementById("msg").value = "";

  recommendResources(data.emotion, data.stress);
  loadMoodHistory(username);
}

function appendMsg(text, isBot = false) {
  const d = document.getElementById("messages"); 
  const div = document.createElement("div");
  div.textContent = text;
  if (isBot) div.classList.add("bot-message");
  d.appendChild(div);
  d.scrollTop = d.scrollHeight;
}

// === Mood & Stress Charts ===
let moodChart = null;
let stressChart = null;

async function loadMoodHistory(username) {
  if (!username) return;

  const res = await fetch(`${base}/api/moods?username=${encodeURIComponent(username)}&days=30`, {
    method: "GET",
    headers: { "Authorization": "Bearer " + (token || "") }
  });

  const data = await res.json();
  if (!Array.isArray(data)) return;

  const labels = data.map(i => new Date(i.timestamp).toLocaleDateString());
  const moodValues = data.map(i => moodMap[i.mood] ?? 2);
  const stressValues = data.map(i => stressMap[i.stress] ?? 1);

  // === Mood Chart ===
  const moodCtx = document.getElementById("moodHistoryChart").getContext("2d");
  if (moodChart) moodChart.destroy();
  moodChart = new Chart(moodCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Mood",
        data: moodValues,
        borderColor: "blue",
        backgroundColor: "rgba(0,0,255,0.1)",
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              const moods = ["Stressed", "Sad/Anxious", "Neutral", "Happy"];
              return moods[value] || value;
            }
          }
        }
      }
    }
  });

  // === Stress Chart ===
  const stressCtx = document.getElementById("stressHistoryChart").getContext("2d");
  if (stressChart) stressChart.destroy();
  stressChart = new Chart(stressCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Stress",
        data: stressValues,
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.1)",
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 2,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              const stressLevels = ["Low", "Medium", "High"];
              return stressLevels[value] || value;
            }
          }
        }
      }
    }
  });
}

// === Resource Recommendation ===
function recommendResources(mood, stress) {
  const resources = {
    stressed: [
      { type: "Tip", text: "Take deep breaths for 2–3 minutes." },
      { type: "Video", text: "5-min guided meditation", link: "https://youtu.be/inpok4MKVLM" },
      { type: "Helpline", text: "Call 9152987821 (India Mental Health Helpline)" }
    ],
    anxious: [
      { type: "Tip", text: "Try writing your thoughts down to release anxiety." },
      { type: "Video", text: "Anxiety calming session", link: "https://youtu.be/WWloIAQpMcQ" }
    ],
    sad: [
      { type: "Tip", text: "Go for a walk and talk to someone you trust." },
      { type: "Article", text: "Overcoming sadness", link: "https://www.helpguide.org/articles/depression/coping-with-depression.htm" }
    ],
    happy: [
      { type: "Tip", text: "Great! Keep journaling your good moments." }
    ],
    neutral: [
      { type: "Tip", text: "Maintain balance by practicing gratitude." }
    ]
  };

  const selected = resources[mood] || [{ type: "Tip", text: "Stay mindful and balanced!" }];

  const box = document.getElementById("resource-box");
  if (box) {
    box.innerHTML = selected.map(r => {
      if (r.link) {
        return `<p><strong>${r.type}:</strong> <a href="${r.link}" target="_blank">${r.text}</a></p>`;
      }
      return `<p><strong>${r.type}:</strong> ${r.text}</p>`;
    }).join("");
  }
}

// === Voice Support ===
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("msg").value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };
}

document.getElementById("voice-start")?.addEventListener("click", () => {
  recognition?.start();
});

document.getElementById("stopListening")?.addEventListener("click", () => {
  recognition?.stop();
  console.log("Speech-to-text stopped.");
});

document.getElementById("stopSpeaking")?.addEventListener("click", () => {
  window.speechSynthesis.cancel();
  console.log("Bot speech stopped.");
});

document.getElementById("voice-reply")?.addEventListener("click", () => {
  const lastBotMessage = document.querySelector(".bot-message:last-child")?.textContent;
  if (!lastBotMessage) return;

  let utterance = new SpeechSynthesisUtterance(lastBotMessage);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
});

// === Init on page load ===
window.onload = () => {
  loadMoodHistory(username);
};
