/**
 * Authentication utility module
 * Replaces document.cookie access with secure httpOnly cookie management via API
 */

import api from './axios';

let authCache = null;
let authCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if user is authenticated and get user data
 * @returns {Promise<{authenticated: boolean, user?: object}>}
 */
export async function checkAuth() {
  try {
    // Return cached result if still valid
    const now = Date.now();
    if (authCache && (now - authCacheTime) < CACHE_DURATION) {
      return authCache;
    }

    const response = await api.get('/api/auth/check', {
      withCredentials: true
    });

    if (response.data.authenticated && response.data.user) {
      authCache = {
        authenticated: true,
        user: response.data.user
      };
      authCacheTime = now;
      return authCache;
    }

    authCache = { authenticated: false };
    authCacheTime = now;
    return authCache;
  } catch (error) {
    // Clear cache on error
    authCache = { authenticated: false };
    authCacheTime = Date.now();
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { authenticated: false };
    }
    
    throw error;
  }
}

/**
 * Clear authentication cache (call after login/logout)
 */
export function clearAuthCache() {
  authCache = null;
  authCacheTime = 0;
}

/**
 * Logout user by calling logout endpoint
 * @returns {Promise<boolean>}
 */
export async function logout() {
  try {
    await api.post('/api/auth/logout', {}, {
      withCredentials: true
    });
    clearAuthCache();
    return true;
  } catch (error) {
    console.error('[Logout] Error:', error);
    clearAuthCache();
    throw error;
  }
}

/**
 * Get current user data if authenticated
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const auth = await checkAuth();
    return auth.authenticated ? auth.user : null;
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return null;
  }
}

/**
 * Check if user has a specific role
 * @param {string} requiredRole - Role to check
 * @returns {Promise<boolean>}
 */
export async function hasRole(requiredRole) {
  try {
    const user = await getCurrentUser();
    return user?.role === requiredRole;
  } catch (error) {
    return false;
  }
}

/**
 * Require authentication for a page
 * Redirects to login if not authenticated
 * @param {object} router - Next.js router
 * @param {string} [redirectTo='/home'] - Where to redirect if not authenticated
 * @returns {Promise<object|null>} User object if authenticated, null otherwise
 */
export async function requireAuth(router, redirectTo = '/home') {
  try {
    const auth = await checkAuth();
    
    if (!auth.authenticated) {
      if (router) {
        router.replace(redirectTo);
      }
      return null;
    }
    
    return auth.user;
  } catch (error) {
    console.error('[requireAuth] Error:', error);
    if (router) {
      router.replace(redirectTo);
    }
    return null;
  }
}

/**
 * Require specific role for a page
 * Redirects if not authenticated or wrong role
 * @param {object} router - Next.js router
 * @param {string} requiredRole - Required role
 * @param {string} [redirectTo='/home'] - Where to redirect if unauthorized
 * @returns {Promise<object|null>} User object if authorized, null otherwise
 */
export async function requireRole(router, requiredRole, redirectTo = '/home') {
  try {
    const user = await requireAuth(router, redirectTo);
    
    if (!user) {
      return null;
    }
    
    if (user.role !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      const roleRoutes = {
        admin: '/admin/adashboard',
        user: '/',
        barangay: '/barangay/dashboard',
        business: '/businesses/dashboard',
        businesses: '/businesses/dashboard',
        'non-government': '/non-government/dashboard',
        'local-government': '/local-government/dashboard'
      };
      
      const targetRoute = roleRoutes[user.role] || '/home';
      if (router) {
        router.replace(targetRoute);
      }
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[requireRole] Error:', error);
    if (router) {
      router.replace(redirectTo);
    }
    return null;
  }
}
