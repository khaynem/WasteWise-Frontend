"use client";

import AdminNavBar from "../componentsadmin/adminNavBar";
import styles from './adashboard.module.css';
import { useEffect, useState } from "react";
import api from "../../../lib/axios";
import { requireRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function AdminDashboard() {
  const router = useRouter();
  const [reportTitles, setReportTitles] = useState([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    totalUsers: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const checkAuthentication = async () => {
      const user = await requireRole(router, 'admin', '/home');
      if (!user) toast.error("Admin access required.");
    };
    checkAuthentication();
  }, [router]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get("/api/admin/reports", {
          withCredentials: true
        });
        const reports = response.data;

        setReportTitles(reports.map(r => r.title));

        setStats({
          totalReports: reports.length,
          pendingReports: reports.filter(r => r.reportStatus === 'pending').length,
          resolvedReports: reports.filter(r => r.reportStatus === 'resolved').length,
          totalUsers: 0
        });

        // Sort reports by date descending (most recent first)
        const sortedReports = [...reports].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        // Create recent activities from sorted reports
        const activities = sortedReports.slice(0, 5).map((report) => ({
          id: report._id,
          type: 'report',
          message: `New report: ${report.title}`,
          time: new Date(report.date).toLocaleString(),
          icon: 'fas fa-exclamation-triangle',
          iconColor: report.reportStatus === 'resolved' ? '#10b981' : '#f59e0b'
        }));
        setRecentActivities(activities);

      } catch (error) {
        setReportTitles([]);
        setStats({
          totalReports: 0,
          pendingReports: 0,
          resolvedReports: 0,
          totalUsers: 0
        });
        setRecentActivities([]);
      }
    };
    fetchReports();
  }, []);

  return (
    <>
      <AdminNavBar />
      <main className={styles.dashboardMain}>
        <div className={styles.container}>
          <h1 className={styles.title}>Dashboard Overview</h1>
          
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: '#3b82f6' }}>
                <i className="fas fa-file-alt"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statTitle}>Total Reports</div>
                <div className={styles.statNumber}>{stats.totalReports}</div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b' }}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statTitle}>Pending Reports</div>
                <div className={styles.statNumber}>{stats.pendingReports}</div>
              </div>
            </div>
            
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: '#10b981' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div className={styles.statContent}>
                <div className={styles.statTitle}>Resolved Cases</div>
                <div className={styles.statNumber}>{stats.resolvedReports}</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.activitySection}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <div className={styles.activityContainer}>
              {recentActivities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div 
                    className={styles.activityIcon} 
                    style={{ backgroundColor: activity.iconColor }}
                  >
                    <i className={`${activity.icon}`}></i>
                  </div>
                  <div className={styles.activityContent}>
                    <span className={styles.activityMessage}>{activity.message}</span>
                    <span className={styles.activityTime}>— {activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}