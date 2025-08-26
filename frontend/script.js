const base = "http://127.0.0.1:5000";
let token = localStorage.getItem('token') || null;

// Mappings for chart
const moodMap = { stressed: 0, sad: 1, neutral: 2, happy: 3, anxious: 1 };
const stressMap = { Low: 1, Medium: 2, High: 3 };

// === Authentication ===
async function signup() {
  const body = { 
    username: document.getElementById('su_user').value, 
    email: document.getElementById('su_email').value, 
    password: document.getElementById('su_pass').value 
  };
  const res = await fetch(`${base}/api/signup`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
  const result = await res.json();
  alert(JSON.stringify(result));
}

async function login() {
  const username = document.getElementById('li_user').value;
  const password = document.getElementById('li_pass').value;
  
  const res = await fetch(`${base}/api/login`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ username, password }) 
  });
  
  const data = await res.json();
  if (data.access_token) {
    token = data.access_token;
    localStorage.setItem('token', token);
    document.getElementById('token').textContent = 'Logged in as ' + username;
    loadMoodHistory(username);
  } else {
    alert(JSON.stringify(data));
  }
}

// === Chat & Mood Logging ===
async function sendChat() {
  const text = document.getElementById('msg').value;
  if (!text) return;

  const res = await fetch(`${base}/api/chat`, { 
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer ' + (token || localStorage.getItem('token')) 
    }, 
    body: JSON.stringify({ message: text })
  });

  const data = await res.json();
  appendMsg('You: ' + text);
  appendMsg('Bot: ' + data.reply + ' (' + data.emotion + ', ' + data.stress + ')', true);
  document.getElementById('msg').value = '';

  recommendResources(data.emotion, data.stress);

  const username = document.getElementById('li_user').value || 'demo';
  loadMoodHistory(username);
}

function appendMsg(text, isBot = false) {
  const d = document.getElementById('messages'); 
  const div = document.createElement('div');
  div.textContent = text;
  if (isBot) div.classList.add('bot-message');
  d.appendChild(div);
  d.scrollTop = d.scrollHeight;
}

// === Mood History Chart ===
let chart = null;
async function loadMoodHistory(username) {
  if (!username) return;

  const res = await fetch(`${base}/api/moods?username=${encodeURIComponent(username)}&days=30`, {
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer ' + (token || localStorage.getItem('token')) 
    }
  });

  const data = await res.json();
  if (!Array.isArray(data)) return;

  const labels = data.map(i => new Date(i.timestamp).toLocaleDateString());
  const moodValues = data.map(i => moodMap[i.mood] ?? 2);
  const stressValues = data.map(i => stressMap[i.stress] ?? 2);

  const ctx = document.getElementById('moodHistoryChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mood',
          data: moodValues,
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.1)',
          fill: false,
          tension: 0.3
        },
        {
          label: 'Stress',
          data: stressValues,
          borderColor: 'red',
          backgroundColor: 'rgba(255,0,0,0.1)',
          fill: false,
          tension: 0.3
        }
      ]
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
              const moods = ['Stressed', 'Sad/Anxious', 'Neutral', 'Happy'];
              return moods[value] || value;
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

  const box = document.getElementById('resource-box');
  if (box) {
    box.innerHTML = selected.map(r => {
      if (r.link) {
        return `<p><strong>${r.type}:</strong> <a href="${r.link}" target="_blank">${r.text}</a></p>`;
      }
      return `<p><strong>${r.type}:</strong> ${r.text}</p>`;
    }).join('');
  }
}

// === Voice Support (Speech-to-Text) ===
let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('msg').value = transcript;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };
}

document.getElementById('voice-start')?.addEventListener('click', () => {
  recognition?.start();
});

document.getElementById('voice-stop')?.addEventListener('click', () => {
  recognition?.stop();
});

// === Text-to-Speech (Bot Reply Voice) ===
let currentUtterance = null;

document.getElementById('voice-reply')?.addEventListener('click', () => {
  const lastBotMessage = document.querySelector('.bot-message:last-child')?.textContent;
  if (!lastBotMessage) return;

  currentUtterance = new SpeechSynthesisUtterance(lastBotMessage);
  currentUtterance.lang = 'en-US';
  window.speechSynthesis.speak(currentUtterance);
});

// === Stop Buttons ===
// Stop Listening
document.getElementById('stopListening')?.addEventListener('click', () => {
  if (recognition) {
    recognition.stop();
  }
  console.log("Speech-to-text stopped.");
});

// Stop Speaking
document.getElementById('stopSpeaking')?.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  console.log("Bot speech stopped.");
});
