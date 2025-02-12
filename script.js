// Alle Einträge aus localStorage laden (falls vorhanden)
let entries = JSON.parse(localStorage.getItem("bolleEntries")) || [];

// Charts als globale Variablen, damit wir sie beim Update zerstören können
let feedChart, stoolChart, vomitChart, medChart;

// Nach dem Laden der Seite direkt Charts aktualisieren
document.addEventListener("DOMContentLoaded", () => {
  updateCharts();
});

const entryForm = document.getElementById("entryForm");

// ------------------------------------------------------
// Formular absenden -> Tages-Eintrag anlegen / überschreiben
// ------------------------------------------------------
entryForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // Datum ist Pflicht
  const date = document.getElementById("entryDate").value;

  // Futtertyp ("" = keine Änderung)
  const feedType = document.getElementById("feedType").value;

  // parseInt(...) => NaN falls kein Wert eingetragen
  const stoolQualityRaw = parseInt(document.getElementById("stoolQuality").value);
  const pantoprazolCountRaw = parseInt(document.getElementById("pantoprazolCount").value);
  const sucrabestCountRaw = parseInt(document.getElementById("sucrabestCount").value);

  // Boolean-Feld: Immer überschreiben
  const vomited = document.getElementById("vomited").checked;

  // Prüfen, ob es schon einen Eintrag für das Datum gibt
  const existingIndex = entries.findIndex((e) => e.date === date);

  if (existingIndex >= 0) {
    // ----------------------------
    // Wir haben schon Daten => teilweise überschreiben
    // ----------------------------
    if (feedType) entries[existingIndex].feedType = feedType;

    // Nur wenn stoolQualityRaw nicht NaN ist (also Feld befüllt):
    if (!isNaN(stoolQualityRaw)) {
      entries[existingIndex].stoolQuality = stoolQualityRaw;
    }

    // Erbrochen-Checkbox: wird immer aktualisiert
    entries[existingIndex].vomited = vomited;

    if (!isNaN(pantoprazolCountRaw)) {
      entries[existingIndex].pantoprazolCount = pantoprazolCountRaw;
    }
    if (!isNaN(sucrabestCountRaw)) {
      entries[existingIndex].sucrabestCount = sucrabestCountRaw;
    }
  } else {
    // ----------------------------
    // Neuer Tag => neuer Eintrag
    // ----------------------------
    const newEntry = {
      date,
      feedType: feedType || null,
      stoolQuality: isNaN(stoolQualityRaw) ? null : stoolQualityRaw,
      vomited: vomited,
      pantoprazolCount: isNaN(pantoprazolCountRaw) ? 0 : pantoprazolCountRaw,
      sucrabestCount: isNaN(sucrabestCountRaw) ? 0 : sucrabestCountRaw,
    };
    entries.push(newEntry);
  }

  // localStorage aktualisieren
  localStorage.setItem("bolleEntries", JSON.stringify(entries));

  // Charts neu laden
  updateCharts();

  // Formular zurücksetzen
  entryForm.reset();
  // Futter wieder "nass" voreinstellen oder Leer, nach Wunsch:
  document.getElementById("feedType").value = "";
});
function colorForStool(value) {
    switch (value) {
      case 1: return "#6B8E23"; // khakigrün
      case 2: return "#a0b234";
      case 3: return "#c9a338";
      case 4: return "#e16364";
      case 5: return "#ce086c";
      default: return "transparent"; // z.B. bei 0 oder null (keine Angabe)
    }
  }
// ------------------------------------------------------
// Charts erstellen/aktualisieren
// ------------------------------------------------------
function updateCharts() {
  // Alte Charts zerstören (falls vorhanden)
  if (feedChart) feedChart.destroy();
  if (stoolChart) stoolChart.destroy();
  if (vomitChart) vomitChart.destroy();
  if (medChart) medChart.destroy();

  // Alle unterschiedlichen Datumswerte sortiert ermitteln
  const dates = [...new Set(entries.map((e) => e.date))].sort();

  // Für die Diagrammdaten brauchen wir je Datum: feedType, stoolQuality, vomited, meds ...
  const feedDataNass = [];
  const feedDataTrocken = [];
  const feedDataBeides = [];

  const stoolData = [];
  const vomitData = [];

  const pantoprazolData = [];
  const sucrabestData = [];

  dates.forEach((day) => {
    const entry = entries.find((e) => e.date === day);

    // 1) Futter
    if (entry.feedType === "nass") {
      feedDataNass.push(1);
      feedDataTrocken.push(0);
      feedDataBeides.push(0);
    } else if (entry.feedType === "trocken") {
      feedDataNass.push(0);
      feedDataTrocken.push(1);
      feedDataBeides.push(0);
    } else if (entry.feedType === "beides") {
      feedDataNass.push(0);
      feedDataTrocken.push(0);
      feedDataBeides.push(1);
    } else {
      // z.B. null oder nicht geändert => 0
      feedDataNass.push(0);
      feedDataTrocken.push(0);
      feedDataBeides.push(0);
    }

    // 2) Stuhlgang (1=Sehr gut, 5=Schlecht)
    // Falls null => 0 (keine Angabe)
    stoolData.push(entry.stoolQuality || 0);

    // 3) Erbrochen (ja/nein => 1 oder 0)
    // vomited = true => 1, false => 0
    vomitData.push(entry.vomited ? 1 : 0);

    // 4) Medikamente
    pantoprazolData.push(entry.pantoprazolCount || 0);
    sucrabestData.push(entry.sucrabestCount || 0);
  });

  // Chart-Farb- und Schrift-Einstellungen (weiße Achsen/Texte)
  const chartFontColor = "white";
  const gridColor = "rgba(255,255,255,0.2)";

  // -------------------------------------------------
  // 1) Futter-Chart
  // -------------------------------------------------
  const feedCtx = document.getElementById("feedChart").getContext("2d");
  feedChart = new Chart(feedCtx, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Nass",
          data: feedDataNass,
          backgroundColor: "#caffbf",
        },
        {
          label: "Trocken",
          data: feedDataTrocken,
          backgroundColor: "#ffd6a5",
        },
        {
          label: "Beides",
          data: feedDataBeides,
          backgroundColor: "#9bf6ff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Futter pro Tag",
          color: chartFontColor,
        },
        legend: {
          labels: {
            color: chartFontColor,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartFontColor,
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: chartFontColor,
            stepSize: 1,
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });

  // -------------------------------------------------
  // 2) Stuhlgang-Chart (1=Sehr gut, 5=Schlecht)
  // -------------------------------------------------
  // 2) Stuhlgang-Chart (1=Sehr gut, 5=Schlecht)
const stoolCtx = document.getElementById("stoolChart").getContext("2d");

// Erzeuge ein Array, das für jeden Wert in stoolData die passende Balkenfarbe holt:
const stoolColors = stoolData.map((value) => {
  return colorForStool(value);
});

stoolChart = new Chart(stoolCtx, {
  type: "bar",
  data: {
    labels: dates, // die Array-Liste deiner Tage, z.B. ["2025-01-10", "2025-01-11", ...]
    datasets: [
      {
        label: "Stuhlgang (1=Sehr gut, 5=Schlecht)",
        data: stoolData,         // Array der Werte pro Tag
        backgroundColor: stoolColors, // Array der Farben pro Wert
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Stuhlgang pro Tag",
        color: chartFontColor, // weiße Schrift im Diagramm-Titel
      },
      legend: {
        labels: {
          color: chartFontColor, // weiße Schrift in der Legende
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartFontColor, 
        },
        grid: {
          color: gridColor, 
        },
      },
      y: {
        min: 0, // wir erlauben 0 als "keine Angabe"
        max: 5, // bei 5 ist "schlecht"
        ticks: {
          color: chartFontColor,
          stepSize: 1,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  },
});


  // -------------------------------------------------
  // 3) Erbrochen-Chart (ja/nein => 1/0)
  // -------------------------------------------------
  // 1 = ja, 0 = nein; wir zeigen pro Tag einen Balken
  const vomitCtx = document.getElementById("vomitChart").getContext("2d");
  vomitChart = new Chart(vomitCtx, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Erbrochen (1=Ja, 0=Nein)",
          data: vomitData,
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
          color: chartFontColor,
        },
        legend: {
          labels: {
            color: chartFontColor,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartFontColor,
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            color: chartFontColor,
            stepSize: 1,
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });

  // -------------------------------------------------
  // 4) Medikamente-Chart
  // -------------------------------------------------
  const medCtx = document.getElementById("medChart").getContext("2d");
  medChart = new Chart(medCtx, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Pantoprazol (20 mg)",
          data: pantoprazolData,
          backgroundColor: "#80ed99",
        },
        {
          label: "Sucrabest (1 g)",
          data: sucrabestData,
          backgroundColor: "#ffd6e0",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Medikamente pro Tag",
          color: chartFontColor,
        },
        legend: {
          labels: {
            color: chartFontColor,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartFontColor,
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: chartFontColor,
            stepSize: 1,
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });
}
