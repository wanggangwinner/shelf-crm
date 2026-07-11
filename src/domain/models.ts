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

export interface Contact {
  id: string;
  team_id: string;
  customerId: string;
  name: string;
  phone: string;
  wechat: string;
  title: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityStage = '线索' | '初步沟通' | '资料/现场' | '设计/方案' | '报价谈判' | '成交确认' | '交付/安装' | '回款/售后' | '复购/转介绍' | '流失';

export interface Opportunity {
  id: string;
  team_id: string;
  customerId: string;
  name: string;
  stage: OpportunityStage;
  ownerUserId: string;
  collaboratorUserIds: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateContactInput { customerId: string; name: string; phone?: string; wechat?: string; title?: string; isPrimary?: boolean }
export interface CreateOpportunityInput { customerId: string; name: string; stage?: OpportunityStage }

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

export type FollowUpMethod = '微信' | '电话' | '面谈' | '其他';

export interface FollowUpAiDraft {
  summary: string;
  objections: string[];
  blockers: string[];
  nextAction: string;
  nextFollowTime?: string;
  confidence: number;
}

export interface FollowUpRecord {
  id: string;
  team_id: string;
  customerId: string;
  opportunityId?: string;
  ownerUserId: string;
  method: FollowUpMethod;
  rawContent: string;
  summary: string;
  objections: string[];
  blockers: string[];
  nextAction: string;
  nextFollowTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpInput {
  customerId: string;
  opportunityId?: string;
  method: FollowUpMethod;
  rawContent: string;
  summary?: string;
  nextAction?: string;
  nextFollowTime?: string;
}

export type TaskStatus = '待处理' | '已完成';
export type TaskSource = '手动' | '跟进生成' | '报价生成' | '订单生成' | '回款生成';

export interface SalesTask {
  id: string;
  team_id: string;
  customerId: string;
  opportunityId?: string;
  ownerUserId: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  source: TaskSource;
  relatedId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  customerId: string;
  opportunityId?: string;
  title: string;
  dueAt?: string;
  source?: TaskSource;
  relatedId?: string;
}

export type QuotationStatus = '草稿' | '已发送' | '客户确认';

export interface QuotationLineItem {
  id: string;
  productName: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  remark: string;
}

export interface Quotation {
  id: string;
  team_id: string;
  customerId: string;
  opportunityId?: string;
  version: number;
  status: QuotationStatus;
  productAmount: number;
  freightFee: number;
  installationFee: number;
  designFee: number;
  discountAmount: number;
  totalAmount: number;
  lineItems: QuotationLineItem[];
  feedback: string;
  createdAt: string;
  updatedAt?: string;
  copiedFromId?: string;
  confirmedAt?: string;
}

export interface CreateQuotationInput {
  customerId: string;
  opportunityId?: string;
  productName?: string;
  specification?: string;
  quantity?: number;
  unitPrice?: number;
  freightFee?: number;
  installationFee?: number;
  designFee?: number;
  discountAmount?: number;
  remark?: string;
  lineItems?: Array<{
    productName: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    remark?: string;
  }>;
}

export interface FileAsset {
  id: string;
  team_id: string;
  customerId: string;
  targetType: 'customer' | 'order';
  targetId: string;
  fileName: string;
  fileType: string;
  size: number;
  note: string;
  createdAt: string;
}

export interface CustomerTimelineEvent {
  id: string;
  team_id: string;
  customerId: string;
  opportunityId?: string;
  type: 'follow_up' | 'task' | 'quotation' | 'order' | 'payment' | 'file';
  title: string;
  detail: string;
  occurredAt: string;
  relatedId: string;
}

export type OrderStatus = '待收定金' | '生产/备货中' | '待尾款' | '已完成';

export interface ReceivableNode {
  id: string;
  title: string;
  plannedAmount: number;
  receivedAmount: number;
  dueAt: string;
  status: '待收款' | '部分收款' | '已收款';
}

export interface PaymentRecord {
  id: string;
  nodeId: string;
  amount: number;
  paidAt: string;
  method: string;
  note: string;
}

export interface SalesOrder {
  id: string;
  team_id: string;
  customerId: string;
  opportunityId?: string;
  quotationId: string;
  orderAmount: number;
  status: OrderStatus;
  receivableNodes: ReceivableNode[];
  payments: PaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  quotationId: string;
  depositAmount: number;
  finalPaymentAmount: number;
  depositDueAt?: string;
  finalDueAt?: string;
}

export interface CreatePaymentInput {
  orderId: string;
  nodeId: string;
  amount: number;
  method?: string;
  note?: string;
}
