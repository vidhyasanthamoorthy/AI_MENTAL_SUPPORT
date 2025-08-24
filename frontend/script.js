const base = "http://127.0.0.1:5000";
let token = localStorage.getItem('token') || null;

// Mappings for chart
const moodMap = { stressed: 0, sad: 1, neutral: 2, happy: 3, anxious: 1 };
const stressMap = { Low: 1, Medium: 2, High: 3 };

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
  alert(await res.json().then(r => JSON.stringify(r)));
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
    loadMoodHistory();
  } else {
    alert(JSON.stringify(data));
  }
}

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
  appendMsg('Bot: ' + data.reply + ' (' + data.emotion + ', ' + data.stress + ')');
  document.getElementById('msg').value = '';
  loadMoodHistory();
}

function appendMsg(t) {
  const d = document.getElementById('messages'); 
  d.innerHTML += '<div>' + t + '</div>'; 
  d.scrollTop = d.scrollHeight;
}

let chart = null;
async function loadMoodHistory() {
  const username = document.getElementById('li_user').value || 'demo';
  const res = await fetch(`${base}/api/moods?username=${encodeURIComponent(username)}&days=30`, {
    method: 'GET',
    headers: { 
      'Authorization': 'Bearer ' + (token || localStorage.getItem('token')) 
    }
  });

  const data = await res.json(); // This is an array, not an object with .items

  // Fix applied here
  const labels = (data || []).map(i => new Date(i.timestamp).toLocaleDateString());
  const moodValues = (data || []).map(i => moodMap[i.mood] ?? 2);
  const stressValues = (data || []).map(i => stressMap[i.stress] ?? 2);

  // Optional: mood counts (if needed for summary)
  const counts = { sad:0, anxious:0, stressed:0, happy:0, neutral:0 };
  (data || []).forEach(i => {
    if (i.mood && counts.hasOwnProperty(i.mood)) {
      counts[i.mood] = (counts[i.mood] || 0) + 1;
    }
  });

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
