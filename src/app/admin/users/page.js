"use client";

import AdminNavBar from "../componentsadmin/adminNavBar";
import { useState, useEffect } from 'react';
import styles from './users.module.css';
import api from "../../../lib/axios"; // Add this import at the top
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  // Format: Month Day Year (e.g., Oct 6 2025)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // <-- Add this line
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch users from backend
  const fetchUsers = async () => {
    //const authToken = getCookie("authToken");
    try {
      const response = await api.get("/api/admin/users", {
        headers: {
          // 'Authorization': `Bearer ${authToken}`,
        },
      });
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      toast.error("Failed to fetch users.");
    }
  };

  // Replace mock data useEffect with API call
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search term and status
  useEffect(() => {
    let filtered = users.filter(user =>
      (user.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );
    if (statusFilter !== 'All') {
      filtered = filtered.filter(user => 
        user.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter]);

  const handleActionClick = (action, user) => {
    setSelectedAction(action);
    setSelectedUser(user);
    setShowModal(true);
  };

  // Replace mock user actions with API calls
  const handleConfirmAction = async () => {
    if (selectedAction && selectedUser) {
      //const authToken = getCookie("authToken");
      try {
        let endpoint = "";
        let method = "patch";
        switch (selectedAction) {
          case 'suspend':
            endpoint = `/api/admin/users/${selectedUser._id}/suspend`;
            break;
          case 'ban':
            endpoint = `/api/admin/users/${selectedUser._id}/ban`;
            break;
          case 'activate':
            endpoint = `/api/admin/users/${selectedUser._id}/activate`;
            break;
          default:
            break;
        }
        if (endpoint) {
          await api[method](endpoint, {
            headers: {
              // 'Authorization': `Bearer ${authToken}`,
            },
          });
          fetchUsers();
          const verb =
            selectedAction === "suspend" ? (selectedUser?.status === "Suspended" ? "Unsuspended" : "Suspended")
            : selectedAction === "ban" ? (selectedUser?.status === "Banned" ? "Unbanned" : "Banned")
            : "Activated";
          toast.success(`${verb} user successfully.`);
        }
      } catch (error) {
        toast.error("Failed to update user status. Please try again.");
      }
    }
    setShowModal(false);
    setSelectedAction(null);
    setSelectedUser(null);
  };

  const handleCancelAction = () => {
    setShowModal(false);
    setSelectedAction(null);
    setSelectedUser(null);
  };

  const getActionText = (action) => {
    switch (action) {
      case 'suspend':
        return selectedUser?.status === 'Suspended' ? 'Unsuspend' : 'Suspend';
      case 'ban':
        return selectedUser?.status === 'Banned' ? 'Unban' : 'Ban';
      case 'activate':
        return 'Activate';
      default:
        return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return '#10b981';
      case 'Suspended':
        return '#f59e0b';
      case 'Banned':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <>
      <AdminNavBar />
      <main className={styles.usersMain}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>User Management</h1>
          </div>

          <div className={styles.usersContainer}>
            <div className={styles.containerHeader}>
              <h2 className={styles.sectionTitle}>All Users</h2>
              <div className={styles.searchSection} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className={styles.searchWrapper}>
                  <i className="fas fa-search" style={{ color: '#6b7280' }}></i>
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                {/* Filter dropdown beside search bar */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Banned">Banned</option>
                </select>
              </div>
            </div>
            
            <div className={styles.tableWrapper}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Join Date</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className={styles.userRow}>
                      <td className={styles.userCell}>
                        <div className={styles.userInfo}>
                          <div className={styles.userAvatar}>
                            <i className="fas fa-user"></i>
                          </div>
                          <div>
                            <div className={styles.userName}>{user.username}</div>
                            <div className={styles.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.roleCell}>{user.role}</td>
                      <td className={styles.statusCell}>
                        <span 
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(user.status) }}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{formatDate(user.joinDate)}</td>
                      <td className={styles.dateCell}>{formatDate(user.lastLogin)}</td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button
                            className={`${styles.actionBtn} ${styles.suspendBtn}`}
                            onClick={() => handleActionClick('suspend', user)}
                            title={user.status === 'Suspended' ? 'Unsuspend User' : 'Suspend User'}
                          >
                            <i className={user.status === 'Suspended' ? 'fas fa-play' : 'fas fa-pause'}></i>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.banBtn}`}
                            onClick={() => handleActionClick('ban', user)}
                            title={user.status === 'Banned' ? 'Unban User' : 'Ban User'}
                          >
                            <i className={user.status === 'Banned' ? 'fas fa-unlock' : 'fas fa-ban'}></i>
                          </button>
                          {user.status !== 'Active' && (
                            <button
                              className={`${styles.actionBtn} ${styles.activateBtn}`}
                              onClick={() => handleActionClick('activate', user)}
                              title="Activate User"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className={styles.noUsers}>
                  <i className="fas fa-users" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Modal */}
          {showModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3>Confirm Action</h3>
                  <button 
                    className={styles.closeBtn}
                    onClick={handleCancelAction}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <p>
                    Are you sure you want to <strong>{getActionText(selectedAction).toLowerCase()}</strong> the user <strong>{selectedUser?.name}</strong>?
                  </p>
                  {selectedAction === 'delete' && (
                    <p className={styles.warningText}>
                      <i className="fas fa-exclamation-triangle"></i>
                      This action cannot be undone.
                    </p>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  <button 
                    className={styles.cancelBtn}
                    onClick={handleCancelAction}
                  >
                    Cancel
                  </button>
                  <button 
                    className={`${styles.confirmBtn} ${selectedAction === 'delete' ? styles.deleteConfirm : ''}`}
                    onClick={handleConfirmAction}
                  >
                    {getActionText(selectedAction)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
}