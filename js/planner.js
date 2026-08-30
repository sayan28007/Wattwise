/* ============================================================
   WattWise — Smart Planner
   Reads the latest live consumption snapshot and builds a
   ranked, reduction-based saving plan.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!requireSession()) return;

  const name = getCurrentUsername();
  const avatarEl = document.getElementById("avatarInitials");
  if (avatarEl) avatarEl.textContent = name.slice(0, 2).toUpperCase();

  buildPlan();
});

const REDUCTION_MAP = {
  AC: 1,             // hours/day
  Fan: 1,
  TV: 0.5,
  Computer: 0.5,
  Lights: 2,
  Miscellaneous: 0.5,
};

function buildPlan() {
  let live = getLiveState();

  // Fallback defaults (mirrors dashboard defaults) if no live data yet
  if (!live) {
    live = {
      appliances: [
        { key: "AC", label: "AC", icon: "❄️", watt: 1500, hours: 6, dailyUnits: 9 },
        { key: "Fan", label: "Fan", icon: "🌀", watt: 75, hours: 8, dailyUnits: 0.6 },
        { key: "TV", label: "TV", icon: "📺", watt: 120, hours: 4, dailyUnits: 0.48 },
        { key: "Computer", label: "Computer", icon: "🖥️", watt: 200, hours: 5, dailyUnits: 1 },
        { key: "Lights", label: "Lights", icon: "💡", watt: 60, hours: 6, dailyUnits: 0.36 },
        { key: "Miscellaneous", label: "Miscellaneous", icon: "🔌", watt: 100, hours: 3, dailyUnits: 0.3 },
      ],
      pricePerUnit: 8, monthlyTarget: 200, billingPeriod: 30, currentBill: 2500, targetBill: 2000,
    };
  }

  const { appliances, pricePerUnit, billingPeriod, currentBill, targetBill } = live;

  const requiredReduction = Math.max(currentBill - targetBill, 0);

  setText("planCurrentBill", `₹${currentBill.toFixed(0)}`);
  setText("planTargetBill", `₹${targetBill.toFixed(0)}`);
  setText("planRequiredReduction", `₹${requiredReduction.toFixed(0)}`);

  // Rank appliances by consumption, only those with runtime > 0
  const ranked = [...appliances]
    .filter(a => a.dailyUnits > 0)
    .sort((a, b) => b.dailyUnits - a.dailyUnits);

  let remainingUnitsNeeded = pricePerUnit > 0 ? requiredReduction / pricePerUnit : 0;
  let totalMonthlySaved = 0;
  const planEntries = [];

  ranked.forEach(a => {
    const reduceHours = Math.min(REDUCTION_MAP[a.key] ?? 1, a.hours);
    if (reduceHours <= 0) return;
    const savedDaily = (a.watt * reduceHours) / 1000;
    const savedMonthly = savedDaily * billingPeriod;
    totalMonthlySaved += savedMonthly;
    remainingUnitsNeeded -= savedMonthly;

    planEntries.push({
      key: a.key, label: a.label, icon: a.icon,
      reduceHours, savedMonthly,
    });
  });

  renderPlanList(planEntries);

  const totalMoneySaved = totalMonthlySaved * pricePerUnit;
  setText("planTotalUnits", `${totalMonthlySaved.toFixed(1)} Units/month`);
  setText("planTotalMoney", `₹${totalMoneySaved.toFixed(0)}/month`);

  renderPlanChart(ranked, planEntries);
}

function renderPlanList(entries) {
  const container = document.getElementById("planList");
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="glyph">✅</div><p>No appliance runtime found — enter your appliances on the Dashboard first.</p></div>`;
    return;
  }

  container.innerHTML = entries.map(e => {
    const hoursLabel = e.reduceHours === 1 ? "1 hr/day" : `${Math.round(e.reduceHours * 60)} min/day`;
    return `
      <div class="plan-item">
        <div class="plan-icon">${e.icon}</div>
        <div class="plan-name">${e.label}</div>
        <div class="plan-action">Reduce by ${hoursLabel}</div>
        <div class="plan-save"><b>≈ ${e.savedMonthly.toFixed(1)} U</b>saved/month</div>
      </div>
    `;
  }).join("");
}

function renderPlanChart(ranked, planEntries) {
  const ctx = document.getElementById("planChart");
  if (!ctx) return;

  Chart.defaults.color = "#a9bcd6";
  Chart.defaults.font.family = "'Poppins', sans-serif";

  const savedMap = {};
  planEntries.forEach(e => savedMap[e.key] = e.savedMonthly);

  const labels = ranked.map(a => a.label);
  const current = ranked.map(a => Number((a.dailyUnits * 30).toFixed(1)));
  const recommended = ranked.map(a => Number(((a.dailyUnits * 30) - (savedMap[a.key] || 0)).toFixed(1)));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Current Consumption", data: current, backgroundColor: "#ffc35a", borderRadius: 6 },
        { label: "Recommended Consumption", data: recommended, backgroundColor: "#22e5ec", borderRadius: 6 },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11.5 } } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: "rgba(255,255,255,0.05)" }, title: { display: true, text: "Units/month" } } },
    },
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = text;
}
