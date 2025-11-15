import React from 'react';
import { hasPagePermission, hasEntityPermission, getUserRole } from './permissions';

export function RBACPage({ user, pageName, children, fallback = null }) {
  const userRole = getUserRole(user);
  if (!userRole || !hasPagePermission(userRole, pageName)) {
    return fallback;
  }
  return <>{children}</>;
}

export function RBACEntity({ user, entityName, operation, children, fallback = null }) {
  const userRole = getUserRole(user);
  if (!userRole || !hasEntityPermission(userRole, entityName, operation)) {
    return fallback;
  }
  return <>{children}</>;
}

export function RBACSection({ user, allowedRoles, children, fallback = null }) {
  const userRole = getUserRole(user);
  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback;
  }
  return <>{children}</>;
}