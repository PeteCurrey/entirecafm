// RBAC Permission Matrix for EntireCAFM

export const ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  HELPDESK: 'helpdesk',
  FINANCE: 'finance',
  CLIENT: 'client'
};

// Entity-level permissions: { entity: { role: ['create', 'read', 'update', 'delete'] } }
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
  },
  Site: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ENGINEER]: ['read'],
    [ROLES.HELPDESK]: ['read', 'update'],
    [ROLES.CLIENT]: ['read']
  },
  Asset: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ENGINEER]: ['read', 'update'],
    [ROLES.HELPDESK]: ['read'],
    [ROLES.CLIENT]: ['read']
  },
  ComplianceRecord: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ENGINEER]: ['read', 'update'],
    [ROLES.HELPDESK]: ['read']
  },
  ESGMetric: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.FINANCE]: ['read']
  },
  User: {
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete']
  }
};

// Function-level permissions: { functionName: [allowedRoles] }
export const FUNCTION_PERMISSIONS = {
  aiDirectorDashboard: [ROLES.ADMIN],
  aiFinancialForecaster: [ROLES.ADMIN, ROLES.FINANCE],
  aiEngineerScheduler: [ROLES.ADMIN, ROLES.HELPDESK],
  revenueSimulator: [ROLES.ADMIN, ROLES.FINANCE],
  accounts: [ROLES.ADMIN, ROLES.FINANCE],
  marketing: [ROLES.ADMIN],
  certificateUploader: [ROLES.ADMIN, ROLES.ENGINEER],
  esgCollector: [ROLES.ADMIN],
  complianceReportGenerator: [ROLES.ADMIN],
  iotIngest: [ROLES.ADMIN, ROLES.ENGINEER],
  pafe_predictFailure: [ROLES.ADMIN, ROLES.ENGINEER],
  exportInvoicesCSV: [ROLES.ADMIN, ROLES.FINANCE],
  getClientDashboard: [ROLES.CLIENT],
  clientRequest: [ROLES.CLIENT],
  updateJobStatus: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.HELPDESK],
  aiHelpdeskTriage: [ROLES.ADMIN, ROLES.HELPDESK]
};

// Page-level permissions: { pageName: [allowedRoles] }
export const PAGE_PERMISSIONS = {
  BulkDataWizard: [ROLES.ADMIN],
  Dashboard: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.HELPDESK, ROLES.FINANCE],
  DataImport: [ROLES.ADMIN],
  AIDirector: [ROLES.ADMIN],
  AIAccounts: [ROLES.ADMIN, ROLES.FINANCE],
  AIMarketing: [ROLES.ADMIN],
  Jobs: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.HELPDESK],
  Quotes: [ROLES.ADMIN, ROLES.HELPDESK, ROLES.FINANCE],
  Invoices: [ROLES.ADMIN, ROLES.FINANCE],
  Clients: [ROLES.ADMIN, ROLES.HELPDESK, ROLES.FINANCE],
  Sites: [ROLES.ADMIN, ROLES.ENGINEER, ROLES.HELPDESK],
  Assets: [ROLES.ADMIN, ROLES.ENGINEER],
  Team: [ROLES.ADMIN],
  Reports: [ROLES.ADMIN, ROLES.FINANCE],
  Approvals: [ROLES.ADMIN],
  MapTracking: [ROLES.ADMIN, ROLES.HELPDESK],
  Compliance: [ROLES.ADMIN],
  AIHelpdesk: [ROLES.ADMIN, ROLES.HELPDESK],
  ExecutiveBrief: [ROLES.ADMIN],
  ClientPortal: [ROLES.CLIENT]
};

// Helper functions
export function hasEntityPermission(role, entityName, operation) {
  const permissions = ENTITY_PERMISSIONS[entityName];
  if (!permissions) return false;
  const rolePermissions = permissions[role];
  return rolePermissions && rolePermissions.includes(operation);
}

export function hasFunctionPermission(role, functionName) {
  const allowedRoles = FUNCTION_PERMISSIONS[functionName];
  if (!allowedRoles) return true; // If not defined, allow all
  return allowedRoles.includes(role);
}

export function hasPagePermission(role, pageName) {
  const allowedRoles = PAGE_PERMISSIONS[pageName];
  if (!allowedRoles) return true; // If not defined, allow all
  return allowedRoles.includes(role);
}

export function getUserRole(user) {
  // Map existing roles to new RBAC roles
  if (!user) return null;
  if (user.role === 'admin') return ROLES.ADMIN;
  if (user.role === 'user') return ROLES.ENGINEER; // Default engineers
  if (user.role === 'helpdesk') return ROLES.HELPDESK;
  if (user.role === 'finance') return ROLES.FINANCE;
  if (user.role === 'client') return ROLES.CLIENT;
  return ROLES.ENGINEER; // Default fallback
}