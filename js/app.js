/* ============================================================
   WattWise — Dashboard Engine
   Sections: session, appliance data, calc engine, intelligence,
   charts, recommendations, target bill, tracker, history
   ============================================================ */

const USERS_KEY = "wattwise_users";
const SESSION_KEY = "currentUser";

const APPLIANCES = [
  { key: "AC", label: "AC", icon: "❄️", defaultWatt: 1500, defaultHours: 6 },
  { key: "Fan", label: "Fan", icon: "🌀", defaultWatt: 75, defaultHours: 8 },
  { key: "TV", label: "TV", icon: "📺", defaultWatt: 120, defaultHours: 4 },
  { key: "Computer", label: "Computer", icon: "🖥️", defaultWatt: 200, defaultHours: 5 },
  { key: "Lights", label: "Lights", icon: "💡", defaultWatt: 60, defaultHours: 6 },
  { key: "Miscellaneous", label: "Miscellaneous", icon: "🔌", defaultWatt: 100, defaultHours: 3 },
];

let charts = {};
let trackerAppliances = [];

/* ---------------- Session ---------------- */
function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getCurrentUsername() { return localStorage.getItem(SESSION_KEY); }
function getCurrentUser() {
  const users = getUsers();
  return users[getCurrentUsername()];
}
function updateCurrentUser(mutator) {
  const users = getUsers();
  const name = getCurrentUsername();
  if (!users[name]) return;
  mutator(users[name]);
  saveUsers(users);
}
function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}
function requireSession() {
  const name = getCurrentUsername();
  const users = getUsers();
  if (!name || !users[name]) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  if (!requireSession()) return;

  const name = getCurrentUsername();
  const initials = name.slice(0, 2).toUpperCase();
  const avatarEl = document.getElementById("avatarInitials");
  if (avatarEl) avatarEl.textContent = initials;

  if (document.getElementById("applianceList")) {
    renderApplianceInputs();
    initCharts();
    recalculate();
  }
});

/* ---------------- Appliance Inputs ---------------- */
function renderApplianceInputs() {
  const container = document.getElementById("applianceList");
  container.innerHTML = APPLIANCES.map(a => `
    <div class="appliance-row" data-key="${a.key}">
      <div class="appliance-name"><span class="appliance-icon">${a.icon}</span> ${a.label}</div>
      <input type="number" min="0" value="${a.defaultWatt}" id="watt-${a.key}" oninput="recalculate()">
      <input type="number" min="0" step="0.1" value="${a.defaultHours}" id="hours-${a.key}" oninput="recalculate()">
      <div class="mini-result" id="mini-${a.key}">0 U/day</div>
      <div></div>
    </div>
  `).join("");
}

function getApplianceInputs() {
  return APPLIANCES.map(a => {
    const watt = parseFloat(document.getElementById(`watt-${a.key}`)?.value) || 0;
    const hours = parseFloat(document.getElementById(`hours-${a.key}`)?.value) || 0;
    const dailyUnits = (watt * hours) / 1000;
    return { ...a, watt, hours, dailyUnits };
  });
}

/* ---------------- Calculation Engine ---------------- */
function recalculate() {
  const appliances = getApplianceInputs();
  const pricePerUnit = parseFloat(document.getElementById("pricePerUnit").value) || 0;
  const monthlyTarget = parseFloat(document.getElementById("monthlyTarget").value) || 0;
  const billingPeriod = parseFloat(document.getElementById("billingPeriod").value) || 30;
  const daysElapsed = Math.min(parseFloat(document.getElementById("daysElapsed").value) || 1, billingPeriod);

  const totalDailyUnits = appliances.reduce((s, a) => s + a.dailyUnits, 0);
  const netUnits = totalDailyUnits * daysElapsed;                 // accumulated so far
  const estimatedPrice = netUnits * pricePerUnit;
  const projectedMonthly = totalDailyUnits * billingPeriod;
  const diff = projectedMonthly - monthlyTarget;

  // Update appliance mini-results
  appliances.forEach(a => {
    const el = document.getElementById(`mini-${a.key}`);
    if (el) el.textContent = `${a.dailyUnits.toFixed(2)} U/day`;
  });

  // Stat cards
  setText("statToday", `${totalDailyUnits.toFixed(2)} Units`, true);
  setText("statNet", `${netUnits.toFixed(1)} Units`, true);
  setText("statPrice", `₹${estimatedPrice.toFixed(0)}`);
  setText("statTarget", `${monthlyTarget.toFixed(0)} Units`, true);

  // Intelligence
  setText("intelAvgDaily", `${totalDailyUnits.toFixed(2)} U/day`);
  setText("intelProjected", `${projectedMonthly.toFixed(0)} Units`);
  setText("intelTarget", `${monthlyTarget.toFixed(0)} Units`);
  setText("intelDiff", `${Math.abs(diff).toFixed(0)} Units`);

  const banner = document.getElementById("intelBanner");
  const icon = document.getElementById("intelIcon");
  const headline = document.getElementById("intelHeadline");
  const sub = document.getElementById("intelSub");
  const progress = document.getElementById("intelProgress");

  const pct = monthlyTarget > 0 ? Math.min((projectedMonthly / monthlyTarget) * 100, 140) : 0;
  progress.style.width = `${Math.min(pct, 100)}%`;

  let status = "safe";
  if (monthlyTarget > 0) {
    const ratio = projectedMonthly / monthlyTarget;
    if (ratio > 1) status = "danger";
    else if (ratio >= 0.9) status = "warn";
    else status = "safe";
  }

  banner.className = `intel-banner ${status}`;
  progress.className = `progress-fill ${status === "safe" ? "" : status}`;

  if (status === "danger") {
    icon.textContent = "🚨";
    headline.textContent = `At your current rate, you'll cross your monthly target by ${Math.abs(diff).toFixed(0)} units.`;
    sub.textContent = "Consider reducing your highest-consuming appliance today.";
  } else if (status === "warn") {
    icon.textContent = "⚠";
    headline.textContent = `You're getting close to your monthly target.`;
    sub.textContent = `Projected usage is within ${Math.abs(diff).toFixed(0)} units of your target.`;
  } else {
    icon.textContent = "✓";
    headline.textContent = `At your current rate, you're on track to remain ${Math.abs(diff).toFixed(0)} units below your monthly target.`;
    sub.textContent = "Keep up the current usage pattern.";
  }

  // Distribution + breakdown + charts + recs
  const withPct = appliances.map(a => ({
    ...a,
    pct: totalDailyUnits > 0 ? (a.dailyUnits / totalDailyUnits) * 100 : 0,
    monthlyUnits: a.dailyUnits * billingPeriod,
    monthlyCost: a.dailyUnits * billingPeriod * pricePerUnit,
  }));

  renderBreakdown(withPct);
  updateApplianceChart(withPct);
  updateTrendChart(totalDailyUnits);
  updateTargetChart(monthlyTarget, netUnits, projectedMonthly);
  renderRecommendations(withPct, pricePerUnit, diff, status, billingPeriod);

  // Target bill
  computeTargetBill(pricePerUnit);

  // Tracker
  updateTracker(monthlyTarget, billingPeriod, totalDailyUnits);

  // stash for save/report + notifications
  window._wattwiseState = { appliances: withPct, pricePerUnit, monthlyTarget, billingPeriod, daysElapsed, totalDailyUnits, netUnits, estimatedPrice, projectedMonthly, diff, status };

  checkNotificationTriggers(status, diff);

  // Persist a "live" snapshot so other pages (Smart Planner) can read latest inputs
  const currentBill = parseFloat(document.getElementById("currentBill")?.value) || 0;
  const targetBill = parseFloat(document.getElementById("targetBill")?.value) || 0;
  localStorage.setItem(`wattwise_live_${getCurrentUsername()}`, JSON.stringify({
    appliances: withPct, pricePerUnit, monthlyTarget, billingPeriod, currentBill, targetBill
  }));
}

function getLiveState() {
  const raw = localStorage.getItem(`wattwise_live_${getCurrentUsername()}`);
  return raw ? JSON.parse(raw) : null;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = text;
}

/* ---------------- Breakdown List ---------------- */
function renderBreakdown(withPct) {
  const container = document.getElementById("breakdownList");
  if (!container) return;
  const sorted = [...withPct].sort((a, b) => b.pct - a.pct);
  container.innerHTML = sorted.map(a => `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--glass-border)">
      <div style="width:34px">${a.icon}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;font-size:13.5px;font-weight:600;margin-bottom:6px">
          <span>${a.label}</span><span>${a.pct.toFixed(0)}%</span>
        </div>
        <div class="progress-track" style="height:6px;margin-top:0">
          <div class="progress-fill" style="width:${a.pct.toFixed(1)}%"></div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;color:var(--text-dim);min-width:90px">
        ${a.monthlyUnits.toFixed(1)} U<br>₹${a.monthlyCost.toFixed(0)}
      </div>
    </div>
  `).join("");
}

/* ---------------- Charts ---------------- */
function initCharts() {
  const cyan = "#22e5ec", violet = "#6c8cff", warn = "#ffc35a", danger = "#ff6b6b", soft = "#5eead4", dim="#8b6cff";
  const palette = [cyan, soft, violet, warn, "#ff9f6c", "#7c8aa5"];

  Chart.defaults.color = "#a9bcd6";
  Chart.defaults.font.family = "'Poppins', sans-serif";

  const dCtx = document.getElementById("applianceChart");
  if (dCtx) {
    charts.appliance = new Chart(dCtx, {
      type: "doughnut",
      data: { labels: APPLIANCES.map(a => a.label), datasets: [{ data: APPLIANCES.map(() => 0), backgroundColor: palette, borderColor: "#0a1120", borderWidth: 3 }] },
      options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14, font: { size: 11.5 } } } }, cutout: "62%" }
    });
  }

  const tCtx = document.getElementById("trendChart");
  if (tCtx) {
    charts.trend = new Chart(tCtx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{ label: "Daily Units", data: [0,0,0,0,0,0,0], borderColor: cyan, backgroundColor: "rgba(34,229,236,0.12)", fill: true, tension: 0.4, pointBackgroundColor: cyan, pointRadius: 4 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(255,255,255,0.05)" } }, y: { grid: { color: "rgba(255,255,255,0.05)" } } } }
    });
  }

  const gCtx = document.getElementById("targetChart");
  if (gCtx) {
    charts.target = new Chart(gCtx, {
      type: "bar",
      data: { labels: ["Target", "Current (Net)", "Projected"], datasets: [{ data: [0,0,0], backgroundColor: [violet, cyan, warn], borderRadius: 8, barThickness: 60 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,0.05)" } } } }
    });
  }
}

function updateApplianceChart(withPct) {
  if (!charts.appliance) return;
  charts.appliance.data.datasets[0].data = withPct.map(a => Number(a.dailyUnits.toFixed(3)));
  charts.appliance.update();
}

function updateTrendChart(totalDailyUnits) {
  if (!charts.trend) return;
  // Simulated week trend seeded around today's usage (deterministic, no fake randomness claims)
  const variance = [0.92, 1.04, 0.85, 1.1, 0.97, 1.15, 0.9];
  charts.trend.data.datasets[0].data = variance.map(v => Number((totalDailyUnits * v).toFixed(2)));
  charts.trend.update();
}

function updateTargetChart(target, net, projected) {
  if (!charts.target) return;
  charts.target.data.datasets[0].data = [target, Number(net.toFixed(1)), Number(projected.toFixed(1))];
  charts.target.update();
}

/* ---------------- Recommendations ---------------- */
function renderRecommendations(withPct, pricePerUnit, diff, status, billingPeriod) {
  const container = document.getElementById("recCards");
  if (!container) return;
  if (withPct.every(a => a.dailyUnits === 0)) {
    container.innerHTML = `<div class="empty-state glass-card" style="grid-column:1/-1"><div class="glyph">🔌</div><p>Enter appliance runtime above to generate recommendations.</p></div>`;
    return;
  }

  const top = [...withPct].sort((a, b) => b.dailyUnits - a.dailyUnits)[0];
  const reduceHours = top.hours >= 1 ? 1 : 0.5;
  const savedDailyUnits = (top.watt * reduceHours) / 1000;
  const savedMonthlyUnits = savedDailyUnits * billingPeriod;
  const savedMoney = savedMonthlyUnits * pricePerUnit;

  const cards = [];

  cards.push(`
    <div class="glass-card rec-card">
      <div class="rec-icon">🔥</div>
      <h3>Biggest Energy Consumer</h3>
      <div class="rec-body"><b>${top.label}</b> — ${top.pct.toFixed(0)}% of your daily consumption.<br>
      Reduce ${top.label} runtime by ${reduceHours === 1 ? "1 hour" : "30 minutes"}/day.</div>
    </div>
  `);

  cards.push(`
    <div class="glass-card rec-card">
      <div class="rec-icon">💰</div>
      <h3>Potential Saving</h3>
      <div class="rec-highlight">${savedMonthlyUnits.toFixed(1)} Units/month</div>
      <div class="rec-sub">Estimated Money Saving: ₹${savedMoney.toFixed(0)}/month</div>
    </div>
  `);

  const warnText = diff > 0
    ? `Your projected consumption is <b style="color:var(--danger)">${diff.toFixed(0)} units above</b> your target.`
    : `You're projected to stay <b style="color:var(--safe)">${Math.abs(diff).toFixed(0)} units below</b> your target.`;
  cards.push(`
    <div class="glass-card rec-card">
      <div class="rec-icon">${status === "danger" ? "🚨" : status === "warn" ? "⚠" : "✅"}</div>
      <h3>Usage ${status === "danger" ? "Warning" : "Status"}</h3>
      <div class="rec-body">${warnText}</div>
    </div>
  `);

  container.innerHTML = cards.join("");
}

/* ---------------- Target Bill ---------------- */
function computeTargetBill(pricePerUnit) {
  const currentBillEl = document.getElementById("currentBill");
  const targetBillEl = document.getElementById("targetBill");
  if (!currentBillEl || !targetBillEl) return;

  const currentBill = parseFloat(currentBillEl.value) || 0;
  const targetBill = parseFloat(targetBillEl.value) || 0;
  const requiredSaving = Math.max(currentBill - targetBill, 0);
  const requiredUnits = pricePerUnit > 0 ? requiredSaving / pricePerUnit : 0;

  setText("requiredSaving", `₹${requiredSaving.toFixed(0)}`);
  setText("requiredSavingUnits", `≈ ${requiredUnits.toFixed(1)} Units to cut`);

  const suggestion = document.getElementById("targetBillSuggestion");
  if (suggestion) {
    if (requiredSaving <= 0) {
      suggestion.textContent = "Your current bill is already at or below your target — nice work.";
    } else {
      suggestion.textContent = `Cutting approximately ${requiredUnits.toFixed(1)} units this billing cycle — for example, reducing your top appliance's runtime — should bring you to your target bill.`;
    }
  }
}

/* ---------------- Advanced Tracker ---------------- */
function updateTracker(monthlyTarget, billingPeriod, applianceDailyUnits) {
  const dailyLimit = billingPeriod > 0 ? monthlyTarget / billingPeriod : 0;
  const trackerExtra = trackerAppliances.reduce((s, t) => s + (t.watt * t.hours) / 1000, 0);
  const usedToday = applianceDailyUnits + trackerExtra;
  const remaining = dailyLimit - usedToday;

  const carryForward = getCurrentUser()?.carryForward || 0;

  setText("trackDailyLimit", `${dailyLimit.toFixed(2)} U`);
  setText("trackUsedToday", `${usedToday.toFixed(2)} U`);
  setText("trackRemaining", `${remaining.toFixed(2)} U`);
  setText("trackCarryForward", `${carryForward.toFixed(2)} U`);

  const badge = document.getElementById("trackBadge");
  if (badge) {
    if (usedToday > dailyLimit) {
      badge.className = "badge badge-danger";
      badge.textContent = "🚨 Daily Limit Exceeded";
    } else if (dailyLimit > 0 && usedToday / dailyLimit >= 0.85) {
      badge.className = "badge badge-warn";
      badge.textContent = "⚠ Near Daily Limit";
    } else {
      badge.className = "badge badge-safe";
      badge.textContent = "✓ Safe Usage";
    }
  }

  renderTrackerList();
  window._trackerState = { dailyLimit, usedToday, remaining };
}

function addTrackerAppliance() {
  const name = document.getElementById("trackName").value.trim();
  const watt = parseFloat(document.getElementById("trackWatt").value) || 0;
  const hours = parseFloat(document.getElementById("trackHours").value) || 0;
  if (!name || watt <= 0 || hours <= 0) return;
  trackerAppliances.push({ name, watt, hours });
  document.getElementById("trackName").value = "";
  document.getElementById("trackWatt").value = "";
  document.getElementById("trackHours").value = "";
  recalculate();
}

function removeTrackerAppliance(idx) {
  trackerAppliances.splice(idx, 1);
  recalculate();
}

function renderTrackerList() {
  const list = document.getElementById("trackerList");
  if (!list) return;
  list.innerHTML = trackerAppliances.map((t, i) => `
    <div class="tracker-item">
      <span>${t.name} — ${t.watt}W × ${t.hours}h = ${((t.watt * t.hours) / 1000).toFixed(2)} U</span>
      <button onclick="removeTrackerAppliance(${i})">Remove</button>
    </div>
  `).join("");
}

/* ---------------- Notifications ---------------- */
function requestNotifications() {
  if (!("Notification" in window)) return;
  Notification.requestPermission();
}

let lastNotified = { danger: false, warn: false, trackerDanger: false };
function checkNotificationTriggers(status, diff) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if (status === "danger" && !lastNotified.danger) {
    new Notification("⚠ WattWise Warning", { body: `Projected usage exceeds your target by ${Math.abs(diff).toFixed(0)} units.` });
    lastNotified.danger = true; lastNotified.warn = false;
  } else if (status === "warn" && !lastNotified.warn) {
    new Notification("⚠ WattWise Warning", { body: "You are close to your electricity target." });
    lastNotified.warn = true; lastNotified.danger = false;
  } else if (status === "safe") {
    lastNotified.danger = false; lastNotified.warn = false;
  }

  const t = window._trackerState;
  if (t && t.usedToday > t.dailyLimit && !lastNotified.trackerDanger) {
    new Notification("🚨 WattWise Alert", { body: "Your daily electricity limit has been exceeded." });
    lastNotified.trackerDanger = true;
  } else if (t && t.usedToday <= t.dailyLimit) {
    lastNotified.trackerDanger = false;
  }
}

/* ---------------- Save Report / History ---------------- */
function saveReport() {
  const s = window._wattwiseState;
  if (!s) return;

  const applianceMap = {};
  s.appliances.forEach(a => {
    applianceMap[a.key] = { watt: a.watt, hours: a.hours, dailyUnits: Number(a.dailyUnits.toFixed(3)), pct: Number(a.pct.toFixed(1)) };
  });

  const report = {
    date: new Date().toISOString(),
    currentBill: parseFloat(document.getElementById("currentBill").value) || 0,
    targetBill: parseFloat(document.getElementById("targetBill").value) || 0,
    pricePerUnit: s.pricePerUnit,
    appliances: applianceMap,
    totalUnits: Number(s.netUnits.toFixed(2)),
    projectedMonthly: Number(s.projectedMonthly.toFixed(2)),
    monthlyTarget: s.monthlyTarget,
  };

  const t = window._trackerState;
  const dailyRemaining = t ? t.remaining : 0;

  updateCurrentUser(user => {
    if (!user.usageHistory) user.usageHistory = [];
    user.usageHistory.unshift(report);
    if (!user.bills) user.bills = [];
    user.bills.unshift({ date: report.date, amount: report.currentBill });
    user.carryForward = (user.carryForward || 0) + dailyRemaining;
  });

  showToast("✅ Report saved to your history.");
}

function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
