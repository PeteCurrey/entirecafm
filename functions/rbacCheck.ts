import { FUNCTION_PERMISSIONS } from '../components/rbac/permissions.js';

export function requirePermission(user, functionName) {
  if (!user) {
    throw new Error('Access denied: User not authenticated');
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return true;
  }

  // Check function permissions
  const allowedRoles = FUNCTION_PERMISSIONS[functionName];
  
  if (!allowedRoles) {
    // If function not in permissions list, default to admin only
    if (user.role !== 'admin') {
      throw new Error(`Access denied: ${functionName} requires admin role`);
    }
    return true;
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied: Insufficient permissions for ${functionName}`);
  }

  return true;
}