"use client";

import api from "../../lib/axios";
import { useState, useMemo, useRef, useEffect } from "react";
import styles from "./schedule.module.css";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}


// Fetch schedules from backend
const fetchSchedules = async () => {
  //const authToken = getCookie("authToken");
  try {
    const response = await api.get("/api/user/schedules", {
      headers: {
        // Authorization: `Bearer ${authToken}`,
      },
    });
    console.log("Fetched schedules:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return [];
  }
};

const getTypeColor = (typeName) => {
  const colors = {
    "Biodegradable": "#4CAF50",
    "Recyclable": "#2196F3",
    "Residual": "#9E9E9E",
    "Bulky": "#FF9800",
    "Special Waste": "#F44336"
  };
  return colors[typeName] || "#666";
};

// Helper function to parse day string and calculate next pickup
function getNextPickupFromDay(dayString) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Handle "On call" case
  if (dayString.toLowerCase().includes("on call")) {
    return { daysLeft: "On call", dateStr: "", daysNum: null };
  }
  
  // Handle monthly schedules
  if (dayString.toLowerCase().includes("once a month")) {
    if (dayString.includes("Sunday")) {
      return getNextMonthly("Sunday");
    } else if (dayString.includes("1st Tuesday")) {
      return getNextMonthly("Tuesday", 1);
    } else if (dayString.includes("2nd Wednesday")) {
      return getNextMonthly("Wednesday", 2);
    } else if (dayString.includes("3rd Monday")) {
      return getNextMonthly("Monday", 3);
    }
  }
  
  // Handle regular weekly schedules
  const days = [];
  dayNames.forEach(day => {
    if (dayString.includes(day)) {
      days.push(day);
    }
  });
  
  if (days.length > 0) {
    return getNextDay(days);
  }
  
  return { daysLeft: "", dateStr: "", daysNum: null };
}

function getNextDay(days) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayIdx = today.getDay();
  let minDiff = 8;
  let nextDate = null;
  
  for (let d of days) {
    const idx = dayNames.indexOf(d);
    let diff = idx - todayIdx;
    if (diff < 0) diff += 7;
    if (diff === 0) diff = 7;
    if (diff < minDiff) {
      minDiff = diff;
      nextDate = new Date(today);
      nextDate.setDate(today.getDate() + diff);
    }
  }
  
  if (!nextDate) return { daysLeft: "", dateStr: "", daysNum: null };
  const options = { month: "long", day: "numeric" };
  return {
    daysLeft: minDiff === 1 ? "In 1 day" : `In ${minDiff} days`,
    dateStr: nextDate.toLocaleDateString(undefined, options),
    daysNum: minDiff
  };
}

function getNextMonthly(dayName, nth = 1) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const month = today.getMonth();
  const year = today.getFullYear();
  let count = 0;
  let nextDate = null;
  
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    date.setHours(0,0,0,0);
    if (date.getMonth() !== month) break;
    if (dayNames[date.getDay()] === dayName) {
      count++;
      if (count === nth && date >= today) {
        nextDate = date;
        break;
      }
    }
  }
  
  if (!nextDate) {
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const realNextMonth = nextMonth % 12;
    count = 0;
    for (let d = 1; d <= 31; d++) {
      const date = new Date(nextYear, realNextMonth, d);
      date.setHours(0,0,0,0);
      if (date.getMonth() !== realNextMonth) break;
      if (dayNames[date.getDay()] === dayName) {
        count++;
        if (count === nth) {
          nextDate = date;
          break;
        }
      }
    }
  }
  
  if (!nextDate) return { daysLeft: "", dateStr: "", daysNum: null };
  const diff = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));
  const options = { month: "long", day: "numeric" };
  return {
    daysLeft: diff === 0 ? "Today" : diff === 1 ? "In 1 day" : `In ${diff} days`,
    dateStr: nextDate.toLocaleDateString(undefined, options),
    daysNum: diff
  };
}

const sortOptions = [
  { value: "type", label: "Type" },
  { value: "daysNum", label: "Next Pickup (Soonest)" },
  { value: "schedule", label: "Schedule" }
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState("daysNum");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  const filterRef = useRef(null);

  // Fetch schedules on component mount
  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true);
      const fetchedSchedules = await fetchSchedules();
      setSchedules(fetchedSchedules);
      setLoading(false);
    };
    loadSchedules();
  }, []);

  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilter]);

  // Get unique barangay names from API data
  const barangays = useMemo(() => {
    return schedules.map(s => s.barangay).sort();
  }, [schedules]);

  // Get schedule data for selected barangay
  const barangaySchedules = useMemo(() => {
    if (!selectedBarangay || schedules.length === 0) return [];

    const barangayData = schedules.find(s => s.barangay === selectedBarangay);
    if (!barangayData || !Array.isArray(barangayData.type)) return [];

    // The backend now returns type as array of objects with _id, typeName, day
    return barangayData.type.map(t => ({
      type: t.typeName,
      color: getTypeColor(t.typeName),
      schedule: t.day,
      next: getNextPickupFromDay(t.day)
    }));
  }, [selectedBarangay, schedules]);

  const filteredSchedules = useMemo(() => {
    let arr = barangaySchedules;
    if (sortBy === "type") {
      arr = [...arr].sort((a, b) => a.type.localeCompare(b.type));
    } else if (sortBy === "schedule") {
      arr = [...arr].sort((a, b) => a.schedule.localeCompare(b.schedule));
    } else if (sortBy === "daysNum") {
      arr = [...arr].sort((a, b) => {
        if (a.next.daysNum == null) return 1;
        if (b.next.daysNum == null) return -1;
        return a.next.daysNum - b.next.daysNum;
      });
    }
    return arr;
  }, [barangaySchedules, sortBy]);

  function isImportant(s) {
    return s.next.daysNum !== null && s.next.daysNum <= 2;
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.scheduleLabel}>Schedules</div>
          <p className={styles.scheduleDesc}>Loading schedules...</p>
        </header>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.scheduleLabel}>
          Schedules
        </div>
        <p className={styles.scheduleDesc}>
          View and search all waste collection schedules for your barangay.
        </p>
      </header>
      <section className={styles.section}>
        <div className={styles.scheduleBar}>
          <div className={styles.scheduleBarLeft}>
            <div className={styles.customSelectWrapper} style={{ minWidth: "220px" }}>
              <select
                aria-label="Barangay Selection"
                value={selectedBarangay}
                onChange={e => {
                  setSelectedBarangay(e.target.value);
                  setDropdownOpen(false);
                }}
                className={styles.select}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setDropdownOpen(false)}
              >
                <option value="" disabled>
                  Select Barangay
                </option>
                {barangays.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.scheduleBarRight} ref={filterRef}>
            <button
              className={styles.filterBtn}
              type="button"
              onClick={() => setShowFilter(f => !f)}
              aria-label="Filter"
            >
              <i className="fa-solid fa-filter"></i>
              Filter
            </button>
            {showFilter && (
              <div className={styles.filterDropdown}>
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.filterDropdownOption}${sortBy === opt.value ? " " + styles.selected : ""}`}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowFilter(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.scheduleTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Schedule</th>
                <th>Next Pickup</th>
              </tr>
            </thead>
            <tbody>
              {(selectedBarangay && filteredSchedules.length > 0 ? filteredSchedules : []).map((s, index) => (
                <tr
                  key={`${s.type}-${index}`}
                  className={`${styles.scheduleRow}${isImportant(s) ? " " + styles.important : ""}`}
                  style={{
                    background: isImportant(s) ? "#e6fff3" : "#fff",
                  }}
                >
                  <td className={`${styles.scheduleCell} ${styles.scheduleType}`} style={{ color: s.color }}>
                    <span style={{
                      display: "inline-block",
                      width: "1.1em",
                      height: "1.1em",
                      background: s.color,
                      borderRadius: "50%",
                      marginRight: "0.5em",
                      verticalAlign: "middle"
                    }}></span>
                    {s.type}
                  </td>
                  <td className={styles.scheduleCell}>
                    {s.schedule}
                  </td>
                  <td className={`${styles.scheduleCell} ${styles.scheduleNext}${isImportant(s) ? " " + styles.important : ""}`}>
                    {s.next.daysLeft}{s.next.dateStr ? <span className={styles.scheduleNextDate}> ({s.next.dateStr})</span> : ""}
                    {isImportant(s) && (
                      <span style={{
                        marginLeft: "0.7em",
                        background: "#047857",
                        color: "#fff",
                        borderRadius: "0.7em",
                        padding: "0.2em 0.8em",
                        fontSize: "0.9em",
                        fontWeight: "bold",
                        boxShadow: "0 2px 8px #04785722"
                      }}>
                        Upcoming
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!selectedBarangay || filteredSchedules.length === 0) && (
                <tr>
                  <td colSpan={3} style={{ color: "#888", fontSize: "0.95rem", textAlign: "center", padding: "1.5rem" }}>
                    {!selectedBarangay ? "Please select a barangay to view schedule." : "No schedule data available for this barangay."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}