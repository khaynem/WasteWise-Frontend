"use client";

import styles from './reports.module.css';
import { useState, useEffect } from 'react';
import api from "../../../lib/axios";
import dynamic from "next/dynamic";
const MapPreview = dynamic(() => import("../../components/MapPreview"), { ssr: false });
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { requireRole } from "../../../lib/auth";
import { useRouter } from "next/navigation";

export default function ViolationReports() {
  const router = useRouter();
  const [filter, setFilter] = useState('most-recent');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [openMapId, setOpenMapId] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const user = await requireRole(router, 'barangay', '/home');
      if (!user) toast.error("Barangay access required.");
    };
    checkAuthentication();
  }, [router]);

  // Fetch reports from backend on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/reports", {
        withCredentials: true
      });
      setReports(response.data);
      setError("");
    } catch (error) {
      setError("Failed to fetch reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async (reportId) => {
    try {
      await api.patch(`/api/admin/reports/${reportId}/manage`, {}, {
        withCredentials: true
      });
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, reportStatus: 'resolved' } : r));
      toast.success("Report marked as resolved.");
    } catch {
      toast.error("Failed to update report status.");
    }
  };

  const handleDownloadReports = async () => {
    if (downloading) return;

    // Build query from current filter
    const params = new URLSearchParams();
    if (filter === 'pending' || filter === 'resolved') {
      params.set('status', filter);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      setDownloading(true);
      const resp = await api.get(`/api/admin/reports/download/pdf${qs}`, {
        responseType: 'blob',
        withCredentials: true
      });

      const suffix = params.get('status') ? `-${params.get('status')}` : '';
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waste-reports${suffix}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully.");
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.info("No reports found for the selected filter.");
      } else {
        toast.error("Failed to download reports PDF.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Filter and sort reports based on selected filter
  const getFilteredReports = () => {
    let filteredReports = [...reports];

    // Always sort by date first (most recent by default)
    filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Then apply filters
    if (filter === 'resolved') {
      filteredReports = filteredReports.filter(report => report.reportStatus === 'resolved');
    } else if (filter === 'pending') {
      filteredReports = filteredReports.filter(report => report.reportStatus === 'pending');
    } else if (filter === 'oldest') {
      // Resort for oldest first
      filteredReports.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    // 'all' and 'most-recent' use the default sort (most recent first)

    return filteredReports;
  };

  const filteredReports = getFilteredReports();

  if (loading) {
    return (
      <>
        <main className={styles.reportsMain}>
          <div className={styles.container}>
            <div className={styles.centerMessage}>Loading reports...</div>
          </div>
        </main>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <main className={styles.reportsMain}>
          <div className={styles.container}>
            <div className={styles.errorMessage}>
              {error}
              <button onClick={fetchReports} className={styles.retryBtn}>Retry</button>
            </div>
          </div>
        </main>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </>
    );
  }

  return (
    <>
      <main className={styles.reportsMain}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Violation Reports</h1>
            <div className={styles.headerControls}>
              <div className={styles.filterSection}>
                <label htmlFor="report-filter" className={styles.filterLabel}>
                  Filter:
                </label>
                <select
                  aria-label="User Status"
                  id="report-filter"
                  className={styles.filterSelect}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="most-recent">Most Recent</option>
                  <option value="all">All Reports</option>
                  <option value="resolved">Resolved</option>
                  <option value="pending">Pending</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              <button
                className={styles.downloadBtn}
                onClick={handleDownloadReports}
                disabled={downloading || filteredReports.length === 0}
                title={
                  filteredReports.length === 0
                    ? "No reports to download for the selected filter"
                    : "Download all reports as PDF file"
                }
              >
                <i className="fas fa-download"></i>
                {downloading ? 'Generating...' : 'Download Reports'}
              </button>
            </div>
          </div>
          
          <div className={styles.reportsContainer}>
            <h2 className={styles.sectionTitle}>
              Recent Reports ({filteredReports.length})
            </h2>
            {filteredReports.length === 0 ? (
              <div className={styles.emptyState}>No reports found for the selected filter.</div>
            ) : (
              <ul className={styles.reportsList} role="list">
                {filteredReports.map((report) => {
                  const coords =
                    report.locCoords && report.locCoords.coordinates
                      ? report.locCoords.coordinates
                      : null;

                  return (
                    <li className={styles.reportCard} key={report._id}>
                      <div className={styles.reportHeader}>
                        <div className={styles.userInfo}>
                          <i className="fas fa-user-circle"></i>
                          <span className={styles.username}>
                            Reported by {report.reporterName}
                          </span>
                          <span className={styles.reportDate}>
                            {formatDate(report.date)}
                          </span>
                        </div>
                        {/* Status badge at top-right; moves below header on small screens */}
                        <div className={styles.headerStatus}>
                          <span
                            className={`${styles.status} ${
                              report.reportStatus === "pending" ? styles.pending : styles.resolved
                            }`}
                          >
                            <i
                              className={
                                report.reportStatus === "pending"
                                  ? "fas fa-clock"
                                  : "fas fa-check-circle"
                              }
                            ></i>
                            {report.reportStatus === "pending" ? "Pending" : "Resolved"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.reportContent}>
                        <div className={styles.imageSection}>
                          {report.image && report.image.length > 0 ? (
                            <img
                              src={report.image[0]}
                              alt="Violation report"
                              className={styles.reportImage}
                            />
                          ) : (
                            <div className={`${styles.reportImage} ${styles.imagePlaceholder}`}>
                              <i className={`fas fa-image ${styles.imagePlaceholderIcon}`}></i>
                            </div>
                          )}
                        </div>

                        <div className={styles.detailsSection}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}><strong>Title: </strong></span>
                            <span className={styles.detailValue}>{report.title}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}><strong>Description: </strong></span>
                            <span className={styles.detailValue}>{report.description}</span>
                          </div>
                          <div className={styles.locationRow}>
                            <span className={styles.detailLabel}><strong>Location: </strong></span>
                            <span className={styles.detailValue}>
                              {report.location || "Location not specified"}
                            </span>
                          </div>

                          {/* View Map Button */}
                          <div className={styles.mapSection}>
                            {coords && (
                              <button
                                className={styles.viewMapBtn}
                                onClick={() =>
                                  setOpenMapId(openMapId === report._id ? null : report._id)
                                }
                              >
                                {openMapId === report._id ? "Hide Map" : "View Map"}
                              </button>
                            )}
                            {coords && openMapId === report._id && <MapPreview coordinates={coords} />}
                          </div>

                          {/* Keep Resolve action under details if pending */}
                          {report.reportStatus === "pending" && (
                            <button
                              className={styles.resolveBtn}
                              onClick={() => handleMarkResolved(report._id)}
                            >
                              <i className="fas fa-check"></i>
                              Mark as Resolved
                            </button>
                          )}
                        </div>

                        {/* Removed badge from statusSection to avoid duplicates and overflow */}
                        {/* You can delete this whole block if it's no longer needed */}
                        {/* <div className={styles.statusSection}> ... </div> */}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
}