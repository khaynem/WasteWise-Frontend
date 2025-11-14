"use client";
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './reset-password.module.css';
import api from '../../../lib/axios'; // Adjust path if needed

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post(`/api/auth/reset-password/${token}`, {
        password: newPassword,
        confirmPass: confirmPassword,
      });
      if (res.data.message === 'Password reset successful') {
        setShowSuccess(true);
      } else {
        setError(res.data.message || 'Something went wrong');
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        {/* Logo and Header */}
        <div className={styles.logoContainer}>
          <img src="/images/wwlogo.webp" alt="WasteWise Logo" className={styles.logo} />
          <h1 className={styles.title}>WasteWise</h1>
          <p className={styles.subtitle}>Smart waste management for a greener future</p>
        </div>

        <h2 className={styles.heading}>Reset Password</h2>
        <p className={styles.description}>
          Enter your new password below.
        </p>

        {!showSuccess ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorMessage}>
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="newPassword" className={styles.label}>
                New Password
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPasswords ? "password" : "text"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={styles.input}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  <i className={showPasswords ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPasswords ? "password" : "text"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={styles.input}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  <i className={showPasswords ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        ) : (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Password Reset Successful!</h3>
            <p>Your password has been successfully reset. You can now sign in with your new password.</p>
            <Link
              href="/login"
              className={styles.backToLoginBtn}
            >
              Go to Login
            </Link>
          </div>
        )}

        {!showSuccess && (
          <div className={styles.backToLogin}>
            <p>Remember your password?</p>
            <Link href="/login" className={styles.loginLink}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}