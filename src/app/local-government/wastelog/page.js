"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./wastelog.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../../lib/axios";
import { requireAuth } from "../../../lib/auth";
import { useRouter } from "next/navigation";

const WASTE_TYPES = [
  { value: "Plastic", color: "#3b82f6", label: "Plastic" },
  { value: "Paper", color: "#10b981", label: "Paper" },
  { value: "Food", color: "#f59e0b", label: "Food" },
  { value: "Glass", color: "#8b5cf6", label: "Glass" },
  { value: "Metal", color: "#6b7280", label: "Metal" },
  { value: "E-Waste", color: "#ef4444", label: "E-Waste" },
  { value: "Other", color: "#06b6d4", label: "Other" },
];

export default function WasteLogAnalytics() {
  const router = useRouter();
  const [allLogs, setAllLogs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [chartRange, setChartRange] = useState("This Month");

  useEffect(() => {
    const checkAuthentication = async () => {
      const user = await requireAuth(router, '/home');
      if (!user) toast.error("Please sign in to continue.");
    };
    checkAuthentication();
  }, [router]);

  // Fetch all waste logs from all users (admin view)
  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const res = await api.get("/api/admin/wastelogs", { withCredentials: true });
        const logs = res.data?.wasteLogs || [];
        setAllLogs(logs.map(log => ({
          type: log.wasteType,
          quantity: parseFloat(log.quantity) || 0,
          date: new Date(log.date),
          user: log.user?.username || "Anonymous"
        })));
      } catch (error) {
        // Fallback: try to get user logs endpoint
        try {
          const res = await api.get("/api/user/wastelogs", { withCredentials: true });
          const logs = res.data?.wasteLogs || [];
          setAllLogs(logs.map(log => ({
            type: log.wasteType,
            quantity: parseFloat(log.quantity) || 0,
            date: new Date(log.date),
            user: "User"
          })));
        } catch (err) {
          console.error("Failed to fetch waste logs:", err);
        }
      }
    };
    fetchAllLogs();
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get("/api/user/leaderboard", { withCredentials: true });
        const data = res.data;
        const mappedLeaderboard = (data.leaderboard || []).slice(0, 5).map((entry) => ({
          rank: entry.placement,
          name: entry.user?.username || "Anonymous",
          score: entry.points,
          tier: entry.rank,
        }));
        setLeaderboard(mappedLeaderboard);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      }
    };
    fetchLeaderboard();
  }, []);

  // Filter logs by date range
  const filterByRange = (logs, range) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (range === "Today") {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      return logs.filter(l => l.date >= start && l.date <= today);
    }

    if (range === "This Week") {
      const dayIndex = today.getDay();
      const diffToMonday = (dayIndex + 6) % 7;
      const start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      return logs.filter(l => l.date >= start && l.date <= today);
    }

    // This Month
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return logs.filter(l => l.date >= start && l.date <= today);
  };

  const filteredLogs = useMemo(() => filterByRange(allLogs, chartRange), [allLogs, chartRange]);

  // Calculate totals by waste type
  const wasteTypeData = useMemo(() => {
    const totals = {};
    WASTE_TYPES.forEach(type => {
      totals[type.value] = 0;
    });

    filteredLogs.forEach(log => {
      if (totals[log.type] !== undefined) {
        totals[log.type] += log.quantity;
      }
    });

    return WASTE_TYPES.map(type => ({
      label: type.label,
      value: Math.round(totals[type.value] * 10) / 10,
      color: type.color
    })).filter(item => item.value > 0);
  }, [filteredLogs]);

  const maxValue = Math.max(...wasteTypeData.map(d => d.value), 1);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.pageLabel}>Waste Log Analytics</h1>
        <p className={styles.pageDesc}>
          System-wide waste tracking and leaderboard overview
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.analyticsContainer}>
          {/* Left: Analytics Chart */}
          <div className={styles.analyticsPanel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8 }} />
                Waste Type Analytics
              </h2>
              <div className={styles.chartControls}>
                {["Today", "This Week", "This Month"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setChartRange(r)}
                    className={`${styles.filterBtn} ${chartRange === r ? styles.filterBtnActive : ""}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.chartContainer}>
              {wasteTypeData.length === 0 ? (
                <div className={styles.emptyChart}>
                  <i className="fas fa-chart-bar" style={{ fontSize: "3rem", color: "#d1d5db", marginBottom: "1rem" }} />
                  <p>No waste logs for this period</p>
                </div>
              ) : (
                <div className={styles.barChartWrapper}>
                  <svg width="100%" height={wasteTypeData.length * 60 + 40} viewBox={`0 0 600 ${wasteTypeData.length * 60 + 40}`}>
                    <defs>
                      <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.2" />
                      </filter>
                    </defs>
                    {wasteTypeData.map((item, i) => {
                      const barHeight = 36;
                      const y = i * 60 + 20;
                      const barWidth = (item.value / maxValue) * 420;
                      return (
                        <g key={item.label}>
                          <text x={10} y={y + barHeight / 2 + 5} fontSize="14" fontWeight="600" fill="#374151">
                            {item.label}
                          </text>
                          <rect 
                            x={140} 
                            y={y} 
                            width={barWidth} 
                            height={barHeight} 
                            rx="8" 
                            fill={item.color} 
                            filter="url(#barShadow)"
                            opacity="0.9"
                          />
                          <text 
                            x={140 + barWidth + 12} 
                            y={y + barHeight / 2 + 5} 
                            fontSize="15" 
                            fontWeight="700" 
                            fill="#111827"
                          >
                            {item.value} kg
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Stats Summary */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ backgroundColor: "#10b981" }}>
                    <i className="fas fa-database" />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Total Logs</div>
                    <div className={styles.statValue}>{filteredLogs.length}</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ backgroundColor: "#3b82f6" }}>
                    <i className="fas fa-weight" />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Total Weight</div>
                    <div className={styles.statValue}>
                      {Math.round(filteredLogs.reduce((sum, log) => sum + log.quantity, 0) * 10) / 10} kg
                    </div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ backgroundColor: "#f59e0b" }}>
                    <i className="fas fa-recycle" />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statLabel}>Categories</div>
                    <div className={styles.statValue}>{wasteTypeData.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Leaderboard */}
          <div className={styles.leaderboardPanel}>
            <div className={styles.panelHeader}>
              <i className="fas fa-trophy" style={{ marginRight: "0.5rem" }} />
              <h3>Top 5 Contributors</h3>
            </div>
            <div className={styles.leaderboardContainer}>
              {leaderboard.length === 0 ? (
                <div className={styles.leaderboardInfo}>No contributors yet</div>
              ) : (
                leaderboard.slice(0, 5).map((user, index) => (
                  <div key={user._id} className={styles.leaderboardItem}>
                    <div className={styles.rank}>#{index + 1}</div>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userStats}>
                        {user.totalLogs} logs • {Math.round(user.totalWeight * 10) / 10} kg
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme="colored"
      />
    </main>
  );
}