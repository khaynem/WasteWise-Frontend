"use client";

import { useState, useEffect } from 'react';
import styles from './users.module.css';
import api from "../../../lib/axios"; 
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
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
  const [changingRoleFor, setChangingRoleFor] = useState(null); // id of user being changed

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState({ userId: null, newRole: null, username: '' });
  
  const ROLE_OPTIONS = ['user', 'admin', 'barangay', 'business', 'non-government', 'local-government'];

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

  const handleRoleChange = (userId, newRole) => {
    if (!userId || !newRole) return;
    const user = users.find(u => u._id === userId);
    if (!user) return;
    if (user.role === newRole) return;
    setPendingRoleChange({ userId, newRole, username: user.username });
    setRoleModalOpen(true);
  };

  const confirmRoleChange = async () => {
    const { userId, newRole } = pendingRoleChange;
    if (!userId || !newRole) return;
    try {
      setChangingRoleFor(userId);
      await api.post(`/api/admin/user/role/update/${userId}`, { newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to "${newRole}".`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to change role. Please try again.");
    } finally {
      setChangingRoleFor(null);
      setPendingRoleChange({ userId: null, newRole: null, username: '' });
      setRoleModalOpen(false);
    }
  };

  const cancelRoleChange = () => {
    setPendingRoleChange({ userId: null, newRole: null, username: '' });
    setRoleModalOpen(false);
  };

  return (
    <>
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
                      <td className={styles.roleCell}>
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={changingRoleFor === user._id}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            color: '#374151',
                            fontSize: '0.95rem',
                            cursor: 'pointer'
                          }}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
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

          {/* Role Change Confirmation Modal */}
          {roleModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3>Confirm Role Change</h3>
                  <button className={styles.closeBtn} onClick={cancelRoleChange}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <p>
                    Change role for <strong>{pendingRoleChange.username}</strong> to <strong>{pendingRoleChange.newRole}</strong>?
                  </p>
                  <p className={styles.warningText}>
                    <i className="fas fa-exclamation-triangle"></i>
                    This will update the user's permissions immediately.
                  </p>
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={cancelRoleChange}>Cancel</button>
                  <button
                    className={styles.confirmBtn}
                    onClick={confirmRoleChange}
                    disabled={changingRoleFor === pendingRoleChange.userId}
                  >
                    {changingRoleFor === pendingRoleChange.userId ? 'Updating...' : 'Confirm'}
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