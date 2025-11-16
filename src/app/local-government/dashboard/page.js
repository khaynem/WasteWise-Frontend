"use client"

import styles from './local-government.module.css'
import { useEffect, useMemo, useState } from 'react'
import api from "../../../lib/axios"

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

export default function LocalGovernmentDashboard() {
  const [stats, setStats] = useState({ totalWasteLogs: 0, totalReports: 0, challengesCount: 0 })
  const [leaderboard, setLeaderboard] = useState([])
  const [challengeItems, setChallengeItems] = useState([])
  const [reportsByStatus, setReportsByStatus] = useState([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const token = getCookie("authToken")
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      try {
        const [reportsRes, challengesRes, lbRes, wlAdminRes] = await Promise.allSettled([
          api.get("/api/admin/reports", { headers, withCredentials: true }),
          api.get("/api/admin/challenges", { headers, withCredentials: true }),
          api.get("/api/user/leaderboard", { headers, withCredentials: true }),
          api.get("/api/admin/wastelogs", { headers, withCredentials: true }),
        ])

        let allReports = []
        if (reportsRes.status === "fulfilled") {
          const rj = reportsRes.value.data
          allReports = Array.isArray(rj) ? rj : (Array.isArray(rj?.reports) ? rj.reports : [])
        }

        let baseChallenges = []
        if (challengesRes.status === "fulfilled") {
          const cj = challengesRes.value.data
          baseChallenges = Array.isArray(cj) ? cj : []
        }

        let totalWasteLogs = 0
        if (wlAdminRes.status === "fulfilled") {
          const wj = wlAdminRes.value.data
          const wl = Array.isArray(wj) ? wj : (Array.isArray(wj?.wasteLogs) ? wj.wasteLogs : [])
          totalWasteLogs = wl.length
        } else {
          try {
            const wlUser = await api.get("/api/user/wastelogs", { headers, withCredentials: true })
            const wj = wlUser.data
            const wl = Array.isArray(wj) ? wj : (Array.isArray(wj?.wasteLogs) ? wj.wasteLogs : [])
            totalWasteLogs = wl.length
          } catch {}
        }

        let lb = []
        if (lbRes.status === "fulfilled") {
          const lj = lbRes.value.data
          const src = Array.isArray(lj) ? lj : (Array.isArray(lj?.leaderboard) ? lj.leaderboard : [])
          lb = src.map((entry, i) => ({
            id: entry.user?._id || entry.userId || `${entry.username || 'user'}-${i}`,
            rank: entry.placement ?? i + 1,
            name: entry.user?.username || entry.username || "Anonymous",
            score: entry.points ?? entry.score ?? 0,
            tier: entry.rank || entry.tier || "Bronze"
          }))
        }

        const challengesWithCounts = await Promise.all(
          baseChallenges.map(async (c, i) => {
            const id = c._id || c.id || `c-${i}`
            let submissions =
              Number(c.submissions) ||
              Number(c.submissionsCount) ||
              (Array.isArray(c.submissions) ? c.submissions.length : 0) ||
              0
            if (id && submissions === 0) {
              try {
                const subAdmin = await api.get(`/api/admin/challenges/${id}/submissions`, { headers, withCredentials: true })
                const arr = subAdmin.data
                submissions = Array.isArray(arr) ? arr.length : submissions
              } catch {}
            }
            return { id, name: c.title || c.name || "Untitled", submissions }
          })
        )

        const statusCounts = allReports.reduce((acc, rep) => {
          const s = String(rep.reportStatus || rep.status || "unknown").toLowerCase()
          acc[s] = (acc[s] || 0) + 1
          return acc
        }, {})
        const statusArray = Object.entries(statusCounts)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)

        if (!mounted) return
        setStats({ totalWasteLogs, totalReports: allReports.length, challengesCount: challengesWithCounts.length })
        setLeaderboard(lb)
        setChallengeItems(challengesWithCounts)
        setReportsByStatus(statusArray)
      } catch {
        if (!mounted) return
        setStats({ totalWasteLogs: 0, totalReports: 0, challengesCount: 0 })
        setLeaderboard([])
        setChallengeItems([])
        setReportsByStatus([])
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const STATUS_ORDER = ['resolved', 'pending', 'in progress', 'reviewing', 'open', 'rejected', 'closed', 'unknown']
  const STATUS_COLORS = {
    resolved: '#10b981',
    pending: '#f59e0b',
    'in progress': '#3b82f6',
    reviewing: '#3b82f6',
    open: '#0ea5e9',
    rejected: '#ef4444',
    closed: '#ef4444',
    unknown: '#94a3b8'
  }
  const toDisplay = (s) => s.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')

  const normalizedStatus = useMemo(() => {
    const arr = reportsByStatus.map(({ status, count }) => {
      const s = String(status).replace(/[_-]/g, ' ').toLowerCase()
      return { status: s, count }
    })
    arr.sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a.status); const bi = STATUS_ORDER.indexOf(b.status)
      const aidx = ai === -1 ? 999 : ai; const bidx = bi === -1 ? 999 : bi
      return aidx - bidx || b.count - a.count
    })
    return arr
  }, [reportsByStatus])
  const chartLabels = useMemo(() => normalizedStatus.map(r => toDisplay(r.status)), [normalizedStatus])
  const chartData = useMemo(() => normalizedStatus.map(r => r.count), [normalizedStatus])
  const chartColors = useMemo(() => normalizedStatus.map(r => STATUS_COLORS[r.status] || STATUS_COLORS.unknown), [normalizedStatus])

  return (
    <main className={styles.dashboardMain}>
      <div className={styles.container}>
        <h1 className={styles.title}>Local Government Dashboard</h1>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#10b981' }}>
              <i className="fas fa-database"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Total Waste Logs</div>
              <div className={styles.statNumber}>{stats.totalWasteLogs.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#3b82f6' }}>
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Total Reports</div>
              <div className={styles.statNumber}>{stats.totalReports.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b' }}>
              <i className="fas fa-flag"></i>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Number of Challenges</div>
              <div className={styles.statNumber}>{stats.challengesCount}</div>
            </div>
          </div>
        </div>

        <div className={styles.sectionRow}>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Challenges Overview</h2>
            <div className={styles.challengeList}>
              {challengeItems.length === 0 ? (
                <div className={styles.challengeItem}>
                  <div className={styles.challengeRow}>
                    <div className={styles.challengeName}>No challenges found</div>
                    <div className={styles.challengeSubmissions}>0 submissions</div>
                  </div>
                </div>
              ) : (
                challengeItems.map(c => (
                  <div key={c.id} className={styles.challengeItem}>
                    <div className={styles.challengeRow}>
                      <div className={styles.challengeName}>{c.name}</div>
                      <div className={styles.challengeSubmissions}>
                        <strong>{c.submissions ?? 0}</strong> submissions
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Eco-score Leaderboard</h2>
            <ol className={styles.leaderboardList}>
              {leaderboard.length === 0 ? (
                <li className={styles.leaderItem}><span>No rankings yet</span></li>
              ) : (
                leaderboard.map((u, idx) => (
                  <li
                    key={`${u.id || u.name}-${u.rank}-${idx}`}
                    className={
                      styles.leaderItem + ' ' +
                      (u.rank === 1 ? styles.leaderboardFirst : u.rank === 2 ? styles.leaderboardSecond : u.rank === 3 ? styles.leaderboardThird : '')
                    }
                  >
                    <div className={styles.leaderRow}>
                      <div className={styles.leaderRank}>{u.rank}</div>
                      <div className={styles.leaderNameWrap}>
                        {u.rank === 1 && <i className={`fas fa-crown ${styles.crownIcon}`} aria-hidden="true" />}
                        <span className={styles.leaderName}>{u.name}</span>
                        <span className={styles.tierBadge} data-tier={u.tier}>{u.tier}</span>
                      </div>
                      <div className={styles.leaderScore}><i className="fas fa-leaf" aria-hidden="true" /> {u.score}</div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>

        <section className={styles.panel} style={{ marginTop: 16 }}>
          <h2 className={styles.sectionTitle}>Reports by Status</h2>
          <div className={styles.chartWrap}>
            <BarChart data={chartData} labels={chartLabels} colors={chartColors} width={720} height={260} />
          </div>
        </section>
      </div>
    </main>
  )
}

function BarChart({ data = [], labels = [], colors = [], width = 720, height = 260 }) {
  const max = Math.max(...data, 1)
  const padding = { top: 16, right: 20, bottom: 48, left: 28 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const gap = 14
  const barW = innerW / Math.max(1, data.length) - gap
  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max / ticks) * i))

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%' }}>
      <defs>
        <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {tickVals.map((t, i) => {
          const y = innerH - (innerH * t) / max
          return (
            <g key={`grid-${i}`}>
              <line x1={0} y1={y} x2={innerW} y2={y} stroke="rgba(15,23,42,0.08)" strokeWidth="1" />
            </g>
          )
        })}
        <line x1={0} y1={innerH + 1} x2={innerW} y2={innerH + 1} stroke="rgba(15,23,42,0.18)" strokeWidth="1.5" />
        {data.map((v, i) => {
          const h = (innerH * v) / max
          const x = i * (barW + gap) + gap / 2
          const y = innerH - h
          const fill = colors[i] || '#10b981'
          return (
            <g key={`${labels[i]}-${i}`}>
              <rect x={x} y={y} width={barW} height={h} rx="8" fill={fill} filter="url(#barShadow)" />
              <text x={x + barW / 2} y={y - 8} fontSize="12" textAnchor="middle" fill="#0f172a" fontWeight="700">
                {v.toLocaleString()}
              </text>
              <text x={x + barW / 2} y={innerH + 22} fontSize="12" textAnchor="middle" fill="#0f172a">
                {labels[i]}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
