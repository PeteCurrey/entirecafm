export function requirePermission(user, functionName) {
  if (!user) {
    throw new Error('Access denied: User not authenticated');
  }

  // Admin always has access
  if (user.role === 'admin') {
    return true;
  }

  // Map of function permissions - keep in sync with frontend
  const FUNCTION_PERMISSIONS = {
    aiDirectorDashboard: ['admin'],
    aiDataImport: ['admin'],
    executeDataImport: ['admin'],
    generateSampleData: ['admin'],
    scheduleDirectorRefresh: ['admin'],
    aiFinancialForecaster: ['admin', 'finance'],
    aiEngineerScheduler: ['admin', 'helpdesk'],
    revenueSimulator: ['admin', 'finance'],
    accounts: ['admin', 'finance'],
    marketing: ['admin'],
    certificateUploader: ['admin', 'engineer'],
    esgCollector: ['admin'],
    complianceReportGenerator: ['admin'],
    iotIngest: ['admin', 'engineer'],
    pafe_predictFailure: ['admin', 'engineer'],
    exportInvoicesCSV: ['admin', 'finance'],
    getClientDashboard: ['client'],
    clientRequest: ['client'],
    updateJobStatus: ['admin', 'engineer', 'helpdesk'],
    aiHelpdeskTriage: ['admin', 'helpdesk'],
    aiBenchmark: ['admin']
  };

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