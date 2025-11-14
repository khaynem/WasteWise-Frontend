"use client";
import dynamic from "next/dynamic"; //
const MapInput = dynamic(() => import("../components/mapInput"), { ssr: false });

import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../../lib/axios";
import styles from "./reports.module.css";
import { getDeviceLocation } from "../utils/location";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}


export default function ReportsPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locCoord, setLocCoord] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingSave, setEditingSave] = useState(false);

  const [editLocation, setEditLocation] = useState("");
  const [editLocCoord, setEditLocCoord] = useState(null); 
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const imageInputRef = useRef();
  // Add: ensure map mounts after edit UI becomes visible
  const [editMapReady, setEditMapReady] = useState(false);

  const [isDragging, setIsDragging] = useState(false); 

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { setIsDragging(false); handleImageBoxDrop(e); };

  useEffect(() => {
    async function fetchReports() {
      //const authToken = getCookie("authToken");
      try {
        const response = await api.get("/api/user/reports", {
          headers: {
            // 'Authorization': `Bearer ${authToken}`,
          },
        });
        // Sort reports by date, most recent first
        const sortedReports = response.data.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setReports(sortedReports);
      } catch (error) {
        console.log(authToken)
        console.error("Error fetching reports:", error);
      }
    }
    fetchReports();
  }, []);

  useEffect(() => {
    getDeviceLocation().then((coords) => {
      if (!coords) return;
      const { latitude, longitude } = coords;
      const latlng = { lat: latitude, lng: longitude };
      setLocCoord(latlng);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      )
        .then((r) => r.json())
        .then((data) => {
          const addr = data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setLocation(addr);
        })
        .catch(() => {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        });
    });
  }, []);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
    } else {
      setImage(null);
    }
  }

  function handleMapLocationSelect(latlng) {
    setLocCoord(latlng);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`)
      .then((res) => res.json())
      .then((data) => {
        const addr = data?.display_name || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        setLocation(addr);
      })
      .catch(() => {
        setLocation(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      });
  }

  function handleImageBoxClick() {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  }

  function handleImageBoxDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleImageBoxDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleImageBoxDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setImage(file);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    //const authToken = getCookie("authToken");
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("location", location);

      if (locCoord && typeof locCoord.lat === "number" && typeof locCoord.lng === "number") {
        formData.append(
          "locCoords",
          JSON.stringify({
            type: "Point",
            coordinates: [locCoord.lat, locCoord.lng],
          })
        );
      }

      formData.append("date", new Date().toISOString());
      if (image) {
        formData.append("image", image);
      }

      // Await the request and capture the response to avoid ReferenceError
      const response = await api.post("/api/user/report", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          // Authorization: `Bearer ${authToken}`,
        },
      });

      toast.success("Report submitted successfully.");
      setTitle("");
      setDescription("");
      setLocation("");
      setLocCoord(null); 
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      console.log("response.data:", response.data);
      console.log("locCoord:", locCoord);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(report) {
    setEditingId(report._id);
    setEditTitle(report.title || "");
    setEditDescription(report.description || "");

    const coords = report?.locCoords?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      // Fix order: we stored [lat, lng] on create, so read the same way
      setEditLocCoord({ lat: coords[0], lng: coords[1] });
    } else {
      setEditLocCoord(null);
    }
    setEditLocation(report.location || "");

    setEditImagePreview(
      Array.isArray(report.image) ? report.image[0] : (report.imageUrl || report.image || "")
    );
    setEditImageFile(null);

    // Defer map mount so container is laid out
    setEditMapReady(false);
    setTimeout(() => setEditMapReady(true), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditLocation("");
    setEditLocCoord(null);
    setEditImageFile(null);
    setEditImagePreview("");
    setEditMapReady(false);
  }

  function handleEditMapLocationSelect(latlng) {
    setEditLocCoord(latlng);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`
    )
      .then((r) => r.json())
      .then((data) => {
        const addr =
          data?.display_name ||
          `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        setEditLocation(addr);
      })
      .catch(() => {
        setEditLocation(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      });
  }

  function handleEditImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const url = URL.createObjectURL(file);
    setEditImagePreview(url);
  }

  async function saveEdit(reportId) {
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.warn("Title and description are required.");
      return;
    }
    setEditingSave(true);
    try {
      //const authToken = getCookie("authToken");

      const formData = new FormData();
      formData.append("title", editTitle);
      formData.append("description", editDescription);
      formData.append("location", editLocation || "");

      // New: stamp edited date as now
      const editedAtISO = new Date().toISOString();
      formData.append("date", editedAtISO);

      if (
        editLocCoord &&
        typeof editLocCoord.lat === "number" &&
        typeof editLocCoord.lng === "number"
      ) {
        formData.append(
          "locCoords",
          JSON.stringify({
            type: "Point",
            // Keep the same order used on create: [lat, lng]
            coordinates: [editLocCoord.lat, editLocCoord.lng],
          })
        );
      }

      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      // Use PATCH to match backend route and param name :id
      const { data } = await api.patch(`/api/user/report/${reportId}`, formData, {
        headers: {
          // Authorization: `Bearer ${authToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Prefer server response; fallback to local edits and edited date
      const updated = data?.report;
      setReports((prev) => {
        const next = prev.map((r) =>
          r._id === reportId
            ? {
                ...r,
                ...(updated || {}),
                title: updated?.title ?? editTitle,
                description: updated?.description ?? editDescription,
                location: updated?.location ?? editLocation,
                locCoords:
                  updated?.locCoords ??
                  (editLocCoord
                    ? {
                        type: "Point",
                        coordinates: [editLocCoord.lat, editLocCoord.lng],
                      }
                    : r.locCoords),
                image:
                  updated?.image ??
                  (editImageFile ? [editImagePreview] : r.image),
                date: updated?.date ?? editedAtISO, // ensure UI reflects new date
              }
            : r
        );
        // Keep list ordered by most recent
        return next.sort((a, b) => new Date(b.date) - new Date(a.date));
      });

      toast.success("Report updated.");
      cancelEdit();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update report. Please try again."
      );
    } finally {
      setEditingSave(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.pageLabel}>Reports</div>
        <p className={styles.pageDesc}>
          Create a new report or view your previously submitted reports.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.columns}>
          {/* LEFT COLUMN: Create Report */}
          <div className={`${styles.whiteContainer} ${styles.leftContainer}`}>
            <div className={styles.reportCreateLabel}>Create Report</div>
            <form className={styles.createReportForm} onSubmit={handleSubmit}>
              <label
                style={{
                  fontWeight: "bold",
                  color: "#222",
                  marginBottom: "0.4rem",
                  display: "block",
                  fontSize: "1rem",
                }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter report title"
                style={{
                  width: "100%",
                  padding: "0.7rem 1rem",
                  borderRadius: "0.8rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  outline: "none",
                  marginBottom: "1rem",
                  background: "white",
                  color: "#222",
                }}
                required
              />
              <label
                style={{
                  fontWeight: "bold",
                  color: "#222",
                  marginBottom: "0.4rem",
                  display: "block",
                  fontSize: "1rem",
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the illegal dumping activity"
                rows={6}
                spellCheck
                aria-label="Report description"
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "0.8rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  outline: "none",
                  marginBottom: "1rem",
                  background: "white",
                  color: "#222",
                  lineHeight: 1.5,
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                required
              />
              <div style={{ display: "flex", gap: "0.7rem" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontWeight: "bold",
                      color: "#222",
                      marginBottom: "0.4rem",
                      display: "block",
                      fontSize: "1rem",
                    }}
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    placeholder="Mark the area on the map"
                    style={{
                      width: "100%",
                      padding: "0.7rem 1rem",
                      borderRadius: "0.8rem",
                      border: "1px solid #d1d5db",
                      fontSize: "0.95rem",
                      outline: "none",
                      marginBottom: "0.4rem",
                      background: "white",
                      color: "#222",
                    }}
                    required
                    readOnly
                  />
                  <MapInput initialPosition={locCoord} onLocationSelect={handleMapLocationSelect} />
                  <div style={{ margin: "0.5rem 0", color: "#047857", fontWeight: "bold" }}></div>
                </div>
                <div
                  className={styles.imageUploadBox}
                  onClick={handleImageBoxClick}
                  tabIndex={0}
                  role="button"
                  onDragOver={handleImageBoxDragOver}
                  onDragLeave={handleImageBoxDragLeave}
                  onDrop={handleImageBoxDrop}
                  style={{
                    border: isDragging ? "2px dashed #047857" : "2px dashed #d1d5db",
                    background: isDragging ? "#e6f7f1" : "white",
                    transition: "background 0.2s, border 0.2s",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    ref={imageInputRef}
                    onChange={handleImageChange}
                  />
                  <i
                    className="fa-solid fa-camera"
                    style={{ fontSize: "1.3rem", color: "#F44336" }}
                  ></i>
                  <div
                    style={{
                      fontWeight: "bold",
                      color: "#222",
                      fontSize: "0.95rem",
                    }}
                  >
                    Click to upload or drag and drop
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#888" }}>
                    {image ? image.name : "No photo uploaded"}
                  </div>
                  {image && (
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Preview"
                      style={{
                        marginTop: "0.4rem",
                        maxWidth: "100%",
                        maxHeight: "100px",
                        borderRadius: "0.5rem",
                      }}
                    />
                  )}
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.formButton}
                  disabled={loading}
                >
                  <i
                    className="fa-solid fa-paper-plane"
                    style={{ marginRight: "0.6em" }}
                  ></i>
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Previous Reports */}
          <div className={`${styles.whiteContainer} ${styles.rightContainer}`}>
            <div className={styles.rightScroll}>
              <div className={styles.previousReportsLabel}>Previous Reports</div>
              <ul className={styles.reportItems}>
                {reports.length === 0 && (
                  <li
                    style={{
                      color: "#888",
                      padding: "1.5rem",
                      textAlign: "center",
                    }}
                  >
                    No reports found.
                  </li>
                )}
                {reports.map((report) => (
                  <li
                    className={styles.reportItem}
                    key={report._id}
                    style={{
                      background: "#f9f9f9",
                      borderRadius: "1.2rem",
                      marginBottom: "2rem",
                      boxShadow: "0 2px 8px #04785722",
                      padding: "1.5rem 1.2rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.2rem",
                    }}
                  >
                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                      {editingId === report._id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(report._id)}
                            disabled={editingSave}
                            style={{
                              background: "#047857",
                              color: "#fff",
                              border: "none",
                              borderRadius: "0.5rem",
                              padding: "0.4rem 0.9rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            {editingSave ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={editingSave}
                            style={{
                              background: "#e5e7eb",
                              color: "#111827",
                              border: "none",
                              borderRadius: "0.5rem",
                              padding: "0.4rem 0.9rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(report)}
                          style={{
                            background: "#F44336",
                            color: "#fff",
                            border: "none",
                            borderRadius: "0.5rem",
                            padding: "0.4rem 0.9rem",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {/* Content (toggle between read-only and edit mode) */}
                    {editingId === report._id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                        {/* Title */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                          <span style={{ fontWeight: "bold", color: "#047857", minWidth: 100 }}>Title:</span>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "0.55rem 0.8rem",
                              borderRadius: "0.6rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.95rem",
                              outline: "none",
                              background: "white",
                              color: "#222",
                            }}
                          />
                        </div>

                        {/* Description */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}>
                          <span style={{ fontWeight: "bold", color: "#047857", minWidth: 100, paddingTop: "0.35rem" }}>
                            Description:
                          </span>
                          {/* Changed to textarea for multiline editing */}
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={5}
                            spellCheck
                            aria-label="Edit description"
                            style={{
                              flex: 1,
                              padding: "0.6rem 0.8rem",
                              borderRadius: "0.6rem",
                              border: "1px solid #d1d5db",
                              fontSize: "0.95rem",
                              outline: "none",
                              background: "white",
                              color: "#222",
                              lineHeight: 1.5,
                              minHeight: "100px",
                              resize: "vertical",
                              fontFamily: "inherit",
                            }}
                          />
                        </div>

                        {/* Location (read-only) */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                          <span style={{ fontWeight: "bold", color: "#047857", minWidth: 100 }}>Location:</span>
                          <input
                            type="text"
                            value={editLocation}
                            readOnly
                            placeholder="Click on the map to update location"
                            style={{ flex: 1, padding: "0.55rem 0.8rem", borderRadius: "0.6rem", border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none", background: "white", color: "#222" }}
                          />
                        </div>

                        {/* SIDE-BY-SIDE: Map (left) and Image (right) */}
                        <div className={styles.editMediaRow}>
                          <div className={styles.editMediaCol}>
                            <div className={styles.editMapHeader}>Click on the map to set a new location</div>
                            <div className={styles.editMapBox} style={{ height: 300 }}>
                              {editMapReady && (
                                <MapInput
                                  key={`edit-map-${editingId}-${editLocCoord?.lat ?? 'na'}-${editLocCoord?.lng ?? 'na'}`}
                                  initialPosition={editLocCoord}
                                  onLocationSelect={handleEditMapLocationSelect}
                                />
                              )}
                            </div>
                          </div>

                          <div className={styles.editMediaCol}>
                            <div className={styles.editImageHeader}>Current / New Image</div>
                            <div className={styles.editImageCard}>
                              {editImagePreview ? (
                                <img
                                  src={editImagePreview}
                                  alt="Report"
                                  className={styles.editImage}
                                />
                              ) : (
                                <span className={styles.editImagePlaceholder}>No image</span>
                              )}
                            </div>
                            <label
                              htmlFor={`edit-image-${report._id}`}
                              className={styles.editImageButton}
                            >
                              Choose New Image
                            </label>
                            <input
                              id={`edit-image-${report._id}`}
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              style={{ display: "none" }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "0.7rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                color: "#047857",
                                minWidth: "100px",
                            }}
                          >
                            Title:
                          </span>
                          <span
                            style={{
                              fontSize: "1.05rem",
                              color: "#222",
                              marginLeft: "0.5rem",
                            }}
                          >
                            {report.title}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "0.7rem",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "#047857",
                              minWidth: "100px",
                            }}
                          >
                            Description:
                          </span>
                          <span
                            style={{
                              fontSize: "1rem",
                              color: "#333",
                              marginLeft: "0.5rem",
                            }}
                          >
                            {report.description}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "0.7rem",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "#047857",
                              minWidth: "100px",
                            }}
                          >
                            Location:
                          </span>
                          <span
                            style={{
                              fontSize: "1rem",
                              color: "#333",
                              marginLeft: "0.5rem",
                            }}
                          >
                            {report.location}
                          </span>
                        </div>
                        <div
                          style={{
                            fontWeight: "bold",
                            color: "#047857",
                            marginBottom: "0.3rem",
                          }}
                        >
                          Image:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "1rem",
                            flexWrap: "wrap",
                            marginBottom: "0.7rem",
                          }}
                        >
                          {report.image && report.image.length > 0 ? (
                            report.image.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Report ${idx + 1}`}
                                style={{
                                  maxWidth: "350px",
                                  maxHeight: "250px",
                                  borderRadius: "0.7rem",
                                  boxShadow: "0 2px 8px #04785722",
                                  background: "#fff",
                                  objectFit: "cover",
                                }}
                              />
                            ))
                          ) : (
                            <span
                              style={{
                                color: "#888",
                                fontSize: "0.95rem",
                                textAlign: "center",
                              }}
                            >
                              No image
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            color: "#888",
                            fontSize: "0.95rem",
                          }}
                        >
                          {new Date(report.date).toLocaleString()}
                        </div>
                      </div>
                    </>
                  )}
                  {/* ...existing code... */}
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </section>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </main>
  );
}