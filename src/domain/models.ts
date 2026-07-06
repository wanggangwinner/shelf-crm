export type UserRoleCode = 'owner' | 'sales' | 'admin';
export type WorkspaceKind = 'personal' | 'team';

export interface User {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  isDevelopmentUser: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  kind: WorkspaceKind;
  ownerUserId: string;
  createdAt: string;
}

export type Workspace = Team;

export interface Role {
  id: string;
  team_id: string;
  code: UserRoleCode;
  name: string;
  description: string;
  permissions: string[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  userId: string;
  roleId: string;
  displayName: string;
  joinedAt: string;
}

export interface WorkspaceConfig {
  id: string;
  team_id: string;
  customerStages: string[];
  customerSources: string[];
  riskTags: string[];
  taskTypes: string[];
  quotationFeeItems: string[];
  fileTypes: string[];
  storeTypes: string[];
  shelfProductCategories: string[];
  createdAt: string;
}

export interface OnboardingProgress {
  id: string;
  team_id: string;
  userId: string;
  workspaceChosen: boolean;
  roleConfirmed: boolean;
  defaultsReviewed: boolean;
  firstCustomerPrompted: boolean;
  completedAt?: string;
}

export interface OperationLog {
  id: string;
  team_id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TeamScopedEntity {
  team_id: string;
}

export interface SessionContext {
  user: User;
  currentTeam: Team;
  member: TeamMember;
  role: Role;
}

export type CustomerLevel = 'A' | 'B' | 'C';

export interface Customer extends TeamScopedEntity {
  id: string;
  ownerUserId: string;
  name: string;
  contactName: string;
  phone: string;
  wechat: string;
  city: string;
  address: string;
  storeType: string;
  storeArea: string;
  demandText: string;
  source: string;
  stage: string;
  level: CustomerLevel;
  riskTags: string[];
  nextFollowTime: string;
  latestFollowSummary: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CustomerOwnershipHistory extends TeamScopedEntity {
  id: string;
  customerId: string;
  fromOwnerId?: string;
  toOwnerId: string;
  changeType: 'created';
  reason: string;
  operatedBy: string;
  operatedAt: string;
}

export interface CustomerDuplicateMatch {
  customer: Customer;
  reasons: string[];
}
