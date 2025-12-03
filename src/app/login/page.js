'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import TermsModal from '../components/TermsModal';
import api from '../../lib/axios';
import { clearAuthCache } from '../../lib/auth';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('at least 1 uppercase letter');
    if (!/[0-9]/.test(password)) errors.push('at least 1 number');
    if (!/[!@#$%^&*(),_.?":{}|<>]/.test(password)) errors.push('at least 1 special character');
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    setIsLoading(true);

    if (activeTab === 'signin') {
      // Sign In Validation
      if (!formData.email) {
        newErrors.email = 'Email is required.';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address.';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required.';
      }

      if (Object.keys(newErrors).length === 0) {
        try {
          const response = await api.post('/api/auth/login', {
            cred: formData.email,
            password: formData.password
          }, { withCredentials: true });

          if (response.data.code === 200) {
            // Clear auth cache to force fresh check on next page
            clearAuthCache();
            
            toast.success("Signed in successfully.");
            const role = response.data.role;
            const roleRoutes = {
              admin: '/admin/adashboard',
              user: '/', 
              barangay: '/barangay/dashboard',
              business: '/businesses/dashboard',   
              businesses: '/businesses/dashboard',
              'non-government': '/non-government/dashboard',
              'local-government': '/local-government/dashboard'
            };
            const target = roleRoutes[role] || `/${role}/dashboard`;
            setTimeout(() => router.push(target), 400);
            return;
          }
        } catch (error) {
          if (error.response?.status === 404) {
            setErrors({ email: 'User not found. Please check your email address.' });
          } else if (error.response?.status === 400) {
            setErrors({ password: 'Incorrect password or email. Please try again.' });
          } else if (error.response?.status === 403) {
            setErrors({ general: 'Your account is not active. Please contact support.' });
          } else {
            console.error('Login error:', error);
            setErrors({ general: 'An error occurred. Please try again later.' });
          }
        }
      } else {
        setErrors(newErrors);
      }
    } else {
      // Create Account Validation
      if (!formData.name) {
        newErrors.name = 'Full Name is required.';
      }
      if (!formData.email) {
        newErrors.email = 'Email is required.';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address.';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required.';
      } else {
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
          newErrors.password = `Password must include: ${passwordErrors.join(', ')}`;
        }
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
      if (!agreedToTerms) {
        newErrors.agreement = 'You must agree to the Terms and Privacy Policy.';
      }

      if (Object.keys(newErrors).length === 0) {
        try {
          const response = await api.post('/api/auth/signup', {
            username: formData.name,
            email: formData.email,
            password: formData.password,
            confirmPass: formData.confirmPassword
          });

          if (response.status === 200) {
            toast.success("Account created! Please verify your email before signing in.");
            setActiveTab('signin');
            setFormData({
              email: '',
              password: '',
              confirmPassword: '',
              name: ''
            });
            setAgreedToTerms(false);
            setErrors({});
          }
        } catch (error) {
          if (error.response?.data?.message) {
            setErrors({ general: error.response.data.message });
          } else {
            setErrors({ general: 'An error occurred during registration. Please try again.' });
          }
        }
      } else {
        setErrors(newErrors);
      }
    }

    setIsLoading(false);
  };

  const handleTermsClick = () => {
    setShowTermsModal(true);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 250);
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: async (resp) => {
            if (!resp?.credential) return;
            
            // Clear auth cache before making request
            clearAuthCache();
            
            setIsLoading(true);
            try {
              console.log('Sending Google auth request with action:', activeTab);
              
              const r = await api.post('/api/auth/google', { 
                id_token: resp.credential, 
                action: activeTab 
              }, { 
                withCredentials: true 
              });
              
              console.log('Google auth response:', r.data);
              
              if (r.data?.code === 200) {
                // Clear cache again after successful auth
                clearAuthCache();
                
                const successMessage = activeTab === 'create' 
                  ? 'Account created with Google!' 
                  : 'Signed in with Google!';
                toast.success(successMessage);
                
                const role = r.data.role;
                console.log('Redirecting user with role:', role);
                
                const roleRoutes = {
                  admin: '/admin/adashboard',
                  user: '/', 
                  barangay: '/barangay/dashboard',
                  business: '/businesses/dashboard',   
                  businesses: '/businesses/dashboard',
                  'non-government': '/non-government/dashboard',
                  'local-government': '/local-government/dashboard'
                };
                
                const target = roleRoutes[role] || `/${role}/dashboard`;
                console.log('Redirecting to:', target);
                
                // Small delay to ensure cookie is set
                setTimeout(() => {
                  router.push(target);
                }, 400);
                
                return;
              } else {
                toast.error(r.data?.message || 'Google authentication failed');
              }
            } catch (err) {
              console.error('Google authentication error:', err);
              
              const errorMessage = err.response?.data?.message;
              
              if (err.response?.status === 409) {
                // Account already exists (during create action)
                toast.error(errorMessage || 'This email already has an account. Please use Sign In instead.');
                // Auto-switch to sign in tab
                setTimeout(() => setActiveTab('signin'), 2000);
              } else if (err.response?.status === 404) {
                // No account found (during signin action)
                toast.error(errorMessage || 'No account found with this email. Please create an account first.');
                // Auto-switch to create account tab
                setTimeout(() => setActiveTab('create'), 2000);
              } else if (err.response?.status === 403) {
                // Account is inactive
                toast.error(errorMessage || 'Your account is not active. Please contact support.');
              } else {
                // Generic error
                toast.error(errorMessage || 'Google authentication failed. Please try again.');
              }
            } finally {
              setIsLoading(false);
            }
          }
        });

        const el = document.getElementById('googleSignInDiv');
        if (el && (activeTab === 'create' || activeTab === 'signin')) {
          el.innerHTML = '';
          window.google.accounts.id.renderButton(el, { 
            theme: 'outline', 
            size: 'large',
            text: activeTab === 'create' ? 'signup_with' : 'signin_with'
          });
        }
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.id = 'google-identity-script';
      document.body.appendChild(script);
      script.onload = initGoogle;
      return () => {
        if (script.parentNode) script.parentNode.removeChild(script);
      };
    } else {
      initGoogle();
    }
  }, [activeTab, router]);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.logoContainer}>
            <img src="/images/wwlogo.webp" alt="WasteWise Logo" className={styles.logo} />
            <h1 className={styles.title}>WasteWise</h1>
            <p className={styles.subtitle}>Smart waste management for a greener future</p>
          </div>

          <div className={`${styles.formContainer} ${activeTab === 'signin' ? styles.signInTab : styles.createAccountTab}`}> 
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'signin' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('signin')}
              >
                Sign In
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'create' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('create')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className={`${styles.form} ${isTransitioning ? styles.tabTransition : ''}`}> 
              {errors.general && (
                <div className={styles.errorText} style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  {errors.general}
                </div>
              )}

              {activeTab === 'create' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  />
                  {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@gmail.com"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`${styles.input} ${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={showPassword ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"} aria-hidden="true"></i>
                  </button>
                </div>
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              {activeTab === 'create' && (
                <div className={styles.inputGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className={styles.passwordContainer}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`${styles.input} ${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                    />
                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      aria-pressed={showConfirmPassword}
                      aria-controls="confirmPassword"
                      title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      <i className={showConfirmPassword ? "fa-solid fa-eye" : "fa-solid fa-eye-slash"} aria-hidden="true"></i>
                    </button>
                  </div>
                  {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
                </div>
              )}

              {activeTab === 'signin' && (
                <div className={styles.forgotPassword}>
                  <Link href="/forgot-password" className={styles.forgotPassword}>
                    Forgot Password?
                  </Link>
                </div>
              )}

              {activeTab === 'create' && (
                <div className={styles.agreementContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxText}>
                      I agree to the{' '}
                      <button
                        type="button"
                        className={styles.termsLink}
                        onClick={handleTermsClick}
                      >
                        Terms of Service and Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                  {errors.agreement && <span className={styles.errorText}>{errors.agreement}</span>}
                </div>
              )}

              <button type="submit" className={styles.submitButton} disabled={isLoading}>
                {isLoading ? 'Please wait...' : (activeTab === 'signin' ? 'Sign In' : 'Create Account')}
              </button>

              <div className={styles.orDividerDashed}>
                <span className={styles.dash} />
                <span className={styles.orText}>
                  {activeTab === 'create' ? 'or Create Account using' : 'or Sign In with'}
                </span>
                <span className={styles.dash} />
              </div>

              <div id="googleSignInDiv" style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }} />
            </form>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <TermsModal open={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </>
  );
}