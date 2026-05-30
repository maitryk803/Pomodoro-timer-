
var currentMode = 'focus';
var isRunning = false;
var secondsLeft = 25 * 60;
var totalSeconds = 25 * 60;
var timerInterval = null;
var roundsDone = 0;
var soundEnabled = true;
var tasks = [];
var activeTaskIndex = -1;

var settings = {
  focus: 25,
  short: 5,
  long: 15,
  rounds: 4
};

var modeNames = {
  focus: 'Focus Session',
  short: 'Short Break',
  long: 'Long Break'
};

function toggleTimer() {
  if (isRunning) {
    clearInterval(timerInterval);
    isRunning = false;
  } else {
    timerInterval = setInterval(onEverySecond, 1000);
    isRunning = true;
  }
  updatePlayButton();
}

function onEverySecond() {
  if (secondsLeft <= 0) {
    onSessionFinished();
    return;
  }
  secondsLeft = secondsLeft - 1;
  updateTimerDisplay();
  updateRing();
}

function onSessionFinished() {
  clearInterval(timerInterval);
  isRunning = false;

  if (currentMode === 'focus') {
    roundsDone = roundsDone + 1;
    savePomoToStorage();
    updateHeaderStats();
    drawWeekChart();

    if (activeTaskIndex !== -1) {
      tasks[activeTaskIndex].pomos = tasks[activeTaskIndex].pomos + 1;
      saveTasksToStorage();
      renderTaskList();
    }

    playBeep();

    if (roundsDone % settings.rounds === 0) {
      switchMode('long');
    } else {
      switchMode('short');
    }
  } else {
    playBeep();
    switchMode('focus');
  }

  updateDots();
  updatePlayButton();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  secondsLeft = settings[currentMode] * 60;
  totalSeconds = secondsLeft;
  updateTimerDisplay();
  updateRing();
  updatePlayButton();
}

function skipSession() {
  clearInterval(timerInterval);
  isRunning = false;

  if (currentMode !== 'focus') {
    switchMode('focus');
  } else {
    if ((roundsDone + 1) % settings.rounds === 0) {
      switchMode('long');
    } else {
      switchMode('short');
    }
  }
  updatePlayButton();
}

function switchMode(mode) {
  clearInterval(timerInterval);
  isRunning = false;
  currentMode = mode;
  secondsLeft = settings[mode] * 60;
  totalSeconds = secondsLeft;

  updateTimerDisplay();
  updateRing();
  updateModeTabs();
  updatePlayButton();

  document.getElementById('mode-label').textContent = modeNames[mode];
}

function applySettings() {
  settings.focus = parseInt(document.getElementById('set-focus').value) || 25;
  settings.short = parseInt(document.getElementById('set-short').value) || 5;
  settings.long = parseInt(document.getElementById('set-long').value) || 15;
  settings.rounds = parseInt(document.getElementById('set-rounds').value) || 4;
  saveSettingsToStorage();
  resetTimer();
  updateDots();
}

function updateTimerDisplay() {
  var minutes = Math.floor(secondsLeft / 60);
  var seconds = secondsLeft % 60;
  var mStr = minutes < 10 ? '0' + minutes : '' + minutes;
  var sStr = seconds < 10 ? '0' + seconds : '' + seconds;
  document.getElementById('timer-display').textContent = mStr + ':' + sStr;
  document.title = mStr + ':' + sStr + ' — FocusFlow';
}

function updateRing() {
  var ring = document.getElementById('ring');
  var circumference = 729;
  var fraction = secondsLeft / totalSeconds;
  var offset = circumference * (1 - fraction);
  ring.style.strokeDashoffset = offset;

  if (currentMode === 'focus') {
    ring.style.stroke = 'var(--green)';
  } else if (currentMode === 'short') {
    ring.style.stroke = 'var(--yellow)';
  } else {
    ring.style.stroke = 'var(--blue)';
  }
}

function updateModeTabs() {
  document.getElementById('tab-focus').classList.remove('active');
  document.getElementById('tab-short').classList.remove('active');
  document.getElementById('tab-long').classList.remove('active');
  document.getElementById('tab-' + currentMode).classList.add('active');
}

function updatePlayButton() {
  var btn = document.getElementById('play-btn');
  if (isRunning) {
    btn.textContent = '⏸';
    btn.classList.add('paused');
  } else {
    btn.textContent = '▶';
    btn.classList.remove('paused');
  }
}

function updateDots() {
  var container = document.getElementById('pomo-dots');
  container.innerHTML = '';
  var completedInCycle = roundsDone % settings.rounds;

  for (var i = 0; i < settings.rounds; i++) {
    var dot = document.createElement('div');
    dot.className = 'dot';
    if (i < completedInCycle) {
      dot.classList.add('done');
    } else if (i === completedInCycle && currentMode === 'focus') {
      dot.classList.add('active');
    }
    container.appendChild(dot);
  }
}

function addTask() {
  var input = document.getElementById('task-input');
  var text = input.value.trim();
  if (text === '') return;
  tasks.unshift({ text: text, done: false, pomos: 0 });
  input.value = '';
  saveTasksToStorage();
  renderTaskList();
}

function renderTaskList() {
  var list = document.getElementById('task-list');
  list.innerHTML = '';

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-msg">No tasks yet. Add one above!</div>';
    return;
  }

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];

    var item = document.createElement('div');
    item.className = 'task-item';
    if (task.done) item.classList.add('done');
    if (i === activeTaskIndex) item.classList.add('selected');

    var checkBtn = document.createElement('button');
    checkBtn.className = 'check-btn';
    if (task.done) {
      checkBtn.classList.add('done');
      checkBtn.textContent = '✓';
    }
    checkBtn.onclick = (function(index) {
      return function() { toggleDone(index); };
    })(i);

    var nameEl = document.createElement('div');
    nameEl.className = 'task-name';
    nameEl.textContent = task.text;
    nameEl.onclick = (function(index) {
      return function() { selectTask(index); };
    })(i);

    var pomoEl = document.createElement('div');
    pomoEl.className = 'task-pomos';
    pomoEl.textContent = task.pomos > 0 ? '🍅 ' + task.pomos : '';

    var delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = (function(index) {
      return function() { deleteTask(index); };
    })(i);

    item.appendChild(checkBtn);
    item.appendChild(nameEl);
    item.appendChild(pomoEl);
    item.appendChild(delBtn);
    list.appendChild(item);
  }
}

function toggleDone(index) {
  tasks[index].done = !tasks[index].done;
  saveTasksToStorage();
  renderTaskList();
}

function selectTask(index) {
  if (activeTaskIndex === index) {
    activeTaskIndex = -1;
    document.getElementById('active-task-label').textContent = 'nothing selected';
  } else {
    activeTaskIndex = index;
    document.getElementById('active-task-label').textContent = tasks[index].text;
  }
  renderTaskList();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  if (activeTaskIndex === index) {
    activeTaskIndex = -1;
    document.getElementById('active-task-label').textContent = 'nothing selected';
  } else if (activeTaskIndex > index) {
    activeTaskIndex = activeTaskIndex - 1;
  }
  saveTasksToStorage();
  renderTaskList();
}

function drawWeekChart() {
  var chart = document.getElementById('week-chart');
  var stats = getStatsFromStorage();
  var today = new Date();
  var dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  var days = [];

  for (var i = 6; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    days.push({ label: dayNames[d.getDay()], count: stats[key] || 0, isToday: i === 0 });
  }

  var maxCount = 1;
  for (var j = 0; j < days.length; j++) {
    if (days[j].count > maxCount) maxCount = days[j].count;
  }

  chart.innerHTML = '';

  for (var k = 0; k < days.length; k++) {
    var day = days[k];
    var heightPercent = (day.count / maxCount) * 100;

    var col = document.createElement('div');
    col.className = 'bar-col';

    var countEl = document.createElement('div');
    countEl.className = 'bar-count';
    countEl.textContent = day.count > 0 ? day.count : '';

    var track = document.createElement('div');
    track.className = 'bar-track';

    var fill = document.createElement('div');
    fill.className = 'bar-fill' + (day.isToday ? ' today' : '');
    fill.style.height = '0%';

    (function(el, h) {
      setTimeout(function() { el.style.height = h + '%'; }, 60);
    })(fill, heightPercent);

    track.appendChild(fill);

    var dayEl = document.createElement('div');
    dayEl.className = 'bar-day' + (day.isToday ? ' today' : '');
    dayEl.textContent = day.isToday ? 'Now' : day.label;

    col.appendChild(countEl);
    col.appendChild(track);
    col.appendChild(dayEl);
    chart.appendChild(col);
  }
}

function updateHeaderStats() {
  var stats = getStatsFromStorage();
  var today = getTodayKey();
  var todayCount = stats[today] || 0;
  document.getElementById('stat-today').textContent = todayCount;

  var weekTotal = 0;
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    weekTotal = weekTotal + (stats[key] || 0);
  }
  document.getElementById('stat-week').textContent = weekTotal;

  var streak = 0;
  var checkDate = new Date();
  while (true) {
    var checkKey = checkDate.toISOString().slice(0, 10);
    if (stats[checkKey] && stats[checkKey] > 0) {
      streak = streak + 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  document.getElementById('stat-streak').textContent = streak;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  var btn = document.getElementById('sound-btn');
  if (soundEnabled) {
    btn.textContent = '🔔 Sound On';
    btn.classList.remove('off');
  } else {
    btn.textContent = '🔕 Sound Off';
    btn.classList.add('off');
  }
}

function playBeep() {
  if (!soundEnabled) return;
  try {
    var ctx = new AudioContext();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {}
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function savePomoToStorage() {
  var stats = getStatsFromStorage();
  var key = getTodayKey();
  stats[key] = (stats[key] || 0) + 1;
  localStorage.setItem('ff_stats', JSON.stringify(stats));
}

function getStatsFromStorage() {
  var raw = localStorage.getItem('ff_stats');
  if (raw) return JSON.parse(raw);
  return {};
}

function saveTasksToStorage() {
  localStorage.setItem('ff_tasks', JSON.stringify(tasks));
}

function loadTasksFromStorage() {
  var raw = localStorage.getItem('ff_tasks');
  if (raw) tasks = JSON.parse(raw);
}

function saveSettingsToStorage() {
  localStorage.setItem('ff_settings', JSON.stringify(settings));
}

function loadSettingsFromStorage() {
  var raw = localStorage.getItem('ff_settings');
  if (raw) {
    settings = JSON.parse(raw);
    document.getElementById('set-focus').value = settings.focus;
    document.getElementById('set-short').value = settings.short;
    document.getElementById('set-long').value = settings.long;
    document.getElementById('set-rounds').value = settings.rounds;
  }
}

loadTasksFromStorage();
loadSettingsFromStorage();

secondsLeft = settings.focus * 60;
totalSeconds = secondsLeft;

updateTimerDisplay();
updateRing();
updateDots();
renderTaskList();
drawWeekChart();
updateHeaderStats();


