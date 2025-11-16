"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./wastelog.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Chart from "chart.js/auto";
import api from "../../../lib/axios";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

const CATEGORIES = [
  { value: "Plastic", color: "#4CAF50" },
  { value: "Paper", color: "#2196F3" },
  { value: "Food", color: "#FFB300" },
  { value: "Glass", color: "#8BC34A" },
  { value: "Metal", color: "#9E9E9E" },
  { value: "E-Waste", color: "#F44336" },
  { value: "Other", color: "#607D8B" },
];

const UNITS = [
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "lb", label: "lb" },
  { value: "L", label: "L" },
  { value: "m³", label: "m³" },
];

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("jwt");

const CHART_LABELS = ["Plastic", "Paper", "Food", "Glass", "Metal", "E-Waste"];
const SAMPLE_DATA = [12, 8, 15, 5, 4, 3];

const CATEGORY_ICONS = {
  Plastic: "fa-bottle-water",
  Paper: "fa-file-lines",
  Food: "fa-apple-whole",
  Glass: "fa-wine-bottle",
  Metal: "fa-cog",
  "E-Waste": "fa-plug",
  Other: "fa-box",
};

const formatLocalDate = (val) => {
  const d = new Date(val);
  return d.toLocaleDateString("en-CA");
};

export default function WasteLogPage() {
  const [isMobile, setIsMobile] = useState(true);
  const [logs, setLogs] = useState([]);
  const [type, setType] = useState(CATEGORIES[0].value);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(UNITS[0].value);
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [chartRange, setChartRange] = useState("This Month");
  const [logsRange, setLogsRange] = useState("This Month");
  const [modalOpen, setModalOpen] = useState(false);

  // NEW: Leaderboard & ranking state
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRanking, setUserRanking] = useState({ points: 0, rank: "Bronze", placement: null });

  const chartCanvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Create a helper function to fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const token = getCookie("authToken") || getToken();
      if (!token) return;

      const res = await api.get("/api/user/leaderboard", {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });

      const data = res.data;

      const mappedLeaderboard = (data.leaderboard || []).map((entry) => ({
        rank: entry.placement,
        name: entry.user?.username || "Anonymous",
        score: entry.points,
        tier: entry.rank,
      }));

      setLeaderboard(mappedLeaderboard);

      if (data.userPlacement) {
        setUserRanking({
          points: data.userPlacement.points,
          rank: data.userPlacement.rank,
          placement: data.userPlacement.placement,
        });
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  // Fetch leaderboard data on mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // REMOVE the extra "/api/user/ranking" call (it's 404 and redundant since /leaderboard returns userPlacement)
  // useEffect(() => {
  //   const fetchUserRanking = async () => {
  //     try {
  //       const token = getCookie("authToken") || getToken();
  //       if (!token) return;
  //       const res = await fetch(`${API_BASE}/api/user/ranking`, {
  //         method: "GET",
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  //       if (!res.ok) throw new Error(await res.text());
  //       const data = await res.json();
  //       setUserRanking({
  //         points: data.points || 0,
  //         rank: data.rank || "Bronze",
  //         placement: data.placement,
  //       });
  //     } catch (error) {
  //       console.error("Failed to fetch user ranking:", error);
  //     }
  //   };
  //   if (logs.length > 0) {
  //     fetchUserRanking();
  //   }
  // }, [logs]);

  // If you still want auto-refresh of leaderboard (which updates userPlacement),
  // refresh it whenever logs change:
  useEffect(() => {
    fetchLeaderboard();
    // only depend on count to avoid tight loops when leaderboard sets state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs.length]);

  // Load from API on mount, fallback to local storage on error
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = getCookie("authToken") || getToken();
        if (!token) throw new Error("Missing auth token");

        const res = await api.get("/api/user/wastelogs", {
          headers: { Authorization: `Bearer ${token}` }, withCredentials: true
        });
        const data = res.data;

        const items = (data?.wasteLogs ?? []).map((w) => ({
          id: w._id || `${w.createdAt}`,
          type: w.wasteType,
          quantity: w.quantity,
          unit: w.unit,
          date: formatLocalDate(w.date), // keep existing local date formatter
          createdAt: new Date(w.createdAt || w.date).getTime(),
        }));
        items.sort((a, b) => b.createdAt - a.createdAt);
        setLogs(items);
      } catch {
        try {
          const raw = localStorage.getItem("wasteLogs");
          if (raw) setLogs(JSON.parse(raw));
        } catch {}
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("wasteLogs", JSON.stringify(logs));
    } catch {}
  }, [logs]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const q = Number(quantity);
    if (!type || !quantity || Number.isNaN(q) || q <= 0 || !unit || !date) {
      toast.error("Please enter valid details.");
      return;
    }

    try {
      const token = getCookie("authToken") || getToken();
      if (!token) {
        toast.error("Not authenticated.");
        return;
      }

      const payload = {
        wasteType: String(type),
        quantity: String(q),
        unit: String(unit),
        date: String(date),
      };

      const res = await api.post("/api/user/wastelog", payload, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });

      const data = res.data;
      const w = data?.wasteLog;
      const item = w
        ? {
            id: w._id || `${w.createdAt}`,
            type: w.wasteType,
            quantity: w.quantity,
            unit: w.unit,
            date: formatLocalDate(w.date),
            createdAt: new Date(w.createdAt || w.date).getTime(),
          }
        : {
            id: `${Date.now()}`,
            type,
            quantity: q,
            unit,
            date: formatLocalDate(date),
            createdAt: Date.now(),
          };

      setLogs((prev) => [item, ...prev]);

      if (data.ranking) {
        setUserRanking({
          points: data.ranking.points,
          rank: data.ranking.rank,
          placement: userRanking.placement,
        });
      }

      await fetchLeaderboard();

      setQuantity("");
      setUnit(UNITS[0].value);
      setType(CATEGORIES[0].value);
      setDate(formatLocalDate(new Date()));
      setModalOpen(false);

      toast.success(`Log added! +${Math.round(q * 2)} points earned!`);
    } catch (error) {
      console.error("Add waste log error:", error);
      toast.error("Could not add waste log.");
    }
  };

  const handleDelete = async (id) => {
    const isMongoId = /^[a-f\d]{24}$/i.test(id);
    if (!isMongoId) {
      setLogs((prev) => prev.filter((x) => x.id !== id));
      toast.info("Waste log removed.");
      return;
    }

    try {
      const token = getCookie("authToken") || getToken();
      if (!token) {
        toast.error("Not authenticated.");
        return;
      }

      const res = await api.delete(`/api/user/wastelog/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, withCredentials: true
      });

      const data = res.data;

      if (data.ranking) {
        setUserRanking({
          points: data.ranking.points,
          rank: data.ranking.rank,
          placement: userRanking.placement,
        });
      }

      setLogs((prev) => prev.filter((x) => x.id !== id));
      await fetchLeaderboard();

      toast.success("Waste log deleted. Points updated.");
    } catch {
      toast.error("Could not delete waste log.");
    }
  };

  const formatDateLong = (str) => {
    try {
      const dt = new Date(str);
      return dt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return str;
    }
  };

  const filterByRange = (allLogs, range) => {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    if (range === "Today") {
      return allLogs.filter((l) => l.date === todayStr);
    }

    if (range === "This Week") {
      const dayIndex = today.getDay();
      const diffToMonday = (dayIndex + 6) % 7;
      const start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return allLogs.filter((l) => {
        const dt = new Date(l.date);
        return dt >= start && dt <= end;
      });
    }

    const month = today.getMonth();
    const year = today.getFullYear();
    return allLogs.filter((l) => {
      const dt = new Date(l.date);
      return dt.getMonth() === month && dt.getFullYear() === year;
    });
  };

  const filteredLogsForChart = useMemo(
    () => filterByRange(logs, chartRange),
    [logs, chartRange]
  );

  const filteredLogsForList = useMemo(
    () => filterByRange(logs, logsRange),
    [logs, logsRange]
  );

  const chartTotals = useMemo(() => {
    const totalsMap = Object.fromEntries(CHART_LABELS.map((l) => [l, 0]));
    for (const l of filteredLogsForChart) {
      if (totalsMap[l.type] !== undefined) {
        totalsMap[l.type] += Number(l.quantity) || 0;
      }
    }
    return CHART_LABELS.map((l) => totalsMap[l]);
  }, [filteredLogsForChart]);

  const chartData = useMemo(() => {
    const hasData = chartTotals.some((v) => v > 0);
    return hasData ? chartTotals : SAMPLE_DATA;
  }, [chartTotals]);

  const chartColors = useMemo(() => {
    return CHART_LABELS.map(
      (l) => CATEGORIES.find((c) => c.value === l)?.color || "#047857"
    );
  }, []);

  useEffect(() => {
    if (!chartCanvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(chartCanvasRef.current, {
      type: "bar",
      data: {
        labels: CHART_LABELS,
        datasets: [
          {
            label: "Total",
            data: chartData,
            backgroundColor: chartColors,
            borderColor: chartColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "Waste Generation by Category" },
        },
        scales: { y: { beginAtZero: true } },
      },
    });
    return () => chartRef.current?.destroy();
  }, [chartData, chartColors, isMobile]);

  const groupedByDate = useMemo(() => {
    const map = new Map();
    for (const l of filteredLogsForList) {
      if (!map.has(l.date)) map.set(l.date, []);
      map.get(l.date).push(l);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredLogsForList]);

  const getCategoryColor = (name) =>
    CATEGORIES.find((t) => t.value === name)?.color || "#047857";
  const getCategoryIcon = (name) => CATEGORY_ICONS[name] || "fa-box";

  // Display current user in leaderboard with "You" badge
  const currentUser = {
    rank: userRanking.placement || "-",
    name: "You",
    score: userRanking.points,
    tier: userRanking.rank,
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.pageLabel}>Waste Log</h1>
        <p className={styles.pageDesc}>
          Track and review your waste by category, quantity, and date
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.columns}>
          {/* Left side - existing logs section */}
          <div className={`${styles.whiteContainer} ${styles.leftContainer}`}>
            <div className={styles.leftHeaderRow}>
              <button
                type="button"
                className={styles.buttonPrimary}
                onClick={() => setModalOpen(true)}
              >
                <i className="fas fa-plus" aria-hidden="true" style={{ marginRight: 8 }} />
                Add Waste Log
              </button>
            </div>

            <div className={styles.previousLogsHeaderRow}>
              <div className={styles.previousLogsLabel}>Previous Logs</div>
              <div className={styles.logsFilterWrap}>
                <select
                  className={styles.logsFilterSelect}
                  value={logsRange}
                  onChange={(e) => setLogsRange(e.target.value)}
                  aria-label="Filter previous logs by range"
                >
                  {["Today", "This Week", "This Month"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.prevListScroll}>
              {filteredLogsForList.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-recycle" aria-hidden="true" />
                  <span>No logs</span>
                </div>
              ) : (
                <ul className={styles.logsList}>
                  {groupedByDate.map(([d, items]) => (
                    <li key={d} className={styles.dateGroup}>
                      <div className={styles.dateHeader}>{formatDateLong(d)}</div>
                      <ul className={styles.itemsList}>
                        {items.map((l) => (
                          <li key={l.id} className={styles.logItem}>
                            <div className={styles.logRow}>
                              <i
                                className={`fas ${getCategoryIcon(l.type)} ${styles.typeIcon}`}
                                aria-hidden="true"
                                style={{ color: getCategoryColor(l.type) }}
                              />
                              <span
                                className={styles.typePill}
                                style={{ backgroundColor: getCategoryColor(l.type) }}
                              >
                                {l.type}
                              </span>
                              <span className={styles.amount}>
                                {l.quantity} {l.unit}
                              </span>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={() => handleDelete(l.id)}
                                aria-label={`Remove ${l.type} log`}
                              >
                                <i className="far fa-trash-alt" aria-hidden="true" /> Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className={styles.rightColumn}>
            {/* Leaderboard container */}
            <div className={styles.whiteContainer}>
              <div className={styles.leaderboard}>
                <div className={styles.leaderboardHeader}>
                  <i className="fas fa-trophy" aria-hidden="true" style={{ marginRight: 8 }} />
                  Leaderboard
                </div>
                <ul className={styles.leaderboardList}>
                  {leaderboard.length === 0 ? (
                    <li className={styles.emptyState}>
                      <i className="fas fa-users" aria-hidden="true" />
                      <span>No rankings yet</span>
                    </li>
                  ) : (
                    leaderboard.map((u) => (
                      <li
                        key={u.rank}
                        className={`${styles.leaderboardItem} ${
                          u.rank === 1
                            ? styles.leaderboardFirst
                            : u.rank === 2
                            ? styles.leaderboardSecond
                            : u.rank === 3
                            ? styles.leaderboardThird
                            : ""
                        }`}
                      >
                        <div className={styles.leaderboardRank}>{u.rank}</div>
                        <div className={`${styles.leaderboardName} ${u.rank === 1 ? styles.leaderboardNameFirst : ""}`}>
                          {u.rank === 1 && <i className={`fas fa-crown ${styles.crownIcon}`} aria-hidden="true" />}
                          {u.name}
                          {u.tier && <span className={styles.tierBadge} data-tier={u.tier}>{u.tier}</span>}
                        </div>
                        <div className={styles.leaderboardScore}>
                          <i className="fas fa-leaf" aria-hidden="true" /> {u.score}
                        </div>
                      </li>
                    ))
                  )}
                </ul>

                {/* Your Rank section */}
                <div className={styles.meSection}>
                  <div className={styles.meHeader}>Your Rank</div>
                  <div className={styles.meCard}>
                    <div className={styles.meRank}>{currentUser.rank}</div>
                    <div className={styles.meInfo}>
                      <div className={styles.meName}>
                        {currentUser.name}
                        <span className={styles.tierBadge} data-tier={currentUser.tier}>{currentUser.tier}</span>
                      </div>
                      <div className={styles.meScore}>
                        <i className="fas fa-leaf" aria-hidden="true" /> {currentUser.score}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts container */}
            <div className={styles.whiteContainer}>
              <div className={styles.chartSection}>
                <div className={styles.previousLogsLabel}>Waste Generation by Category</div>
                <div className={styles.chartControls}>
                  {["Today", "This Week", "This Month"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setChartRange(r)}
                      className={`${styles.filterBtn} ${chartRange === r ? styles.filterBtnActive : ""}`}
                      aria-pressed={chartRange === r}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className={styles.chartCanvasWrap}>
                  <canvas ref={chartCanvasRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              Add Waste Entry
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form className={styles.modalForm} onSubmit={handleAdd}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="category">
                    Category
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id="category"
                      className={styles.select}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      {CATEGORIES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroupInline}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="quantity">
                      Amount
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="999"
                      step="0.01"
                      className={styles.input}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className={styles.formGroupUnit}>
                    <label className={styles.formLabel} htmlFor="unit">
                      Unit
                    </label>
                    <div className={styles.selectWrap}>
                      <select
                        id="unit"
                        className={styles.select}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="date">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    className={`${styles.input} ${styles.inputDate}`}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="fas fa-plus" aria-hidden="true" style={{ marginRight: 8 }} />
                  Add Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme="colored"
        style={{ top: isMobile ? 68 : 8 }}
      />
    </main>
  );
}