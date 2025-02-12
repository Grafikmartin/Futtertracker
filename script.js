// Globale Variablen für unsere Einträge & Charts
let entries = JSON.parse(localStorage.getItem("bolleEntries")) || [];

let feedChart, stoolChart, vomitChart, medChart;

// Wenn das DOM geladen ist, soll beim Start die Anzeige aktualisiert werden
document.addEventListener("DOMContentLoaded", () => {
  updateCharts();
});

// Zugriff auf unser Formular
const entryForm = document.getElementById("entryForm");

// Slider-Output updaten (kleine Hilfsfunktion)
function updateSliderOutput(value) {
  document.getElementById("sliderOutput").textContent = value;
}

// Formular-Submit-Event
entryForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // Werte aus den Formularfeldern holen
  const date = document.getElementById("entryDate").value;
  const feedType = document.getElementById("feedType").value;
  const stoolQuality = parseInt(document.getElementById("stoolQuality").value);
  const vomited = document.getElementById("vomited").checked;
  const medicationName = document.getElementById("medicationName").value;
  const medicationTime = parseInt(
    document.getElementById("medicationTime").value
  );

  // Neuen Eintrag erstellen
  const newEntry = {
    date,
    feedType,
    stoolQuality,
    vomited,
    medicationName,
    medicationTime,
  };

  // Eintrag in unser Array und dann in localStorage speichern
  entries.push(newEntry);
  localStorage.setItem("bolleEntries", JSON.stringify(entries));

  // Diagramme aktualisieren
  updateCharts();

  // Formular zurücksetzen (optional)
  entryForm.reset();
  // Standard-Wert bei Slider wieder auf 12
  document.getElementById("medicationTime").value = 12;
  updateSliderOutput(12);
});

// --------------------------------------------------
// Diagramme erstellen/aktualisieren
// --------------------------------------------------

function updateCharts() {
  // Falls schon existierende Charts vorhanden sind, zerstören wir sie vor dem Neubauen
  if (feedChart) feedChart.destroy();
  if (stoolChart) stoolChart.destroy();
  if (vomitChart) vomitChart.destroy();
  if (medChart) medChart.destroy();

  // ---- 1) Futter-Diagramm ----
  // Zählen, wie oft "trocken", "nass" oder "beides" gefüttert wurde
  const feedCount = {
    trocken: 0,
    nass: 0,
    beides: 0,
  };

  entries.forEach((entry) => {
    if (entry.feedType === "trocken") feedCount.trocken++;
    else if (entry.feedType === "nass") feedCount.nass++;
    else if (entry.feedType === "beides") feedCount.beides++;
  });

  const feedCtx = document.getElementById("feedChart").getContext("2d");
  feedChart = new Chart(feedCtx, {
    type: "bar",
    data: {
      labels: ["Trocken", "Nass", "Beides"],
      datasets: [
        {
          label: "Futterhäufigkeit",
          data: [
            feedCount.trocken,
            feedCount.nass,
            feedCount.beides,
          ],
          backgroundColor: ["#ffadad", "#caffbf", "#9bf6ff"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Futterart-Häufigkeit",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          stepSize: 1,
        },
      },
    },
  });

  // ---- 2) Stuhlgang-Diagramm ----
  // Wir bilden hier z.B. den Durchschnitt des Stuhlgang-Wertes pro Datum
  // (Du kannst natürlich auch pro Tag einen Balken machen oder mehrere Auswertungen)
  const stoolByDate = {};

  entries.forEach((entry) => {
    if (!entry.stoolQuality) return; // überspringen, falls nichts eingetragen
    const d = entry.date;
    if (!stoolByDate[d]) {
      stoolByDate[d] = {
        total: entry.stoolQuality,
        count: 1,
      };
    } else {
      stoolByDate[d].total += entry.stoolQuality;
      stoolByDate[d].count += 1;
    }
  });

  const stoolDates = Object.keys(stoolByDate).sort();
  const stoolAverages = stoolDates.map(
    (d) => stoolByDate[d].total / stoolByDate[d].count
  );

  const stoolCtx = document.getElementById("stoolChart").getContext("2d");
  stoolChart = new Chart(stoolCtx, {
    type: "bar",
    data: {
      labels: stoolDates,
      datasets: [
        {
          label: "Ø Stuhlgang-Qualität",
          data: stoolAverages,
          backgroundColor: "#ffd6a5",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Durchschnittlicher Stuhlgang pro Tag (1-5)",
        },
      },
      scales: {
        y: {
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });

  // ---- 3) Erbrochen-Diagramm ----
  // Zeigt an, wie oft Erbrechen vorgekommen ist (z.B. pro Datum)
  const vomitByDate = {};
  entries.forEach((entry) => {
    const d = entry.date;
    if (!vomitByDate[d]) {
      vomitByDate[d] = {
        vomitedCount: 0,
        totalEntries: 0,
      };
    }
    if (entry.vomited) {
      vomitByDate[d].vomitedCount += 1;
    }
    vomitByDate[d].totalEntries += 1;
  });

  const vomitDates = Object.keys(vomitByDate).sort();
  const vomitCounts = vomitDates.map((d) => vomitByDate[d].vomitedCount);

  const vomitCtx = document.getElementById("vomitChart").getContext("2d");
  vomitChart = new Chart(vomitCtx, {
    type: "bar",
    data: {
      labels: vomitDates,
      datasets: [
        {
          label: "Erbrochen (Anzahl)",
          data: vomitCounts,
          backgroundColor: "#bdb2ff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Erbrochen pro Tag",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          stepSize: 1,
        },
      },
    },
  });

  // ---- 4) Medikamenten-Diagramm ----
  // Auswertung, zu welchen Uhrzeiten (Stunde) Medizin gegeben wurde
  // -> wir zählen einfach pro Stunde die Häufigkeit
  const medHoursCount = new Array(24).fill(0);

  entries.forEach((entry) => {
    if (entry.medicationName && entry.medicationTime) {
      // Abzug -1, weil unsere Range 1..24 ist, Index im Array aber 0..23
      medHoursCount[entry.medicationTime - 1]++;
    }
  });

  const medCtx = document.getElementById("medChart").getContext("2d");
  medChart = new Chart(medCtx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => i + 1 + " Uhr"),
      datasets: [
        {
          label: "Medikamentengaben",
          data: medHoursCount,
          backgroundColor: "#a0c4ff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Medizin pro Stunde (1-24 Uhr)",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          stepSize: 1,
        },
      },
    },
  });
}
