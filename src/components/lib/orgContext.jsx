/**
 * Org Context Helper for SaaS Multi-Tenancy
 * Enforces org_id filtering for all database queries
 */

export function withOrg(where = {}, user) {
  if (!user?.org_id) {
    throw new Error('User org_id required for data isolation');
  }
  
  return {
    ...where,
    org_id: user.org_id
  };
}

/**
 * Validate user belongs to the requested org
 */
export function validateOrgAccess(requestedOrgId, user) {
  if (user.role === 'admin') {
    return true; // Admins can access any org
  }
  
  if (requestedOrgId !== user.org_id) {
    throw new Error('Access denied: User does not belong to this organization');
  }
  
  return true;
}

/**
 * Get org_id from user context with fallback
 */
export function getOrgId(user) {
  return user?.org_id || 'default-org';
}