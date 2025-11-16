"use client"

import styles from "./non-government.module.css"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import api from "../../../lib/axios"
import { requireAuth } from "../../../lib/auth"

export default function NonGovernmentDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWasteLogs: 0,
    totalReports: 0,
    challengesCount: 0,
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requireAuth(router);
  }, [router]);

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)

      try {
        const [wRes, rRes, cRes, lbRes] = await Promise.allSettled([
          api.get("/api/user/wastelogs", { withCredentials: true }),
          api.get("/api/admin/reports", { withCredentials: true }),
          api.get("/api/admin/challenges", { withCredentials: true }),
          api.get("/api/user/leaderboard", { withCredentials: true }),
        ])

        let totalWasteLogs = 0
        if (wRes.status === "fulfilled") {
          const wJson = wRes.value.data
          const wl = Array.isArray(wJson) ? wJson : (Array.isArray(wJson?.wasteLogs) ? wJson.wasteLogs : [])
          totalWasteLogs = wl.length
        }

        let totalReports = 0
        if (rRes.status === "fulfilled") {
          const rJson = rRes.value.data
          const all = Array.isArray(rJson) ? rJson : (Array.isArray(rJson?.reports) ? rJson.reports : [])
          totalReports = all.length
        }

        let items = []
        if (cRes.status === "fulfilled") {
          const cj = cRes.value.data
          const base = Array.isArray(cj) ? cj : []
          items = await Promise.all(
            base.map(async (c) => {
              const id = c._id || c.id
              let submissions =
                Number(c.submissions) ||
                Number(c.submissionsCount) ||
                (Array.isArray(c.submissions) ? c.submissions.length : 0) ||
                0
              if (id && submissions === 0) {
                try {
                  const sr = await api.get(`/api/admin/challenges/${id}/submissions`, { withCredentials: true })
                  const arr = sr.data
                  submissions = Array.isArray(arr) ? arr.length : submissions
                } catch {}
              }
              return {
                id: id || `${c.title || c.name}-${Math.random()}`,
                name: c.title || c.name || "Untitled",
                submissions,
              }
            })
          )
        }

        let lb = []
        if (lbRes.status === "fulfilled") {
          const data = lbRes.value.data
          const src = Array.isArray(data) ? data : (Array.isArray(data?.leaderboard) ? data.leaderboard : [])
          lb = src.map((entry, i) => ({
            id: entry.user?._id || entry.userId || `${entry.username || 'user'}-${i}`,
            rank: entry.placement ?? i + 1,
            name: entry.user?.username || entry.username || "Anonymous",
            score: entry.points ?? entry.score ?? 0,
            tier: entry.rank || entry.tier || "Bronze"
          }))
        }

        if (!mounted) return
        setStats({ totalWasteLogs, totalReports, challengesCount: items.length })
        setChallenges(items)
        setLeaderboard(lb)
      } catch {
        if (!mounted) return
        setStats({ totalWasteLogs: 0, totalReports: 0, challengesCount: 0 })
        setChallenges([])
        setLeaderboard([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <main className={styles.dashboardMain}>
      <div className={styles.container}>
        <h1 className={styles.title}>NGO Dashboard</h1>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: "#10b981" }}>
              <i className="fas fa-database" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Total Waste Logs</div>
              <div className={styles.statNumber}>{stats.totalWasteLogs.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: "#3b82f6" }}>
              <i className="fas fa-clipboard-list" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Total Reports</div>
              <div className={styles.statNumber}>{stats.totalReports.toLocaleString()}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: "#f59e0b" }}>
              <i className="fas fa-flag" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Number of Challenges</div>
              <div className={styles.statNumber}>{stats.challengesCount}</div>
            </div>
          </div>
        </div>

        <div className={styles.sectionRow}>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Challenge Participation</h2>
            <div className={styles.challengeList}>
              {challenges.map((c) => (
                <div key={c.id} className={styles.challengeItem}>
                  <div className={styles.challengeRow}>
                    <div className={styles.challengeName}>{c.name}</div>
                    <div className={styles.challengeSubmissions}>
                      <strong>{c.submissions ?? 0}</strong> submissions
                    </div>
                  </div>
                </div>
              ))}
              {(!loading && challenges.length === 0) && (
                <div className={styles.challengeItem}>
                  <div className={styles.challengeRow}>
                    <div className={styles.challengeName}>No challenges found</div>
                    <div className={styles.challengeSubmissions}>0 submissions</div>
                  </div>
                </div>
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
                        {u.tier && <span className={styles.tierBadge} data-tier={u.tier}>{u.tier}</span>}
                      </div>
                      <div className={styles.leaderScore}><i className="fas fa-leaf" aria-hidden="true" /> {u.score ?? u.points ?? 0}</div>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}
