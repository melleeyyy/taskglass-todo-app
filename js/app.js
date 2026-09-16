/* ============================================================
   TaskGlass — App logic
   Vanilla JS · localStorage persistence · No dependencies
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Storage & State ---------------- */
  const LS_TASKS = "taskglass.tasks";
  const LS_CATS = "taskglass.categories";
  const LS_SETTINGS = "taskglass.settings";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const DEFAULT_SETTINGS = {
    theme: "dark",
    accent: "#6366f1",
    glass: 70,
    radius: 18,
    fontSize: 15,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    compact: false,
    animations: true,
    background: "aurora",
    defaultView: "all",
    defaultSort: "manual",
    showCompleted: true,
    confirmDelete: true,
    sound: true,
    confetti: true,
    notifications: false,
    weekStart: "1",
  };

  const DEFAULT_CATS = [
    { id: "personal", name: "Personal", color: "#22d3ee" },
    { id: "work", name: "Work", color: "#f59e0b" },
    { id: "shopping", name: "Shopping", color: "#10b981" },
    { id: "health", name: "Health", color: "#ef4444" },
  ];

  let settings = load(LS_SETTINGS, DEFAULT_SETTINGS);
  let categories = load(LS_CATS, DEFAULT_CATS);
  let tasks = load(LS_TASKS, []);

  let state = {
    view: "all",           // all | today | upcoming | important | completed | cat:<id>
    filter: "all",         // all | active | completed | high | today-due | overdue
    search: "",
    sort: settings.defaultSort || "manual",
    draggingId: null,
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return val == null ? fallback : val;
    } catch { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  const saveTasks = () => save(LS_TASKS, tasks);
  const saveCats = () => save(LS_CATS, categories);
  const saveSettings = () => save(LS_SETTINGS, settings);

  /* ---------------- Date helpers ---------------- */
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const isToday = (t) => t.due === todayStr();
  const isOverdue = (t) => t.due && t.due < todayStr() && !t.completed;
  const isUpcoming = (t) => t.due && t.due > todayStr() && !t.completed;

  function fmtDue(t) {
    if (!t.due) return "";
    const today = todayStr();
    if (t.due === today) return "Today";
    const d = new Date(t.due + "T00:00");
    const diff = Math.round((d - new Date(today + "T00:00")) / 86400000);
    if (diff === -1) return "Yesterday";
    if (diff === 1) return "Tomorrow";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + (t.dueTime ? ` · ${t.dueTime}` : "");
  }

  /* ---------------- Audio (WebAudio beeps) ---------------- */
  let audioCtx = null;
  function playSound(type) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      const freqs = { click: 600, success: [523, 784], error: 220 };
      const now = audioCtx.currentTime;
      if (type === "success") {
        o.frequency.setValueAtTime(523, now);
        o.frequency.setValueAtTime(784, now + 0.09);
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.start(now); o.stop(now + 0.25);
      } else {
        o.frequency.value = freqs[type] || 500;
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o.start(now); o.stop(now + 0.13);
      }
    } catch { /* audio unavailable */ }
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, tone = "default") {
    const el = document.createElement("div");
    el.className = "toast glass";
    el.style.color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--text)";
    el.textContent = msg;
    $("#toastWrap").appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  /* ---------------- Confetti ---------------- */
  const canvas = $("#confettiCanvas"), ctx = canvas.getContext("2d");
  let confettiPieces = [];
  function sizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener("resize", sizeCanvas); sizeCanvas();
  function burstConfetti() {
    if (!settings.confetti) return;
    const colors = [settings.accent, "#f59e0b", "#10b981", "#ec4899", "#0ea5e9"];
    for (let i = 0; i < 90; i++) {
      confettiPieces.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 11, vy: Math.random() * -12 - 3,
        size: Math.random() * 7 + 3, color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1,
      });
    }
    requestAnimationFrame(confettiFrame);
  }
  function confettiFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces = confettiPieces.filter(p => p.life > 0);
    confettiPieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rot += p.vr; p.life -= 0.011;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (confettiPieces.length) requestAnimationFrame(confettiFrame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ---------------- Settings application ---------------- */
  function applySettings() {
    // theme
    let theme = settings.theme;
    if (theme === "system") {
      theme = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    document.documentElement.dataset.theme = theme;

    document.documentElement.style.setProperty("--accent", settings.accent);
    document.documentElement.style.setProperty("--accent-soft", hexToRgba(settings.accent, 0.2));
    document.documentElement.style.setProperty("--radius", settings.radius + "px");
    document.documentElement.style.setProperty("--glass", settings.glass);
    document.documentElement.style.setProperty("--font-size", settings.fontSize + "px");
    document.documentElement.style.setProperty("--font-family", settings.fontFamily);

    document.body.classList.toggle("compact", settings.compact);
    document.body.classList.toggle("no-anim", !settings.animations);
    document.body.classList.remove("bg-plain", "bg-none");
    if (settings.background === "plain") document.body.classList.add("bg-plain");
    if (settings.background === "none") document.body.classList.add("bg-none");

    const isDark = document.documentElement.dataset.theme === "dark";
    $("#quickThemeIcon").textContent = isDark ? "🌙" : "☀️";
    $("#quickThemeLabel").textContent = isDark ? "Dark Mode" : "Light Mode";

    $("#glassValue").textContent = settings.glass;
    $("#radiusValue").textContent = settings.radius;
    $("#fontValue").textContent = settings.fontSize;
    $("#storageInfo").textContent = storageUsage();
  }

  function hexToRgba(hex, a) {
    const m = hex.replace("#", "");
    const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
    const n = parseInt(v, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function storageUsage() {
    let total = 0;
    [LS_TASKS, LS_CATS, LS_SETTINGS].forEach(k => total += (localStorage.getItem(k) || "").length);
    const kb = (total / 1024).toFixed(1);
    return kb < 1024 ? `${kb} KB used` : `${(kb / 1024).toFixed(2)} MB used`;
  }

  /* ---------------- Rendering ---------------- */
  function render() {
    renderStats();
    renderCategories();
    renderTasks();
  }

  function renderStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(isOverdue).length;
    const today = tasks.filter(t => !t.completed && (isToday(t) || (t.due && t.due < todayStr()))).length;
    const upcoming = tasks.filter(isUpcoming).length;
    const imp = tasks.filter(t => t.starred && !t.completed).length;

    $("#statTotal").textContent = total;
    $("#statCompleted").textContent = done;
    $("#sTotal").textContent = total;
    $("#sPending").textContent = total - done;
    $("#sDone").textContent = done;
    $("#sOverdue").textContent = overdue;
    $("#countAll").textContent = total;
    $("#countToday").textContent = today;
    $("#countUpcoming").textContent = upcoming;
    $("#countImportant").textContent = imp;
    $("#countCompleted").textContent = done;

    const pct = total ? Math.round((done / total) * 100) : 0;
    $("#progressPercent").textContent = pct + "%";
    const C = 2 * Math.PI * 52;
    $("#progressRing").style.strokeDashoffset = C - (C * pct) / 100;
  }

  function renderCategories() {
    const listEl = $("#categoryList");
    const manageEl = $("#catManageList");
    const catSel = $("#taskCategory");

    // sidebar list
    listEl.innerHTML = categories.map(c => {
      const active = state.view === "cat:" + c.id ? "active" : "";
      const n = tasks.filter(t => t.category === c.id && !t.completed).length;
      return `<button class="cat-item ${active}" data-cat="${c.id}">
        <span class="cat-dot" style="background:${c.color}"></span> ${esc(c.name)}
        <span class="count">${n}</span></button>`;
    }).join("");

    // manage list
    manageEl.innerHTML = categories.map(c => {
      const n = tasks.filter(t => t.category === c.id).length;
      return `<li>
        <span class="cat-dot" style="background:${c.color}"></span>
        <span class="cat-name">${esc(c.name)} <small>(${n} task${n === 1 ? "" : "s"})</small></span>
        <button class="icon-btn" data-delcat="${c.id}" title="Delete category">🗑</button>
      </li>`;
    }).join("") || `<li style="color:var(--text-dim);padding:10px">No categories yet.</li>`;

    // task modal select
    catSel.innerHTML = categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  }

  function visibleTasks() {
    let list = [...tasks];

    // view
    if (state.view === "today") list = list.filter(t => !t.completed && (isToday(t) || (t.due && t.due < todayStr())));
    else if (state.view === "upcoming") list = list.filter(isUpcoming);
    else if (state.view === "important") list = list.filter(t => t.starred && !t.completed);
    else if (state.view === "completed") list = list.filter(t => t.completed);
    else if (state.view.startsWith("cat:")) list = list.filter(t => t.category === state.view.slice(4));

    // filter chips
    if (state.filter === "active") list = list.filter(t => !t.completed);
    else if (state.filter === "completed") list = list.filter(t => t.completed);
    else if (state.filter === "high") list = list.filter(t => t.priority === "high" && !t.completed);
    else if (state.filter === "today-due") list = list.filter(t => isToday(t) && !t.completed);
    else if (state.filter === "overdue") list = list.filter(isOverdue);

    if (!settings.showCompleted) list = list.filter(t => !t.completed);

    // search
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(t => (t.title + " " + (t.notes || "")).toLowerCase().includes(q));
    }

    // sort
    const pri = { high: 3, medium: 2, low: 1 };
    const by = state.sort;
    if (by === "manual") {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else if (by === "created-desc") list.sort((a, b) => b.created - a.created);
    else if (by === "created-asc") list.sort((a, b) => a.created - b.created);
    else if (by === "due-asc") list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    else if (by === "due-desc") list.sort((a, b) => (b.due || "").localeCompare(a.due || ""));
    else if (by === "priority-desc") list.sort((a, b) => pri[b.priority] - pri[a.priority]);
    else if (by === "priority-asc") list.sort((a, b) => pri[a.priority] - pri[b.priority]);
    else if (by === "alpha") list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  }

  function renderTasks() {
    const list = visibleTasks();
    const ul = $("#taskList");
    const empty = $("#emptyState");
    empty.classList.toggle("show", list.length === 0);

    ul.innerHTML = list.map(t => {
      const cat = categories.find(c => c.id === t.category);
      const dueTxt = fmtDue(t);
      const overdueCls = isOverdue(t) ? "overdue" : isToday(t) && !t.completed ? "today" : "";
      return `<li class="task-item glass ${t.completed ? "completed" : ""}" data-id="${t.id}" draggable="${state.sort === "manual"}">
        <span class="task-drag" title="Drag to reorder">⋮⋮</span>
        <button class="task-check" data-toggle="${t.id}" title="Toggle complete">${t.completed ? "✓" : ""}</button>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ""}
          <div class="task-meta">
            ${cat ? `<span class="tag tag-cat" style="--cat:${cat.color}">● ${esc(cat.name)}</span>` : ""}
            <span class="tag tag-pri-${t.priority}">${{low: "Low", medium: "Med", high: "High"}[t.priority]}</span>
            ${dueTxt ? `<span class="tag tag-due ${overdueCls}">🗓 ${dueTxt}${isOverdue(t) ? " · overdue" : ""}</span>` : ""}
          </div>
        </div>
        ${t.starred ? `<span class="task-star" title="Important">⭐</span>` : ""}
        <div class="task-actions">
          <button class="icon-btn" data-star="${t.id}" title="Important">${t.starred ? "★" : "☆"}</button>
          <button class="icon-btn" data-edit="${t.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${t.id}" title="Delete">🗑</button>
        </div>
      </li>`;
    }).join("");
  }

  function esc(s) {
    const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;", "'": "&" + "#39;" };
    return String(s ?? "").replace(/[&<>"']/g, c => map[c]);
  }

  function updateViewTitle() {
    const titles = {
      all: "All Tasks", today: "Today", upcoming: "Upcoming",
      important: "Important", completed: "Completed",
    };
    let title = titles[state.view];
    if (!title && state.view.startsWith("cat:")) {
      const c = categories.find(x => x.id === state.view.slice(4));
      title = c ? c.name : "Category";
    }
    $("#viewTitle").textContent = title || "Tasks";
    const now = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("#viewDate").textContent = now;
  }

  /* ---------------- Task CRUD ---------------- */
  function openTaskModal(id) {
    const t = id ? tasks.find(x => x.id === id) : null;
    $("#taskModalTitle").textContent = t ? "Edit Task" : "New Task";
    $("#btnSaveTask").textContent = t ? "Update Task" : "Save Task";
    $("#taskId").value = t ? t.id : "";
    $("#taskTitle").value = t ? t.title : "";
    $("#taskNotes").value = t ? (t.notes || "") : "";
    $("#taskPriority").value = t ? t.priority : "medium";
    $("#taskCategory").value = t ? t.category : (categories[0] ? categories[0].id : "");
    $("#taskDue").value = t ? (t.due || "") : "";
    $("#taskDueTime").value = t ? (t.dueTime || "") : "";
    $("#taskStarred").checked = t ? !!t.starred : false;
    openModal("taskModal");
    setTimeout(() => $("#taskTitle").focus(), 60);
  }

  function submitTask(e) {
    e.preventDefault();
    const id = $("#taskId").value;
    const data = {
      title: $("#taskTitle").value.trim(),
      notes: $("#taskNotes").value.trim(),
      priority: $("#taskPriority").value,
      category: $("#taskCategory").value,
      due: $("#taskDue").value || "",
      dueTime: $("#taskDueTime").value || "",
      starred: $("#taskStarred").checked,
    };
    if (!data.title) return;

    if (id) {
      const t = tasks.find(x => x.id === id);
      Object.assign(t, data);
      toast("Task updated", "success");
    } else {
      tasks.push({ id: uid(), ...data, completed: false, created: Date.now(), order: tasks.length });
      toast("Task added", "success");
    }
    saveTasks(); closeModal("taskModal"); render(); playSound("click");
  }

  function toggleTask(id) {
    const t = tasks.find(x => x.id === id);
    t.completed = !t.completed;
    t.completedAt = t.completed ? Date.now() : null;
    saveTasks(); render();
    if (t.completed) { playSound("success"); burstConfetti(); toast("Nice! Task completed 🎉", "success"); }
    else playSound("click");
  }

  function deleteTask(id) {
    const t = tasks.find(x => x.id === id);
    const doDel = () => {
      tasks = tasks.filter(x => x.id !== id);
      saveTasks(); render(); playSound("click"); toast("Task deleted", "danger");
    };
    if (settings.confirmDelete) {
      if (confirm(`Delete "${t.title}"?`)) doDel();
    } else doDel();
  }

  function toggleStar(id) {
    const t = tasks.find(x => x.id === id);
    t.starred = !t.starred;
    saveTasks(); render(); playSound("click");
  }

  /* ---------------- Drag reorder ---------------- */
  function onDragStart(e) {
    const li = e.target.closest(".task-item");
    if (!li) return;
    state.draggingId = li.dataset.id;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", state.draggingId);
  }
  function onDragOver(e) {
    if (!state.draggingId) return;
    e.preventDefault();
    const li = e.target.closest(".task-item");
    $$(".task-item").forEach(el => el.style.borderTop = "");
    if (li && li.dataset.id !== state.draggingId) li.style.borderTop = "2px solid var(--accent)";
  }
  function onDrop(e) {
    e.preventDefault();
    const target = e.target.closest(".task-item");
    $$(".task-item").forEach(el => { el.style.borderTop = ""; el.classList.remove("dragging"); });
    if (!target || !state.draggingId || target.dataset.id === state.draggingId) return;
    const from = tasks.findIndex(t => t.id === state.draggingId);
    const to = tasks.findIndex(t => t.id === target.dataset.id);
    const [moved] = tasks.splice(from, 1);
    tasks.splice(to, 0, moved);
    tasks.forEach((t, i) => t.order = i);
    state.draggingId = null;
    saveTasks(); render();
  }

  /* ---------------- Categories ---------------- */
  function addCategory(e) {
    e.preventDefault();
    const name = $("#catName").value.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast("Category already exists", "danger"); return; }
    categories.push({ id: uid(), name, color: $("#catColor").value });
    $("#catName").value = "";
    saveCats(); renderCategories(); playSound("click"); toast("Category added", "success");
  }

  function deleteCategory(id) {
    const cat = categories.find(c => c.id === id);
    if (!confirm(`Delete category "${cat.name}"? Tasks will be moved to the first remaining category.`)) return;
    const fallback = categories.find(c => c.id !== id);
    tasks.forEach(t => { if (t.category === id) t.category = fallback ? fallback.id : ""; });
    categories = categories.filter(c => c.id !== id);
    if (state.view === "cat:" + id) { state.view = "all"; syncNav(); }
    saveTasks(); saveCats(); render(); playSound("click");
  }

  /* ---------------- Modals ---------------- */
  function openModal(id) { $("#" + id).classList.add("open"); }
  function closeModal(id) { $("#" + id).classList.remove("open"); }

  /* ---------------- Notifications ---------------- */
  let notified = new Set();
  setInterval(() => {
    if (!settings.notifications || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    tasks.forEach(t => {
      if (t.completed || !t.due) return;
      const dueHM = t.dueTime || "09:00";
      if (t.due === todayStr() && dueHM <= nowHM && !notified.has(t.id)) {
        notified.add(t.id);
        new Notification("TaskGlass reminder", { body: `⏰ Due now: ${t.title}` });
      }
    });
  }, 30000);

  /* ---------------- Settings wiring ---------------- */
  function initSettingsUI() {
    // theme segmented
    $$("#setTheme button").forEach(b => {
      b.classList.toggle("active", b.dataset.value === settings.theme);
      b.onclick = () => {
        settings.theme = b.dataset.value;
        if (settings.theme === "system" || settings.notifications) { /* noop */ }
        saveSettings(); applySettings(); initSettingsUI();
        playSound("click");
      };
    });
    // accent
    $$("#setAccent .swatch").forEach(s => {
      s.classList.toggle("active", s.dataset.color === settings.accent);
      s.onclick = () => { settings.accent = s.dataset.color; saveSettings(); applySettings(); initSettingsUI(); playSound("click"); };
    });
    const custom = $("#setAccentCustom");
    custom.value = settings.accent;
    custom.oninput = () => { settings.accent = custom.value; saveSettings(); applySettings(); $$("#setAccent .swatch").forEach(s => s.classList.remove("active")); };

    bindRange("setGlass", "glass");
    bindRange("setRadius", "radius");
    bindRange("setFont", "fontSize");
    bindSelect("setFontFamily", "fontFamily");
    bindSelect("setBackground", "background");
    bindSelect("setDefaultView", "defaultView");
    bindSelect("setSort", "defaultSort");
    bindSelect("setWeek", "weekStart");
    bindCheck("setCompact", "compact");
    bindCheck("setAnimations", "animations");
    bindCheck("setShowCompleted", "showCompleted");
    bindCheck("setConfirmDelete", "confirmDelete");
    bindCheck("setSound", "sound");
    bindCheck("setConfetti", "confetti");
    bindCheck("setNotifications", "notifications", async (v) => {
      if (v && "Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    });

    $("#storageInfo").textContent = storageUsage();
  }

  function bindRange(id, key) {
    const el = $("#" + id);
    el.value = settings[key];
    el.oninput = () => { settings[key] = +el.value; saveSettings(); applySettings(); };
  }
  function bindSelect(id, key) {
    const el = $("#" + id);
    el.value = settings[key];
    el.onchange = () => { settings[key] = el.value; saveSettings(); applySettings(); };
  }
  function bindCheck(id, key, after) {
    const el = $("#" + id);
    el.checked = !!settings[key];
    el.onchange = () => {
      settings[key] = el.checked; saveSettings(); applySettings();
      if (after) after(el.checked);
      if (key === "showCompleted") render();
    };
  }

  /* ---------------- Export / Import / Reset ---------------- */
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "TaskGlass", version: 1, exportedAt: new Date().toISOString(), tasks, categories, settings }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taskglass-backup-${todayStr()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast("Backup downloaded", "success");
  }

  function importData(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data.tasks)) throw 0;
        tasks = data.tasks; categories = data.categories || DEFAULT_CATS;
        settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
        saveTasks(); saveCats(); saveSettings();
        applySettings(); initSettingsUI(); render();
        toast("Data imported successfully", "success");
      } catch { toast("Invalid backup file", "danger"); }
    };
    r.readAsText(file);
  }

  function resetAll() {
    if (!confirm("This will permanently delete ALL tasks, categories and settings. Continue?")) return;
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    localStorage.removeItem(LS_TASKS); localStorage.removeItem(LS_CATS); localStorage.removeItem(LS_SETTINGS);
    tasks = []; categories = DEFAULT_CATS; settings = { ...DEFAULT_SETTINGS };
    state.view = settings.defaultView; state.filter = "all"; state.sort = settings.defaultSort;
    applySettings(); initSettingsUI(); render(); syncNav();
    toast("All data has been reset", "danger");
  }

  /* ---------------- Navigation ---------------- */
  function syncNav() {
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
    updateViewTitle();
  }

  /* ---------------- Event wiring ---------------- */
  function init() {
    // nav
    $("#nav").addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-item");
      if (!btn) return;
      state.view = btn.dataset.view; syncNav(); render();
      $("#sidebar").classList.remove("open");
      playSound("click");
    });

    $("#categoryList").addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-item");
      if (!btn) return;
      state.view = "cat:" + btn.dataset.cat; state.filter = "all";
      $$(".chip").forEach(c => c.classList.toggle("active", c.dataset.filter === "all"));
      syncNav(); render(); $("#sidebar").classList.remove("open");
    });

    $("#catManageList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delcat]");
      if (btn) deleteCategory(btn.dataset.delcat);
    });

    // task list events (delegation)
    $("#taskList").addEventListener("click", (e) => {
      const tg = e.target.closest("[data-toggle]"); if (tg) return toggleTask(tg.dataset.toggle);
      const ed = e.target.closest("[data-edit]"); if (ed) return openTaskModal(ed.dataset.edit);
      const de = e.target.closest("[data-del]"); if (de) return deleteTask(de.dataset.del);
      const st = e.target.closest("[data-star]"); if (st) return toggleStar(st.dataset.star);
    });
    $("#taskList").addEventListener("dragstart", onDragStart);
    $("#taskList").addEventListener("dragover", onDragOver);
    $("#taskList").addEventListener("drop", onDrop);
    $("#taskList").addEventListener("dragend", () => $$(".task-item").forEach(el => { el.classList.remove("dragging"); el.style.borderTop = ""; }));

    // filters
    $("#filterChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip"); if (!chip) return;
      state.filter = chip.dataset.filter;
      $$(".chip").forEach(c => c.classList.toggle("active", c === chip));
      render(); playSound("click");
    });

    // search & sort
    $("#searchInput").addEventListener("input", (e) => { state.search = e.target.value; render(); });
    $("#sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

    // modal closers
    $$("[data-close]").forEach(b => b.onclick = () => closeModal(b.dataset.close));
    $$(".modal-overlay").forEach(ov => ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $$(".modal-overlay.open").forEach(m => m.classList.remove("open"));
      if (e.key.toLowerCase() === "n" && !/input|textarea|select/i.test(document.activeElement.tagName) && !$(".modal-overlay.open")) { e.preventDefault(); openTaskModal(); }
    });

    // forms
    $("#taskForm").addEventListener("submit", submitTask);
    $("#catForm").addEventListener("submit", addCategory);

    // buttons
    $("#btnAddTask").onclick = () => openTaskModal();
    $("#btnOpenSettings").onclick = () => { initSettingsUI(); openModal("settingsModal"); };
    $("#btnManageCats").onclick = () => openModal("catModal");
    $("#btnExport").onclick = exportData;
    $("#btnImport").onclick = () => $("#importFile").click();
    $("#importFile").onchange = (e) => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ""; };
    $("#btnReset").onclick = resetAll;
    $("#btnSidebarToggle").onclick = () => $("#sidebar").classList.toggle("open");

    // quick theme toggle (matches settings segmented)
    $("#btnQuickTheme").onclick = () => {
      const cur = document.documentElement.dataset.theme;
      settings.theme = cur === "dark" ? "light" : "dark";
      saveSettings(); applySettings(); initSettingsUI(); playSound("click");
    };

    // system theme reaction
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (settings.theme === "system") applySettings(); });

    // boot
    state.view = settings.defaultView || "all";
    state.sort = settings.defaultSort || "manual";
    $("#sortSelect").value = state.sort;
    applySettings();
    syncNav();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
