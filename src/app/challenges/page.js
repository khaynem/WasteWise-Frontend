"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./challenges.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../lib/axios";
import { requireAuth } from "../../lib/auth";

export default function ChallengesPage() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selected, setSelected] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const [submissionImage, setSubmissionImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submissionText, setSubmissionText] = useState("");
    const [isMobile, setIsMobile] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [userRanking, setUserRanking] = useState({ points: 0, rank: "Bronze", placement: null });
    
    const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
    const [tierToUnlock, setTierToUnlock] = useState(null);
    const [isUnlocking, setIsUnlocking] = useState(false);

    const router = useRouter();

    // Auth check
    useEffect(() => {
        const checkAuthentication = async () => {
            const user = await requireAuth(router, '/home');
            if (!user) toast.error("Please sign in to continue.");
        };
        checkAuthentication();
    }, [router]);

    // Load challenges from backend
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await api.get("/api/user/challenges", {
                    withCredentials: true,
                });
                const data = res.data;
                const items = (Array.isArray(data) ? data : []).map((c) => ({
                    id: c._id || c.id,
                    title: c.title,
                    description: c.description,
                    instructions: c.instructions,
                    points: Number(c.points) || 0,
                    tier: c.tier || 'Basic',
                    completed: !!c.completed,
                    unlocked: !!c.unlocked,
                    submissionStatus: c.submissionStatus || null,
                    short:
                        (c.description || "").length > 110
                            ? `${c.description.slice(0, 110)}…`
                            : c.description || "",
                    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
                }));
                setChallenges(items);
                setError("");
            } catch (e) {
                setError("Failed to fetch challenges. Please try again.");
                toast.error("Failed to load challenges.");
            } finally {
                setLoading(false);
            }
        };
        load();

        // Poll for updates every 30 seconds to check for approved submissions
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch user's current ranking on mount
    useEffect(() => {
        const fetchUserRanking = async () => {
            try {
                const res = await api.get("/api/user/leaderboard", {
                    withCredentials: true,
                });
                const data = res.data;

                const up = data?.userPlacement;
                setUserRanking({
                    points: up?.points || 0,
                    rank: up?.rank || "Bronze",
                    placement: up?.placement || null,
                });
            } catch (e) {
                console.warn("Ranking fetch skipped:", e.message);
            }
        };
        fetchUserRanking();

        // Poll for ranking updates every 30 seconds (matches challenge polling)
        const interval = setInterval(fetchUserRanking, 30000);
        return () => clearInterval(interval);
    }, []);

    // Responsive flag
    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 768);
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Preview for submission image
    useEffect(() => {
        if (!submissionImage) {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
            return;
        }
        const url = URL.createObjectURL(submissionImage);
        setImagePreview(url);
        return () => URL.revokeObjectURL(url);
    }, [submissionImage]); // eslint-disable-line react-hooks/exhaustive-deps

    const openChallenge = (c) => {
        setSelected(c);
        setModalOpen(true);
        setSubmissionImage(null);
        setSubmissionText("");
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (file) setSubmissionImage(file);
    };

    const openUnlockConfirm = (tier) => {
        setTierToUnlock(tier);
        setUnlockConfirmOpen(true);
    };

    const handleUnlockTier = async () => {
        if (!tierToUnlock) return;
        
        try {
            setIsUnlocking(true);
            const res = await api.post(`/api/user/challenges/tier/${tierToUnlock}/unlock`, {}, { withCredentials: true });
            toast.success(`${tierToUnlock} tier unlocked!`);
            setChallenges(prev => prev.map(c => 
                c.tier === tierToUnlock ? { ...c, unlocked: true } : c
            ));
            setUserRanking(prev => ({ ...prev, points: res.data.newPoints }));
            setUnlockConfirmOpen(false);
            setTierToUnlock(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to unlock tier.');
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected) return;
        if (selected.submissionStatus) {
            toast.info("You have already submitted this challenge.");
            return;
        }
        if (!submissionImage) {
            toast.error("Image proof required.");
            return;
        }
        if (!submissionText.trim()) {
            toast.error("Description required.");
            return;
        }

        try {
            setIsSubmitting(true);
            const form = new FormData();
            form.append("image", submissionImage);
            form.append("description", submissionText.trim());

            const res = await api.post(
                `/api/user/challenges/submit/${selected.id}`,
                form,
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                }
            );

            setChallenges(prev => prev.map(c => 
                c.id === selected.id ? { ...c, submissionStatus: 'Pending' } : c
            ));
            setSelected(prev => prev ? { ...prev, submissionStatus: 'Pending' } : null);

            toast.success('Submission received! Awaiting admin approval.');
            setModalOpen(false);
            setSubmissionImage(null);
            setImagePreview(null);
            setSubmissionText("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit entry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <h1 className={styles.pageLabel}>Challenges</h1>
                <p className={styles.pageDesc}>
                    Explore sustainability challenges and submit your progress
                </p>
            </header>

            <section className={styles.section}>
                <div className={styles.userRankingBadge}>
                    <i className="fas fa-leaf" aria-hidden="true" /> {userRanking.points} pts
                    <span className={styles.rankPill} data-tier={userRanking.rank}>
                        {userRanking.rank}
                    </span>
                </div>

                {loading ? (
                    <div className={styles.pageDesc}>Loading challenges...</div>
                ) : error ? (
                    <div className={styles.pageDesc} style={{ color: "#ef4444" }}>
                        {error}
                    </div>
                ) : challenges.length === 0 ? (
                    <div className={styles.pageDesc}>No challenges available.</div>
                ) : (
                    <>
                        {['Basic', 'Intermediate', 'Advanced'].map(tier => {
                            const tierChallenges = challenges.filter(c => c.tier === tier);
                            if (tierChallenges.length === 0) return null;

                            const tierUnlocked = tier === 'Basic' || tierChallenges.some(c => c.unlocked);
                            const tierUnlockCost = tier === 'Intermediate' ? 100 : tier === 'Advanced' ? 250 : 0;

                            return (
                                <div key={tier} className={styles.tierSection}>
                                    <h2 className={`${styles.tierTitle} ${styles[`tier${tier}Title`]}`}>
                                        {tier === 'Basic' && <i className="fas fa-seedling" aria-hidden="true" />}
                                        {tier === 'Intermediate' && <i className="fas fa-leaf" aria-hidden="true" />}
                                        {tier === 'Advanced' && <i className="fas fa-trophy" aria-hidden="true" />}
                                        {tier} Challenges
                                    </h2>

                                    <div className={`${styles.tierContainer} ${!tierUnlocked ? styles.tierContainerLocked : ''}`}>
                                        {!tierUnlocked && (
                                            <div className={styles.unlockOverlay}>
                                                <div className={styles.unlockOverlayContent}>
                                                    <i className="fas fa-lock" aria-hidden="true" />
                                                    <h3>Locked Tier</h3>
                                                    <p>Unlock to access {tierChallenges.length} challenge{tierChallenges.length !== 1 ? 's' : ''}</p>
                                                    <button
                                                        className={styles.unlockTierBtn}
                                                        onClick={() => openUnlockConfirm(tier)}
                                                    >
                                                        <i className="fas fa-unlock-alt" aria-hidden="true" /> Unlock Tier ({tierUnlockCost} pts)
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.challengeGrid}>
                                            {tierChallenges.map((c) => (
                                                <div 
                                                    key={c.id} 
                                                    className={`${styles.challengeCard} ${c.submissionStatus === 'Approved' ? styles.challengeCardCompleted : ''}`}
                                                >
                                                    {c.submissionStatus && (
                                                        <div className={c.submissionStatus === 'Approved' ? styles.approvedBadge : styles.pendingBadge}>
                                                            <i className="fas fa-check-circle" aria-hidden="true" /> {c.submissionStatus === 'Approved' ? 'Completed' : 'Pending'}
                                                        </div>
                                                    )}
                                                    <h3 className={styles.cardTitle}>{c.title}</h3>
                                                    <div className={styles.cardPartition} aria-hidden="true" />
                                                    <p className={styles.cardDesc}>{c.short}</p>
                                                    <div className={styles.cardBottom}>
                                                        <span className={styles.pointsBadge}>
                                                            <i className="fas fa-leaf" aria-hidden="true" />{" "}
                                                            {c.points} pts
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className={styles.viewBtn}
                                                            onClick={() => openChallenge(c)}
                                                            aria-label={`View ${c.title} challenge`}
                                                        >
                                                            {c.submissionStatus === 'Approved' ? "View Details" : "View Challenge"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </section>

            {modalOpen && selected && (
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setModalOpen(false);
                    }}
                >
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <span>{selected.title}</span>
                            <button
                                type="button"
                                className={styles.modalClose}
                                onClick={() => setModalOpen(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.modalLeft}>
                                <h2 className={styles.detailTitle}>{selected.title}</h2>
                                <p className={styles.detailDesc}>{selected.description}</p>

                                <div className={styles.rulesBlock}>
                                    <div className={styles.rulesHeader}>Instructions</div>
                                    <ul className={styles.rulesList}>
                                        {(String(selected.instructions || "")
                                            .split(/\r?\n/)
                                            .map((l) => l.replace(/^[•\-\u2022]\s*/, "").trim())
                                            .filter(Boolean) || []
                                        ).map((r, i) => (
                                            <li key={i} className={styles.ruleItem}>
                                                <i className="fas fa-check-circle" aria-hidden="true" />{" "}
                                                {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className={styles.pointsBlock}>
                                    <span className={styles.pointsLarge}>
                                        <i className="fas fa-leaf" aria-hidden="true" />{" "}
                                        {selected.points} Points
                                    </span>
                                </div>

                            </div>

                            <div className={styles.modalRight}>
                                {selected.submissionStatus ? (
                                    <div className={selected.submissionStatus === 'Approved' ? styles.approvedMessage : styles.pendingMessage}>
                                        <i className="fas fa-check-circle" aria-hidden="true" />
                                        <h3>{selected.submissionStatus === 'Approved' ? 'Challenge Completed!' : 'Submission Received!'}</h3>
                                        <p>{selected.submissionStatus === 'Approved' ? `You've earned ${selected.points} points from this challenge!` : 'Your submission is pending review. Points will be awarded once approved.'}</p>
                                    </div>
                                ) : (
                                    <form className={styles.submitForm} onSubmit={handleSubmit}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel} htmlFor="image">
                                                Proof Image
                                            </label>
                                            <div className={styles.imageInputWrap}>
                                                <label className={styles.uploadBtn}>
                                                    <i className="fas fa-image" aria-hidden="true" />
                                                    {submissionImage ? "Change Image" : "Add Image"}
                                                    <input
                                                        id="image"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFile}
                                                        className={styles.fileInput}
                                                    />
                                                </label>
                                                {imagePreview && (
                                                    <div className={styles.previewWrap}>
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className={styles.previewImg}
                                                        />
                                                        <button
                                                            type="button"
                                                            className={styles.previewRemove}
                                                            onClick={() => {
                                                                setSubmissionImage(null);
                                                                setImagePreview(null);
                                                            }}
                                                        >
                                                            <i className="fas fa-times" aria-hidden="true" />{" "}
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel} htmlFor="desc">
                                                Description
                                            </label>
                                            <textarea
                                                id="desc"
                                                className={styles.textArea}
                                                rows={isMobile ? 5 : 7}
                                                value={submissionText}
                                                onChange={(e) => setSubmissionText(e.target.value)}
                                                placeholder="Describe your effort or process..."
                                            />
                                        </div>

                                        <div className={styles.formActions}>
                                            <button
                                                type="submit"
                                                className={styles.submitBtn}
                                                disabled={isSubmitting}
                                            >
                                                <i className="fas fa-paper-plane" aria-hidden="true" />{" "}
                                                {isSubmitting ? "Submitting..." : "Submit Entry"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {unlockConfirmOpen && tierToUnlock && (
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => e.target === e.currentTarget && !isUnlocking && setUnlockConfirmOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="unlockTitle"
                >
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <div id="unlockTitle" className={styles.modalTitle}>Unlock {tierToUnlock} Tier</div>
                            <button
                                type="button"
                                className={styles.ghostBtn}
                                onClick={() => !isUnlocking && setUnlockConfirmOpen(false)}
                                disabled={isUnlocking}
                            >
                                <i className="fas fa-times" aria-hidden="true" /> Close
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.confirmText}>
                                This will cost you <strong>{tierToUnlock === 'Intermediate' ? 100 : 250} points</strong> and unlock all challenges in the {tierToUnlock} tier.
                            </p>
                            <p className={styles.confirmText}>
                                Your current balance: <strong>{userRanking.points} points</strong>
                            </p>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.buttonPrimary}
                                onClick={handleUnlockTier}
                                disabled={isUnlocking}
                            >
                                {isUnlocking ? 'Unlocking...' : 'Unlock'}
                            </button>
                            <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={() => setUnlockConfirmOpen(false)}
                                disabled={isUnlocking}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}            <ToastContainer
                position="top-right"
                autoClose={2500}
                theme="colored"
                style={{ top: isMobile ? 68 : 8 }}
            />
        </main>
    );
}
