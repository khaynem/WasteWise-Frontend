"use client"

import styles from './barangay.module.css'
import { useMemo, useState, useEffect } from 'react'
import api from "../../../lib/axios"

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

export default function BarangayDashboard() {
  const [stats, setStats] = useState({ totalWasteLogs: 0, reportsSubmitted: 0, challengesCount: 0 })
  const [leaderboard, setLeaderboard] = useState([])
  const [userRanking, setUserRanking] = useState({ points: 0, rank: "Bronze", placement: null })
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const token = getCookie("authToken")
      if (!token) return
      const res = await api.get("/api/user/leaderboard", { headers: { Authorization: `Bearer ${token}` } })
      const data = res.data
      setLeaderboard((data.leaderboard || []).map((entry, i) => ({
        rank: entry.placement ?? i + 1,
        name: entry.user?.username || entry.username || "Anonymous",
        score: entry.points ?? 0,
        tier: entry.rank || "Bronze"
      })))
      if (data.userPlacement) {
        setUserRanking({
          points: data.userPlacement.points ?? 0,
          rank: data.userPlacement.rank || "Bronze",
          placement: data.userPlacement.placement ?? null
        })
      }
    } catch {}
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const token = getCookie("authToken")
      const auth = token ? { Authorization: `Bearer ${token}` } : {}
      try {
        const statsRes = await api.get("/api/barangay/stats", { headers: auth })
        if (mounted) {
          const sj = statsRes.data
          setStats({
            totalWasteLogs: sj.totalWasteLogs ?? 0,
            reportsSubmitted: sj.reportsSubmitted ?? 0,
            challengesCount: sj.challengesCount ?? 0
          })
        }
      } catch {
        try {
          const [wLogsRes, reportsRes, challengesRes] = await Promise.allSettled([
            api.get("/api/user/wastelogs", { headers: auth }),
            api.get("/api/admin/reports", { headers: auth }),
            api.get("/api/admin/challenges", { headers: auth })
          ])
          let totalWasteLogs = 0
          let reportsSubmitted = 0
          let challengesCount = 0
          if (wLogsRes.status === 'fulfilled') {
            const wJson = wLogsRes.value.data
            totalWasteLogs = (wJson.wasteLogs || []).length
          }
          if (reportsRes.status === 'fulfilled') {
            const rJson = reportsRes.value.data
            reportsSubmitted = Array.isArray(rJson) ? rJson.length : 0
          }
          if (challengesRes.status === 'fulfilled') {
            const cJson = challengesRes.value.data
            challengesCount = Array.isArray(cJson) ? cJson.length : 0
          }
          if (mounted) setStats({ totalWasteLogs, reportsSubmitted, challengesCount })
        } catch {}
      }

      try {
        // Challenges base list
        const chRes = await api.get("/api/admin/challenges", { headers: auth })
        const cData = chRes.data
        let items = (Array.isArray(cData) ? cData : []).map(c => ({
          id: c._id || c.id || `${c.title}-${Math.random()}`,
          name: c.title || c.name || 'Untitled',
          description: c.description || '',
          points: Number(c.points) || 0,
          submissions: 0 // placeholder; will be replaced
        }))
        // Fetch per-challenge submissions count
        const counts = await Promise.all(items.map(async ch => {
          try {
            const r = await api.get(`/api/admin/challenges/${ch.id}/submissions`, { headers: auth })
            const arr = r.data
            return { id: ch.id, submissions: Array.isArray(arr) ? arr.length : 0 }
          } catch { return { id: ch.id, submissions: 0 } }
        }))
        items = items.map(ch => {
          const found = counts.find(c => c.id === ch.id)
          return { ...ch, submissions: found ? found.submissions : ch.submissions }
        })
        if (mounted) setChallenges(items)
        if (mounted && stats.challengesCount === 0) {
          setStats(prev => ({ ...prev, challengesCount: items.length }))
        }
      } catch {}

      try {
        await fetchLeaderboard()
      } catch {}
      } catch {} finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const chartValues = useMemo(() => challenges.map(c => c.submissions ?? 0), [challenges])
  const chartLabels = useMemo(() => challenges.map(c => c.name), [challenges])

  return (
    <main className={styles.dashboardMain}>
      <div className={styles.container}>
        <h1 className={styles.title}>Barangay Dashboard</h1>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="fas fa-database" /></div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Total Waste Logs</div>
              <div className={styles.statNumber}>{Number(stats.totalWasteLogs||0).toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}><i className="fas fa-exclamation-triangle" /></div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Reports Submitted</div>
              <div className={styles.statNumber}>{Number(stats.reportsSubmitted||0).toLocaleString()}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconAmber}`}><i className="fas fa-flag" /></div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Challenges</div>
              <div className={styles.statNumber}>{Number(stats.challengesCount||0)}</div>
            </div>
          </div>
        </div>

        <div className={styles.sectionRow}>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Eco-score Leaderboard</h2>
            <ol className={styles.leaderboardList}>
              {leaderboard.length === 0 ? (
                <li className={styles.leaderItem}><span>No rankings yet</span></li>
              ) : (
                leaderboard.map(u => (
                  <li
                    key={u.rank}
                    className={
                      styles.leaderItem + ' ' +
                      (u.rank === 1 ? styles.leaderboardFirst : u.rank === 2 ? styles.leaderboardSecond : u.rank === 3 ? styles.leaderboardThird : '')
                    }
                  >
                    <div className={styles.leaderRow}>
                      <div className={styles.leaderRank}>{u.rank}</div>
                      <div className={styles.leaderNameWrap}>
                        {u.rank === 1 && <i className={`fas fa-crown ${styles.crownIcon}`} />}
                        <span className={styles.leaderName}>{u.name}</span>
                        <span className={styles.tierBadge} data-tier={u.tier}>{u.tier}</span>
                      </div>
                      <div className={styles.leaderScore}><i className="fas fa-leaf" /> {u.score}</div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Challenge Participation</h2>
            <div className={styles.challengeList}>
              {challenges.length === 0 ? (
                <div className={styles.challengeItem} style={{ textAlign:'center', fontWeight:600 }}>No challenges found.</div>
              ) : (
                challenges.map(c => (
                  <div key={c.id} className={styles.challengeItem}>
                    <div className={styles.challengeRow}>
                      <div className={styles.challengeName}>{c.name}</div>
                      <div className={styles.challengeMeta}>
                        <strong>{c.submissions ?? 0}</strong> submissions
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className={styles.chartWrap}>
              <div className={styles.chartTitle}>Submissions by Challenge</div>
              <svg
                width="100%"
                height={Math.max(1, chartValues.length) * 36}
                role="img"
                aria-label="Challenge submissions chart"
                className={styles.barChart}
                preserveAspectRatio="xMinYMin meet"
                viewBox={`0 0 420 ${Math.max(1, chartValues.length) * 36}`}
              >
                {chartValues.map((val, i) => {
                  const h = 36 * 0.6
                  const y = i * 36 + (36 - h) / 2
                  const max = Math.max(...chartValues, 1)
                  const barW = Math.round((val / max) * (420 - 140))
                  return (
                    <g key={i}>
                      <text x={8} y={y + h / 2 + 4} fontSize="12" fill="#0f172a">{chartLabels[i]}</text>
                      <rect x={140} y={y} width={barW} height={h} rx={6} className={styles.barRect} />
                      <text x={140 + barW + 8} y={y + h / 2 + 4} fontSize="12" fill="#0f172a">{val}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
