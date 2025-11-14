import React from 'react';
import styles from './TermsModal.module.css';

export default function TermsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <h1 className={styles.mainTitle}>WasteWise - Terms and Conditions</h1>
        <div className={styles.modalContent}>
          <h2 className={styles.sectionTitle}>Terms of Service</h2>
          <ul>
            <li><strong>Use of Service</strong>: WasteWise is for tracking and managing waste. Don’t use it for harmful or illegal purposes.</li>
            <li><strong>Accounts</strong>: Keep your login details secure and provide accurate information.</li>
            <li><strong>Content</strong>: You are responsible for the data and files you upload.</li>
            <li><strong>Disclaimer</strong>: WasteWise is provided “as is.” We are not responsible for data loss or service issues.</li>
            <li><strong>Termination</strong>: Accounts that violate these terms may be suspended or removed.</li>
            <li><strong>Updates</strong>: We may change these terms. Continued use means you accept the changes.</li>
          </ul>
          <hr className={styles.sectionDivider} />
          <h2 className={styles.sectionTitle}>Privacy Policy</h2>
          <ul>
            <li><strong>Data We Collect</strong>: Basic account info (name, email), waste records, and limited usage data.</li>
            <li><strong>Use of Data</strong>: To run and improve WasteWise, personalize features, and send important updates.</li>
            <li><strong>Protection</strong>: We take steps to secure your information, but no system is 100% secure.</li>
            <li><strong>Sharing</strong>: We don’t sell personal data. We may share anonymized data or disclose info if required by law.</li>
            <li><strong>Your Rights</strong>: You may request access, edits, or deletion of your data anytime.</li>
            <li><strong>Updates</strong>: We may update this policy. Using WasteWise means you agree to the latest version.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
