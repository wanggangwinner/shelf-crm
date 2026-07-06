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

export type CustomerStage =
  | '线索'
  | '初步沟通'
  | '资料/现场'
  | '设计/方案'
  | '报价谈判'
  | '成交确认'
  | '交付/安装'
  | '回款/售后'
  | '复购/转介绍/流失';

export type CustomerLevel = 'A' | 'B' | 'C' | 'D';

export interface Customer {
  id: string;
  team_id: string;
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
  stage: CustomerStage;
  level: CustomerLevel;
  riskTags: string[];
  nextFollowTime: string;
  latestFollowSummary: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CustomerOwnershipHistory {
  id: string;
  team_id: string;
  customerId: string;
  fromOwnerId?: string;
  toOwnerId: string;
  changeType: 'created';
  reason: string;
  operatedBy: string;
  operatedAt: string;
}

export interface DemandPhraseParseResult {
  storeArea?: string;
  storeType?: string;
  demandText: string;
}

export type DuplicateReason = 'phone' | 'wechat' | 'name_city' | 'similar_address';

export interface CustomerDuplicateMatch {
  customer: Customer;
  reasons: DuplicateReason[];
}

export interface CreateCustomerInput {
  name: string;
  contactName?: string;
  phone?: string;
  wechat?: string;
  city?: string;
  address?: string;
  storeType?: string;
  storeArea?: string;
  demandText?: string;
  source?: string;
  nextFollowTime?: string;
  ignoreDuplicateWarning?: boolean;
}