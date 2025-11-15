// Backend RBAC enforcement helper

export const ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  HELPDESK: 'helpdesk',
  FINANCE: 'finance',
  CLIENT: 'client'
};

export const ENTITY_PERMISSIONS = {
  Job: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ENGINEER]: ['read', 'update'],
    [ROLES.HELPDESK]: ['create', 'read', 'update'],
    [ROLES.FINANCE]: ['read'],
    [ROLES.CLIENT]: ['read']
  },
  Quote: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ENGINEER]: ['read'],
    [ROLES.HELPDESK]: ['create', 'read', 'update'],
    [ROLES.FINANCE]: ['read', 'update'],
    [ROLES.CLIENT]: ['read']
  },
  Invoice: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.FINANCE]: ['create', 'read', 'update', 'delete'],
    [ROLES.HELPDESK]: ['read'],
    [ROLES.ENGINEER]: ['read'],
    [ROLES.CLIENT]: ['read']
  },
  Client: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.HELPDESK]: ['read', 'update'],
    [ROLES.FINANCE]: ['read'],
    [ROLES.ENGINEER]: ['read']
  }
};

export const FUNCTION_PERMISSIONS = {
  aiDirectorDashboard: [ROLES.ADMIN],
  aiFinancialForecaster: [ROLES.ADMIN, ROLES.FINANCE],
  aiEngineerScheduler: [ROLES.ADMIN, ROLES.HELPDESK],
  revenueSimulator: [ROLES.ADMIN, ROLES.FINANCE],
  certificateUploader: [ROLES.ADMIN, ROLES.ENGINEER],
  esgCollector: [ROLES.ADMIN],
  iotIngest: [ROLES.ADMIN, ROLES.ENGINEER],
  updateJobStatus: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.HELPDESK]
};

export function getUserRole(user) {
  if (!user) return null;
  if (user.role === 'admin') return ROLES.ADMIN;
  if (user.role === 'user') return ROLES.ENGINEER;
  if (user.role === 'helpdesk') return ROLES.HELPDESK;
  if (user.role === 'finance') return ROLES.FINANCE;
  if (user.role === 'client') return ROLES.CLIENT;
  return ROLES.ENGINEER;
}

export function checkFunctionPermission(user, functionName) {
  const userRole = getUserRole(user);
  const allowedRoles = FUNCTION_PERMISSIONS[functionName];
  
  if (!allowedRoles) return true; // Not restricted
  if (!userRole) return false;
  
  return allowedRoles.includes(userRole);
}

export function checkEntityPermission(user, entityName, operation) {
  const userRole = getUserRole(user);
  const permissions = ENTITY_PERMISSIONS[entityName];
  
  if (!permissions) return true; // Not restricted
  if (!userRole) return false;
  
  const rolePermissions = permissions[userRole];
  return rolePermissions && rolePermissions.includes(operation);
}

export function requirePermission(user, functionName) {
  if (!checkFunctionPermission(user, functionName)) {
    throw new Error(`Access denied: insufficient permissions for ${functionName}`);
  }
}