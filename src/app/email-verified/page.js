'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './emailVerified.module.css';

function EmailVerifiedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'success';
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <img src="/images/wwlogo.webp" alt="WasteWise Logo" className={styles.logo} />
        </div>
        
        <div className={styles.content}>
          {status === 'success' ? (
            <>
              <div className={styles.checkmark}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h1 className={styles.title}>Email Verified!</h1>
              <p className={styles.message}>
                Your email has been successfully verified. You can now sign in to your WasteWise account.
              </p>
            </>
          ) : (
            <>
              <div className={styles.infomark}>
                <i className="fa-solid fa-circle-info"></i>
              </div>
              <h1 className={styles.title}>Already Verified</h1>
              <p className={styles.message}>
                Your email was already verified. You can sign in to your WasteWise account.
              </p>
            </>
          )}

          <div className={styles.actions}>
            <Link href="/login" className={styles.button}>
              Go to Sign In
            </Link>
          </div>

          <p className={styles.redirect}>
            This page will close in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmailVerified() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <img src="/images/wwlogo.webp" alt="WasteWise Logo" className={styles.logo} />
          </div>
          <div className={styles.content}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <EmailVerifiedContent />
    </Suspense>
  );
}
