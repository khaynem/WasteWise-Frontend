"use client";

import { useEffect, useState } from "react";
import AdminNavBar from "../componentsadmin/adminNavBar";
import styles from "./achallenges.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal + form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [points, setPoints] = useState("");
  const [instMode, setInstMode] = useState("paragraph"); // "paragraph" | "bulleted"
  const [rulesText, setRulesText] = useState("");

  // Simple detail modal (uses loaded list data)
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Submissions state
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Delete confirm modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = getCookie("authToken");
        const res = await fetch(`${API_BASE}/api/admin/challenges`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const items = (Array.isArray(data) ? data : []).map((c) => ({
          id: c._id || c.id,
          title: c.title,
          description: c.description,
          instructions: c.instructions,
          points: Number(c.points) || 0,
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
        }));
        items.sort((a, b) => b.createdAt - a.createdAt);
        setChallenges(items);
        setError("");
      } catch {
        setError("Failed to fetch challenges.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setInstructions("");
    setPoints("");
    setInstMode("paragraph");
    setRulesText("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const pts = Number(points);

    if (!title.trim() || !description.trim() || Number.isNaN(pts) || pts <= 0) {
      toast.error("Please complete all fields with valid values.");
      return;
    }

    let instructionsPayload = "";
    if (instMode === "paragraph") {
      if (!instructions.trim()) {
        toast.error("Please enter instructions.");
        return;
      }
      instructionsPayload = instructions.trim();
    } else {
      const lines = rulesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (!lines.length) {
        toast.error("Add at least one rule.");
        return;
      }
      instructionsPayload = lines.map((r) => `• ${r}`).join("\n");
    }

    try {
      const token = getCookie("authToken");
      const res = await fetch(`${API_BASE}/api/admin/challenges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          instructions: instructionsPayload,
          points: pts,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const c = await res.json();
      const item = {
        id: c._id || `${Date.now()}`,
        title: c.title,
        description: c.description,
        instructions: c.instructions,
        points: Number(c.points) || pts,
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
      };
      setChallenges((prev) => [item, ...prev]);
      setShowCreate(false);
      resetForm();
      toast.success("Challenge created.");
    } catch {
      toast.error("Failed to create challenge.");
    }
  };

  // Replace previous immediate delete with modal trigger
  const askDelete = (c) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = getCookie("authToken");
      const res = await fetch(`${API_BASE}/api/admin/challenges/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setChallenges((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) {
        setDetailOpen(false);
        setSelected(null);
      }
      toast.success("Challenge deleted.");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete challenge.");
    } finally {
      setDeleting(false);
    }
  };

  const loadSubmissions = async (challengeId) => {
    try {
      setSubsLoading(true);
      setSubsError("");
      const token = getCookie("authToken");
      const res = await fetch(`${API_BASE}/api/admin/challenges/${challengeId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load submissions");
      const data = await res.json();
      const items = (Array.isArray(data) ? data : []).map(s => ({
        id: s._id || `${s.userId}-${s.submittedAt}`,
        username: s.username || "User",
        userId: s.userId,
        proof: s.proof,
        description: s.description,
        submittedAt: s.submittedAt ? new Date(s.submittedAt) : null,
      }));
      setSubmissions(items);
    } catch (e) {
      setSubsError("Failed to load submissions.");
    } finally {
      setSubsLoading(false);
    }
  };

  const openDetail = (c) => {
    setSelected(c);
    setDetailOpen(true);
    loadSubmissions(c.id);
  };

  const openSubmission = (s) => {
    setSelectedSubmission(s);
    setSubModalOpen(true);
  };

  // Format: Month Day, Year 11:11PM
  const formatDateTime = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${month} ${day}, ${year} ${hour}:${minute}${ampm}`;
  };

  const getInitial = (name) =>
    (name || "").trim().charAt(0).toUpperCase() || "U";

  // Render instructions as bullets if they contain bullet markers or multiple lines
  const renderInstructions = (text) => {
    if (!text) return null;
    const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const hasBullets = lines.some(l => /^[•\-\u2022]/.test(l));
    if (hasBullets || lines.length > 1) {
      const items = lines.map(l => l.replace(/^[•\-\u2022]\s*/, ""));
      return (
        <ul className={styles.rulesList}>
          {items.map((it, i) => (
            <li key={i} className={styles.ruleItem}>{it}</li>
          ))}
        </ul>
      );
    }
    return <div className={styles.paragraphText}>{text}</div>;
  };

  return (
    <>
      <AdminNavBar />
      <main className={styles.challengesMain}>
        <div className={styles.container}>
          <h1 className={styles.title}>Challenges Management</h1>

          <div className={styles.tableContainer}>
            <div className={styles.headerSection}>
              <h2 className={styles.sectionTitle}>Challenges</h2>
              <div className={styles.headerActions}>
                <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
                  <i className="fas fa-plus" aria-hidden="true" /> New Challenge
                </button>
              </div>
            </div>

            <div className={styles.gridWrap}>
              {loading ? (
                <div className={styles.loading}>Loading challenges...</div>
              ) : error ? (
                <div className={styles.errorBar}>{error}</div>
              ) : challenges.length ? (
                <div className={styles.challengeGrid}>
                  {challenges.map((c) => (
                    <div key={c.id} className={styles.challengeCard}>
                      <div className={styles.cardHeaderRow}>
                        <h3 className={styles.cardTitle}>{c.title}</h3>
                        <div className={styles.cardActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => askDelete(c)}
                            title="Delete"
                            aria-label={`Delete ${c.title}`}
                          >
                            <i className="fas fa-trash-alt" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className={styles.cardPartition} aria-hidden="true" />
                      <p className={styles.cardDesc}>{c.description}</p>
                      <div className={styles.cardBottom}>
                        <span className={styles.pointsBadge}>
                          <i className="fas fa-leaf" aria-hidden="true" /> {c.points} pts
                        </span>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => openDetail(c)}
                          aria-label={`View ${c.title}`}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>No challenges found.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Detail modal */}
      {detailOpen && selected && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setDetailOpen(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>{selected.title}</span>
              <button className={styles.modalClose} type="button" onClick={() => setDetailOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Title</label>
                <div>{selected.title}</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <div className={styles.paragraphText}>{selected.description}</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Instructions</label>
                {renderInstructions(selected.instructions)}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Points</label>
                <span className={styles.pointsBadge}>
                  <i className="fas fa-leaf" aria-hidden="true" /> {selected.points} pts
                </span>
              </div>

              {/* Submissions section */}
              <div className={styles.subsHeaderRow}>
                <span className={styles.label}>Submissions</span>
                <span className={styles.subsCount}>
                  {subsLoading ? "Loading..." : `${submissions.length} total`}
                </span>
              </div>
              {subsError && <div className={styles.errorBar}>{subsError}</div>}
              {!subsLoading && submissions.length === 0 && !subsError && (
                <div className={styles.emptyState}>No submissions yet.</div>
              )}
              {!subsLoading && submissions.length > 0 && (
                <ul className={styles.submissionsList}>
                  {submissions.map((s) => (
                    <li key={s.id} className={styles.submissionItem}>
                      <div className={styles.subLeft}>
                        <div className={styles.subAvatar} aria-hidden="true">{getInitial(s.username)}</div>
                        <div className={styles.subText}>
                          <div className={styles.subName} title={s.username}>{s.username}</div>
                          <div className={styles.subTime}>
                            {s.submittedAt ? formatDateTime(s.submittedAt) : ""}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.submissionBtn}
                        onClick={() => openSubmission(s)}
                      >
                        View Submission
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View submission modal */}
      {subModalOpen && selectedSubmission && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setSubModalOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="subTitle">
            <div className={styles.modalHeader}>
              <span id="subTitle">Submission by {selectedSubmission.username}</span>
              <button className={styles.modalClose} type="button" onClick={() => setSubModalOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Submitted</label>
                <div>
                  {selectedSubmission.submittedAt ? formatDateTime(selectedSubmission.submittedAt) : ""}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <div className={styles.paragraphText}>{selectedSubmission.description}</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Proof Image</label>
                <div className={styles.proofWrap}>
                  <img
                    className={styles.proofImg}
                    src={selectedSubmission.proof}
                    alt={`Submission from ${selectedSubmission.username}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>Create Challenge</span>
              <button className={styles.modalClose} type="button" onClick={() => setShowCreate(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="title">Title</label>
                <input id="title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plastic-Free Week" />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="desc">Description</label>
                <textarea id="desc" className={styles.textarea} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full challenge description..." />
              </div>

              {/* Instructions format toggle */}
              <div className={styles.instToggle}>
                <span className={styles.toggleLabel}>Instructions format</span>
                <div className={styles.toggleButtons} role="tablist" aria-label="Instructions format">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={instMode === "paragraph"}
                    className={`${styles.toggleBtn} ${instMode === "paragraph" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setInstMode("paragraph")}
                  >
                    Paragraph
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={instMode === "bulleted"}
                    className={`${styles.toggleBtn} ${instMode === "bulleted" ? styles.toggleBtnActive : ""}`}
                    onClick={() => setInstMode("bulleted")}
                  >
                    Bulleted
                  </button>
                </div>
              </div>

              {instMode === "paragraph" ? (
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="inst">Instructions</label>
                  <textarea
                    id="inst"
                    className={styles.textarea}
                    rows={4}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Write instructions for the challenge..."
                  />
                  <div className={styles.inlineHelp}>This will appear as a paragraph.</div>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="rules">Rules (one per line)</label>
                  <textarea
                    id="rules"
                    className={styles.textarea}
                    rows={4}
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    placeholder={"No single-use plastic bags\nReuse containers\nShare at least one photo"}
                  />
                  <div className={styles.inlineHelp}>Each line becomes a bullet, similar to the Challenges page.</div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="points">Points</label>
                <input id="points" type="number" min="1" step="1" className={styles.input} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="100" />
              </div>

              <div className={styles.actionsRow}>
                <button type="submit" className={styles.buttonPrimary}>
                  <i className="fas fa-save" aria-hidden="true" /> Save
                </button>
                <button type="button" className={styles.buttonSecondary} onClick={() => { setShowCreate(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteOpen && deleteTarget && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && !deleting && setDeleteOpen(false)}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
            <div className={styles.modalHeader}>
              <span id="deleteTitle">Delete Challenge</span>
              <button
                className={styles.modalClose}
                type="button"
                onClick={() => !deleting && setDeleteOpen(false)}
                aria-label="Close"
                disabled={deleting}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Are you sure you want to delete "<b>{deleteTarget.title}</b>"? This action cannot be undone.
              </p>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.buttonDanger}
                  onClick={performDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2800} theme="colored" />
    </>
  );
}