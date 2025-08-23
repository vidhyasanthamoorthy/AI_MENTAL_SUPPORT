const base = "http://127.0.0.1:5000";
let token = null;

async function signup(){
  const body = { username: document.getElementById('su_user').value, email: document.getElementById('su_email').value, password: document.getElementById('su_pass').value };
  const res = await fetch(`${base}/api/signup`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  alert(await res.json().then(r=>JSON.stringify(r)));
}

async function login(){
  const body = { username: document.getElementById('li_user').value, password: document.getElementById('li_pass').value };
  const res = await fetch(`${base}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const data = await res.json();
  if(data.access_token){ token = data.access_token; document.getElementById('token').textContent = 'Logged in as ' + data.username; loadMoodHistory(); }
  else alert(JSON.stringify(data));
}

async function sendChat(){
  const text = document.getElementById('msg').value;
  if(!text) return;
  const res = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ message: text })});
  const data = await res.json();
  appendMsg('You: ' + text);
  appendMsg('Bot: ' + data.reply + ' ('+data.emotion+', '+data.stress+')');
  document.getElementById('msg').value = '';
  loadMoodHistory();
}

function appendMsg(t){
  const d = document.getElementById('messages'); d.innerHTML += '<div>'+t+'</div>'; d.scrollTop = d.scrollHeight;
}

let chart = null;
async function loadMoodHistory(){
  const username = document.getElementById('li_user').value || 'demo';
  const res = await fetch(`${base}/api/moods?username=${encodeURIComponent(username)}&days=30`);
  const data = await res.json();
  // build counts per mood
  const counts = { sad:0, anxious:0, stressed:0, happy:0, neutral:0 };
  data.items.forEach(i => counts[i.mood] = (counts[i.mood]||0)+1);
  const labels = Object.keys(counts);
  const values = labels.map(l => counts[l]);

  const ctx = document.getElementById('moodChart').getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Mood counts', data: values }] },
    options: {}
  });
}
