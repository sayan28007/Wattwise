/* ============================================================
   WattWise — Profile & History
   ============================================================ */

let detailChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!requireSession()) return;

  const name = getCurrentUsername();
  const user = getCurrentUser();
  const initials = name.slice(0, 2).toUpperCase();

  document.getElementById("avatarInitials").textContent = initials;
  document.getElementById("profileAvatar").textContent = initials;
  document.getElementById("profileName").textContent = name;

  const history = user?.usageHistory || [];
  document.getElementById("profileMeta").textContent = `${history.length} saved report${history.length === 1 ? "" : "s"}`;
  document.getElementById("profReportCount").textContent = history.length;

  if (history.length > 0) {
    document.getElementById("profLastUnits").textContent = `${history[0].totalUnits} Units`;
    document.getElementById("profLastBill").textContent = `₹${history[0].currentBill}`;
  }

  renderHistoryList(history);
});

function renderHistoryList(history) {
  const container = document.getElementById("historyList");
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="glyph">📄</div><p>No reports saved yet. Go to the Dashboard and click "Save Report" after entering your appliance data.</p></div>`;
    return;
  }

  container.innerHTML = history.map((r, idx) => {
    const d = new Date(r.date);
    const dateLabel = d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    return `
      <div class="history-item" onclick="openReport(${idx})">
        <div>
          <div class="h-date">${dateLabel}</div>
          <div class="h-sub">Target: ${r.monthlyTarget ?? "—"} Units</div>
        </div>
        <div class="h-right">
          <div class="h-bill">₹${r.currentBill}</div>
          <div class="h-units">${r.totalUnits} Units</div>
        </div>
      </div>
    `;
  }).join("");
}

function openReport(idx) {
  const user = getCurrentUser();
  const report = user.usageHistory[idx];
  if (!report) return;

  const detailCard = document.getElementById("detailCard");
  detailCard.style.display = "block";
  detailCard.scrollIntoView({ behavior: "smooth", block: "start" });

  const d = new Date(report.date);
  document.getElementById("detailTitle").textContent = `Report — ${d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`;
  document.getElementById("detailUnits").textContent = `${report.totalUnits} Units`;
  document.getElementById("detailBill").textContent = `₹${report.currentBill}`;
  document.getElementById("detailTarget").textContent = `${report.monthlyTarget ?? "—"} Units`;

  const labels = Object.keys(report.appliances);
  const data = labels.map(k => report.appliances[k].dailyUnits);

  const ctx = document.getElementById("detailChart");
  if (detailChartInstance) detailChartInstance.destroy();

  Chart.defaults.color = "#a9bcd6";
  Chart.defaults.font.family = "'Poppins', sans-serif";

  detailChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: ["#22e5ec", "#5eead4", "#6c8cff", "#ffc35a", "#ff9f6c", "#7c8aa5"], borderColor: "#0a1120", borderWidth: 3 }],
    },
    options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11.5 } } } }, cutout: "60%" },
  });
}
