"use client";

import { useState, useEffect, useMemo } from "react";
import api, { withToast } from "../../../lib/axios";
import { requireAuth } from "../../../lib/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./community.module.css";

const CATEGORIES = ["Furniture", "Decor", "Accessories", "Clothing", "Tools", "Other"];
const BARANGAYS = [
  "West Bajac-Bajac",
  "New Kababae",
  "New Ilalim",
  "West Tapinac",
  "New Banicain",
  "Barretto",
  "Kalaklan",
  "East Bajac-Bajac",
  "East Tapinac",
  "Kalalake",
  "New Asinan",
  "Pag-asa",
  "Mabayuan",
  "Sta. Rita",
  "Gordon Heights",
  "Old Cabalan",
  "New Cabalan",
];

// Map server listing to UI model (include owner id)
function mapServerListing(l) {
  return {
    id: l._id || l.id,
    ownerId: (l.user || l.seller) ? String(l.user || l.seller) : null,
    name: l.title,
    description: l.description,
    price: Number(l.price) || 0,
    category: l.category,
    contactNumber: l.contactNumber || "",
    barangay: l.location || "",
    userName: l.sellerName || l.ownerName || "User",
    image: Array.isArray(l.imageLinks) && l.imageLinks.length ? l.imageLinks[0] : null,
    likes: 0,
    liked: false,
    comments: [],
    commentsCount: Number(l.commentsCount || l.commentCount || 0), // ADDED: server-provided count (fallback 0)
    createdAt: l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
  };
}

function dataURLtoFile(dataUrl, filename = "image.png") {
  try {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

function mapServerComment(c) {
  return {
    id: c._id || `${c.listingId}-${c.createdAt}`,
    text: c.comment,
    userName: c.authorName || c.commenterName || "User",
    date: c.createdAt || new Date().toISOString(),
    authorId: c.author ? String(c.author) : null, // ADDED for delete permission
  };
}

export default function CommunityPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [listings, setListings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [contactNumber, setContactNumber] = useState("");
  const [barangay, setBarangay] = useState(BARANGAYS[0]);
  const [userName, setUserName] = useState("");
  const [image, setImage] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [commentNames, setCommentNames] = useState({});
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000); // Changed from 100 to 1000
  const [datePosted, setDatePosted] = useState("any");
  const [filterBarangay, setFilterBarangay] = useState("All");
  const [viewOwner, setViewOwner] = useState("all");

  const [draftCategory, setDraftCategory] = useState("All");
  const [draftBarangay, setDraftBarangay] = useState("All");
  const [draftPriceMax, setDraftPriceMax] = useState(1000);  
  const [draftDatePosted, setDraftDatePosted] = useState("any");

  const [authUserId, setAuthUserId] = useState(null);

  // Delete confirm modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState(null);
  const [imageModalAlt, setImageModalAlt] = useState("");

  const openImageModal = (src, alt) => {
    setImageModalSrc(src);
    setImageModalAlt(alt || "Listing image");
    setImageModalOpen(true);
  };
  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalSrc(null);
    setImageModalAlt("");
  };

  const [loadingComments, setLoadingComments] = useState(new Set());
  const [loadedComments, setLoadedComments] = useState(new Set()); // track which listings already fetched
  const [commentCountsLoaded, setCommentCountsLoaded] = useState(false); // NEW

  useEffect(() => {
    const checkAuthentication = async () => {
      const user = await requireAuth(router, '/home');
      if (!user) toast.error("Please sign in to continue.");
      else if (user.id || user._id) setAuthUserId(user.id || user._id);
    };
    checkAuthentication();
  }, [router]);

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await api.get("/api/listings", {
          withCredentials: true
        });
        
        console.log("Fetched listings:", res.data);
        console.log("Number of listings:", res.data.length); // ADD THIS
        const data = res.data;
        const mapped = Array.isArray(data) ? data.map(mapServerListing) : [];
        console.log("Mapped listings:", mapped); // ADD THIS
        console.log("Mapped IDs:", mapped.map(l => l.id)); // ADD THIS - Check for duplicates
        setListings(mapped);
      } catch (err) {
        console.error("Failed to load listings:", err);
      }
    };

    fetchListings();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("marketListings", JSON.stringify(listings));
    } catch {}
  }, [listings]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCategory(CATEGORIES[0]);
    setContactNumber("");
    setBarangay(BARANGAYS[0]);
    setUserName("");
    setImage(null);
    setEditingId(null);
  };

  // Create or update listing
  const handleSubmit = async (e) => {
    e.preventDefault();
    const p = Number(price);
    if (!name || !description || Number.isNaN(p) || p < 0 || !category || !contactNumber) return;

    // Editing existing listing
    if (editingId) {
      try {
        const form = new FormData();
        form.append("title", name);
        form.append("price", String(p));
        form.append("category", category);
        form.append("contactNumber", contactNumber);
        form.append("location", barangay);
        form.append("description", description);

        // Only append image if user changed/has one
        if (image && image.startsWith("data:image")) {
          const file = dataURLtoFile(image, `listing-${editingId}.png`);
          if (file) form.append("images", file);
        }

        const res = await withToast(
          () =>
            api.patch(`/api/listings/${editingId}`, form, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              withCredentials: true,
            }),
          {
            pending: "Updating listing...",
            success: "Listing updated",
            error: "Update failed",
          }
        );

        const updated = mapServerListing(res.data);
        setListings((prev) => prev.map((it) => (it.id === editingId ? { ...it, ...updated } : it)));
        setShowModal(false);
        resetForm();
      } catch (err) {
        console.error("Failed to update listing:", err);
      }
      return;
    }

    // Creating new listing
    try {
      const form = new FormData();
      form.append("title", name);
      form.append("price", String(p));
      form.append("category", category);
      form.append("contactNumber", contactNumber);
      form.append("location", barangay);
      form.append("description", description);
      if (image && image.startsWith("data:image")) {
        const file = dataURLtoFile(image, "new-listing.png");
        if (file) form.append("images", file);
      }

      const res = await withToast(
        () =>
          api.post("/api/listings", form, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          }),
        {
          pending: "Creating listing...",
            success: "Listing created successfully",
            error: "Failed to create listing",
        }
      );

      const created = mapServerListing(res.data);
      setListings((prev) => [created, ...prev]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create listing:", err);
    }
  };

  // Fetch listing by ID and open edit modal
  const handleEdit = async (it) => {
    try {
      const res = await api.get(`/api/listings/${it.id}`, {
        withCredentials: true
      });

      const l = mapServerListing(res.data);
      setEditingId(l.id);
      setName(l.name);
      setDescription(l.description);
      setPrice(String(l.price));
      setCategory(l.category);
      setContactNumber(l.contactNumber || "");
      setBarangay(l.barangay || BARANGAYS[0]);
      setUserName(l.userName || "");
      setImage(l.image || null);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch listing:", err);
      // Fallback to existing data if fetch fails
      setEditingId(it.id);
      setName(it.name);
      setDescription(it.description);
      setPrice(String(it.price));
      setCategory(it.category);
      setContactNumber(it.contactNumber || "");
      setBarangay(it.barangay || BARANGAYS[0]);
      setUserName(it.userName || "");
      setImage(it.image || null);
      setShowModal(true);
    }
  };

  const handleDelete = async (id) => {
    try {
      await withToast(
        () =>
          api.delete(`/api/listings/${id}`, {
            withCredentials: true,
          }),
        {
          pending: "Deleting listing...",
          success: "Listing deleted",
          error: "Failed to delete listing",
        }
      );
      setListings((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  const askDelete = (item) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await handleDelete(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // toast already shown in handleDelete
    } finally {
      setDeleting(false);
    }
  };

  // Prefetch like metrics for all listings after they load
  useEffect(() => {
    if (listings.length === 0) return;

    const loadLikeMetrics = async () => {
      try {
        const ids = listings.map((l) => l.id).join(",");
        const res = await api.get(`/api/listings/metrics?ids=${encodeURIComponent(ids)}`, {
          withCredentials: true
        });
        const map = res.data || {};
        setListings((prev) =>
          prev.map((l) => {
            const m = map[l.id];
            return m ? { ...l, likes: Number(m.favorites) || 0, liked: !!m.liked } : l;
          })
        );
      } catch (e) {
        console.error("Failed to load like metrics:", e);
      }
    };
    loadLikeMetrics();
  }, [listings.length]);

  // Toggle like via server
  const handleLike = async (id) => {
    try {
      const res = await withToast(
        () =>
          api.post(
            `/api/listings/${id}/like`,
            {},
            { withCredentials: true }
          ),
        { pending: "Liking...", success: "Liked", error: "Failed to like" }
      );
      const { favorites, liked } = res.data || {};
      setListings((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, likes: Number(favorites) || 0, liked: !!liked } : x
        )
      );
    } catch (e) {
      console.error("Like toggle failed:", e);
    }
  };

  const toggleComments = (id) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (!loadedComments.has(id)) fetchComments(id);
      }
      return next;
    });
  };
  const handleCommentDraft = (id, text) => {
    setCommentDrafts((d) => ({ ...d, [id]: text }));
  };
  const handleAddComment = async (listingId) => {
    const text = (commentDrafts[listingId] || "").trim();
    if (!text) return;
    try {
      const res = await withToast(
        () =>
          api.post(
            `/api/listings/comment/${listingId}`,
            { comment: text },
            { withCredentials: true }
          ),
        {
          pending: "Posting comment...",
          success: "Comment added",
          error: "Failed to add comment",
        }
      );
      const newC = mapServerComment(res.data);
      setListings((prev) =>
        prev.map((x) =>
          x.id === listingId
            ? {
                ...x,
                comments: [...x.comments, newC],
                commentsCount:
                  (typeof x.commentsCount === "number"
                    ? x.commentsCount
                    : x.comments.length) + 1,
              }
            : x
        )
      );
      setCommentDrafts((d) => ({ ...d, [listingId]: "" }));
      setOpenComments((s) => new Set(s).add(listingId));
      setLoadedComments((s) => new Set(s).add(listingId));
    } catch (e) {
      console.error("Add comment error:", e);
    }
  };

  const handleDeleteComment = async (listingId, commentId) => {
    try {
      await withToast(
        () =>
          api.delete(`/api/listings/comment/${commentId}`, {
            withCredentials: true,
          }),
        {
          pending: "Deleting comment...",
          success: "Comment deleted",
          error: "Failed to delete comment",
        }
      );
      setListings(prev =>
        prev.map(l =>
          l.id === listingId
            ? {
                ...l,
                comments: l.comments.filter(c => c.id !== commentId),
                commentsCount: Math.max(
                  0,
                  (typeof l.commentsCount === "number" ? l.commentsCount : l.comments.length) - 1
                ),
              }
            : l
        )
      );
    } catch (e) {
      console.error("Delete comment error:", e);
    }
  };

  const formatCurrency = (n) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
  const isHttp = (v) => /^https?:\/\//i.test(v);
  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setCategory(CATEGORIES[0]);
    setContactNumber("");
    setBarangay(BARANGAYS[0]);
    setUserName("");
    setImage(null);
    setShowModal(true);
  };

  const applyFilters = () => {
    setActiveCategory(draftCategory);
    setFilterBarangay(draftBarangay);
    setPriceMax(draftPriceMax);
    setDatePosted(draftDatePosted);
  };

  const handleClearFilters = () => {
    setDraftCategory("All");
    setDraftBarangay("All");
    setDraftPriceMax(1000);
    setDraftDatePosted("any");
    setActiveCategory("All");
    setFilterBarangay("All");
    setPriceMax(1000);
    setDatePosted("any");
  };

  const filteredListings = useMemo(() => {
    let arr = [...listings];
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.description.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== "All") arr = arr.filter((x) => x.category === activeCategory);
    if (filterBarangay !== "All") arr = arr.filter((x) => (x.barangay || "") === filterBarangay);
    arr = arr.filter((x) => x.price >= priceMin && (priceMax >= 1000 ? true : x.price <= priceMax));
    if (datePosted !== "any") {
      const now = Date.now();
      const oneDay = 86400000;
      let since = 0;
      if (datePosted === "today") since = now - oneDay;
      if (datePosted === "week") since = now - 7 * oneDay;
      if (datePosted === "month") since = now - 30 * oneDay;
      if (since) arr = arr.filter((x) => x.createdAt >= since);
    }

    if (viewOwner === "own" && authUserId) {
      arr = arr.filter((x) => x.ownerId && x.ownerId === authUserId);
    }

    if (sortBy === "likes") arr.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
    else if (sortBy === "price-asc") arr.sort((a, b) => a.price - b.price || b.createdAt - a.createdAt);
    else if (sortBy === "price-desc") arr.sort((a, b) => b.price - a.price || b.createdAt - a.createdAt);
    else arr.sort((a, b) => b.createdAt - a.createdAt);
    return arr;
  }, [
    listings,
    activeCategory,
    filterBarangay,
    priceMax,
    datePosted,
    search,
    sortBy,
    priceMin,
    viewOwner,          
    authUserId           
  ]);

  const trends = useMemo(() => {
    const map = new Map();
    listings.forEach((x) => map.set(x.category, (map.get(x.category) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [listings]);

  const getInitials = (s) =>
    (s || "User")
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  // Show Filters button whenever the left rail is hidden by CSS (<= 1024px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1024px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // After listings are first loaded, fetch counts (without waiting for user toggle)
  useEffect(() => {
    if (!listings.length || commentCountsLoaded) return;

    const loadCounts = async () => {
      try {
        // Limit concurrency if many listings
        const ids = listings.map(l => l.id);
        const results = [];
        const chunkSize = 5;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const slice = ids.slice(i, i + chunkSize);
            const batch = await Promise.all(
              slice.map(async (id) => {
                try {
                  const res = await api.get(`/api/listings/comment/${id}`, {
                    withCredentials: true,
                  });
                  const arr = Array.isArray(res.data) ? res.data : [];
                  return { id, count: arr.length };
                } catch {
                  return { id, count: 0 };
                }
              })
            );
          results.push(...batch);
        }
        const map = new Map(results.map(r => [r.id, r.count]));
        setListings(prev =>
          prev.map(l => ({
            ...l,
            commentsCount: map.has(l.id) ? map.get(l.id) : (typeof l.commentsCount === "number" ? l.commentsCount : 0),
          }))
        );
        setCommentCountsLoaded(true);
      } catch (e) {
        console.error("Failed to prefetch comment counts:", e);
      }
    };

    loadCounts();
  }, [listings, commentCountsLoaded]);

  // fetchComments (unchanged except ensures commentsCount stays accurate)
  const fetchComments = async (listingId) => {
    if (!listingId) return;
    setLoadingComments(s => new Set(s).add(listingId));
    try {
      const res = await api.get(`/api/listings/comment/${listingId}`, {
        withCredentials: true,
      });
      const arr = Array.isArray(res.data) ? res.data.map(mapServerComment) : [];
      setListings(prev =>
        prev.map(x =>
          x.id === listingId
            ? { ...x, comments: arr, commentsCount: arr.length }
            : x
        )
      );
      setLoadedComments(s => new Set(s).add(listingId));
    } catch (e) {
      console.error("Failed to load comments:", e);
    } finally {
      setLoadingComments(s => {
        const next = new Set(s);
        next.delete(listingId);
        return next;
      });
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.pageLabel}>Community</h1>
        <p className={styles.pageDesc}>Buy, sell, and share upcycled goods</p>
      </header>
      <div className={styles.container}>
        <aside className={styles.leftRail}>
          <div className={styles.railCard}>
            <div className={styles.railTitle}>Filters</div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="category">Category</label>
              <div className={styles.selectWrap}>
                <select
                  id="category"
                  className={styles.select}
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filterBarangay">Location</label>
              <div className={styles.selectWrap}>
                <select
                  id="filterBarangay"
                  className={styles.select}
                  value={draftBarangay}
                  onChange={(e) => setDraftBarangay(e.target.value)}
                >
                  <option value="All">All</option>
                  {BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Price Range</label>
              <div className={styles.rangeValues}>
                <span>₱0</span>
                <span>₱{draftPriceMax >= 1000 ? "1,000+" : draftPriceMax}</span>
              </div>
              <input
                className={styles.range}
                type="range"
                min={0}
                max={1000}
                step={50}
                value={draftPriceMax}
                onChange={(e) => setDraftPriceMax(Number(e.target.value))}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="datePosted">Date Posted</label>
              <div className={styles.selectWrap}>
                <select
                  id="datePosted"
                  className={styles.select}
                  value={draftDatePosted}
                  onChange={(e) => setDraftDatePosted(e.target.value)}
                >
                  <option value="any">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>
            </div>
            <div className={styles.filterActions}>
              <button type="button" className={styles.buttonPrimary} onClick={applyFilters}>
                Apply Filters
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          </div>

          <div className={`${styles.railCard} ${styles.trendingCard}`}>
            <div className={styles.railTitle}>Trending Categories</div>
            <ul className={styles.trendList}>
              {trends.length === 0 && <li className={styles.trendEmpty}>No trends yet</li>}
              {trends.length > 0 &&
                trends.map(([cat, count]) => (
                  <li key={cat} className={styles.trendItem}>
                    <span>{cat}</span>
                    <span className={styles.trendCount}>{count}</span>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        <section className={styles.centerColumn}>
          <div className={styles.actionsRow} style={{ justifyContent: "flex-start" }}>
            <button type="button" className={styles.buttonPrimary} onClick={openCreateModal}>
              <i className="fas fa-plus" aria-hidden="true" />
              <strong>Create New Listing</strong>
            </button>
            {isMobile && (
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setShowFilterModal(true)}
              >
                <i className="fas fa-sliders-h" aria-hidden="true" />
                Filters
              </button>
            )}
          </div>

          {showModal && (
            <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={editingId ? "Edit listing" : "Create listing"}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>{editingId ? "Edit your listing" : "Create a new listing"}</div>
                  <button type="button" className={styles.ghostBtn} onClick={() => setShowModal(false)}>
                    <i className="fas fa-times" aria-hidden="true" /> Close
                  </button>
                </div>
                <form className={styles.modalBody} onSubmit={handleSubmit}>
                  <div className={styles.composerRow}>
                    <div className={styles.formField}>
                      <label className={styles.inputLabel} htmlFor="productName">Product name</label>
                      <input id="productName" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.inputLabel} htmlFor="priceInput">Price</label>
                      <input id="priceInput" className={styles.input} type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.inputLabel} htmlFor="categorySelect">Category</label>
                      <div className={styles.selectWrap}>
                        <select id="categorySelect" className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                          {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className={styles.composerRow}>
                    <div className={styles.formField}>
                      <label className={styles.inputLabel} htmlFor="contactNumber">Contact Information</label>
                      <input id="contactNumber" className={styles.input} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.inputLabel} htmlFor="barangaySelect">Barangay</label>
                      <div className={styles.selectWrap}>
                        <select id="barangaySelect" className={`${styles.select} ${styles.barangaySelect}`} value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                          {BARANGAYS.map((b) => (<option key={b} value={b}>{b}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.inputLabel} htmlFor="description">Description</label>
                    <textarea id="description" className={styles.textarea} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                   <div className={styles.mediaRow}>
                    <label className={styles.uploadBtn}>
                       <i className="fas fa-image" aria-hidden="true" />
                       Add Image
                       <input type="file" accept="image/*" onChange={handleImageChange} className={styles.fileInput} />
                     </label>
                     {image && (
                       <div className={styles.previewWrap}>
                         <img src={image} alt="Preview" className={styles.previewImg} />
                         <button type="button" className={styles.previewRemove} onClick={() => setImage(null)}>
                           <i className="fas fa-times" aria-hidden="true" /> Remove
                         </button>
                       </div>
                     )}
                   </div>
                  <div className={styles.modalActions}>
                    <button type="submit" className={styles.buttonPrimary}>
                      <i className="fas fa-paper-plane" aria-hidden="true" />
                      {editingId ? "Save" : "Post"}
                    </button>
                    <button type="button" className={styles.buttonSecondary} onClick={() => setShowModal(false)}>
                      <i className="fas fa-times" aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isMobile && showFilterModal && (
            <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Filters">
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>Filters</div>
                  <button type="button" className={styles.ghostBtn} onClick={() => setShowFilterModal(false)}>
                    <i className="fas fa-times" aria-hidden="true" /> Close
                  </button>
                </div>
                <div className={styles.modalBody}>
                  {/* same inputs but bound to draft* */}
                  {/* Category */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="m-category">Category</label>
                    <div className={styles.selectWrap}>
                      <select
                        id="m-category"
                        className={styles.select}
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                      >
                        <option value="All">All</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Location */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="m-filterBarangay">Location</label>
                    <div className={styles.selectWrap}>
                      <select
                        id="m-filterBarangay"
                        className={styles.select}
                        value={draftBarangay}
                        onChange={(e) => setDraftBarangay(e.target.value)}
                      >
                        <option value="All">All</option>
                        {BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Price */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Price Range</label>
                    <div className={styles.rangeValues}>
                      <span>₱0</span>
                      <span>₱{draftPriceMax >= 1000 ? "1,000+" : draftPriceMax}</span>
                    </div>
                    <input
                      className={styles.range}
                      type="range"
                      min={0}
                      max={1000}
                      step={50}
                      value={draftPriceMax}
                      onChange={(e) => setDraftPriceMax(Number(e.target.value))}
                    />
                  </div>
                  {/* Date Posted */}
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="m-datePosted">Date Posted</label>
                    <div className={styles.selectWrap}>
                      <select
                        id="m-datePosted"
                        className={styles.select}
                        value={draftDatePosted}
                        onChange={(e) => setDraftDatePosted(e.target.value)}
                      >
                        <option value="any">Any time</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.buttonPrimary}
                    onClick={() => {
                      applyFilters();
                      setShowFilterModal(false);
                    }}
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => {
                      handleClearFilters();
                      setShowFilterModal(false);
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {deleteOpen && deleteTarget && (
            <div
              className={styles.modalOverlay}
              onClick={(e) => e.target === e.currentTarget && !deleting && setDeleteOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="deleteTitle"
            >
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <div id="deleteTitle" className={styles.modalTitle}>Delete Listing</div>
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    onClick={() => !deleting && setDeleteOpen(false)}
                    disabled={deleting}
                  >
                    <i className="fas fa-times" aria-hidden="true" /> Close
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <p className={styles.confirmText}>
                    Are you sure you want to delete "<strong>{deleteTarget.name}</strong>"?
                    This action cannot be undone.
                  </p>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.buttonDanger}
                    onClick={confirmDelete}
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
          )}

          <div className={styles.feedContainer}>
            <div className={styles.feedToolbar}>
              <div className={styles.feedTitle}>Community Listings</div>
              <div className={styles.toolbarRight}>
                <span className={styles.sortLabel}>Sort</span>
                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="new">Newest</option>
                  <option value="likes">Most Liked</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>

                {/* View filter (All Listings / Own Listings) */}
                <span className={styles.sortLabel}>View</span>
                <select
                  className={styles.sortSelect}
                  value={viewOwner}
                  onChange={(e) => setViewOwner(e.target.value)}
                >
                  <option value="all">All Listings</option>
                  <option value="own">Own Listings</option>
                </select>
              </div>
            </div>
            <ul className={styles.feed}>
              {filteredListings.map((it) => (
                <li key={it.id} className={styles.post}>
                  <div className={styles.postHeader}>
                    <div className={styles.postMeta}>
                      <div className={styles.userRow}>
                        <div className={styles.avatar}>
                          <i className="fas fa-user" aria-hidden="true" />
                        </div>
                        <span className={styles.postUser}>{it.userName || "User"}</span>
                      </div>
                      <div className={styles.postTitle}>
                        {it.name}
                        <span className={styles.price}>{formatCurrency(it.price)}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={styles.categoryPill}>{it.category}</span>
                        {it.barangay && <span className={styles.categoryPill}>{it.barangay}</span>}
                        <span className={styles.dateText}>
                          <i className="far fa-clock" aria-hidden="true" /> {new Date(it.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {it.ownerId && authUserId && it.ownerId === authUserId && (
                      <div className={styles.actionRight}>
                        <button type="button" className={styles.ghostBtn} onClick={() => handleEdit(it)}>
                          <i className="fas fa-edit" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => askDelete(it)}
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.postBody}>
                    <p className={styles.postDesc}>{it.description}</p>
                    {it.contactNumber && (
                      <div className={styles.postContact}>
                        <i className="fas fa-phone" aria-hidden="true" />
                        {isHttp(it.contactNumber) ? (
                          <a
                            href={it.contactNumber}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.link}
                          >
                            {it.contactNumber}
                          </a>
                        ) : (
                          <span className={styles.linkText}>{it.contactNumber}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {it.image && (
                    <div
                      className={styles.postMedia}
                      role="button"
                      tabIndex={0}
                      onClick={() => openImageModal(it.image, it.name)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openImageModal(it.image, it.name)}
                      aria-label={`View image for ${it.name}`}
                    >
                      <img src={it.image} alt={it.name} className={styles.postImage} />
                    </div>
                  )}

                  <div className={styles.postActions}>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${it.liked ? styles.liked : ""}`}
                      onClick={() => handleLike(it.id)}
                    >
                      <i className="fas fa-heart" aria-hidden="true" />
                      <span>{it.likes}</span>
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => toggleComments(it.id)}>
                      <i className="fas fa-comment" aria-hidden="true" />
                      <span>{typeof it.commentsCount === "number" ? it.commentsCount : it.comments.length}</span>
                    </button>
                  </div>
                  {openComments.has(it.id) && (
                    <div className={styles.comments}>
                      {loadingComments.has(it.id) && it.comments.length === 0 && (
                        <div className={styles.commentLoading}>Loading comments...</div>
                      )}
                      <ul className={styles.commentList}>
                        {it.comments.map((c) => {
                          const canDelete =
                            (c.authorId && authUserId && c.authorId === authUserId) ||
                            (it.ownerId && authUserId && it.ownerId === authUserId);
                          return (
                            <li key={c.id} className={styles.commentItem}>
                              <div className={styles.commentAvatar}>{getInitials(c.userName)}</div>
                              <div className={styles.commentContent}>
                                <div className={styles.commentTop}>
                                  <span className={styles.commentUser}>{c.userName || "User"}</span>
                                  <span className={styles.commentDate}>{new Date(c.date).toLocaleString()}</span>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      className={styles.commentDeleteBtn}
                                      onClick={() => handleDeleteComment(it.id, c.id)}
                                      aria-label="Delete comment"
                                    >
                                      <i className="fas fa-trash" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                                <div className={styles.commentText}>{c.text}</div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className={styles.commentForm}>
                        <input
                          className={styles.commentInput}
                          value={commentDrafts[it.id] || ""}
                          onChange={(e) => handleCommentDraft(it.id, e.target.value)}
                          placeholder="Write a comment"
                        />
                        <button
                          type="button"
                          className={styles.buttonSmall}
                          onClick={() => handleAddComment(it.id)}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>

      {/* Image view modal */}
      {imageModalOpen && imageModalSrc && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && closeImageModal()}
          role="dialog"
          aria-modal="true"
          aria-label="Listing image view"
        >
          <div className={styles.imageModal}>
            <div className={styles.imageModalHeader}>
              <button
                type="button"
                className={styles.imageModalClose}
                onClick={closeImageModal}
                aria-label="Close image"
              >
                ×
              </button>
            </div>
            <div className={styles.imageModalBody}>
              <img src={imageModalSrc} alt={imageModalAlt} className={styles.imageModalImg} />
              <div className={styles.imageCaption}>{imageModalAlt}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}