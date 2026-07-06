import { createWorkspaceConfig } from '../domain/defaultConfig.js';
import type {
  OnboardingProgress,
  OperationLog,
  Role,
  SessionContext,
  Team,
  TeamMember,
  User,
  UserRoleCode,
  WorkspaceConfig,
  WorkspaceKind,
  Customer,
  CustomerOwnershipHistory,
} from '../domain/models.js';

const STORAGE_KEY = 'shelf-crm-foundation-state-v2';
const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';

interface FoundationState {
  user?: User;
  teams: Team[];
  roles: Role[];
  members: TeamMember[];
  configs: WorkspaceConfig[];
  onboarding: OnboardingProgress[];
  logs: OperationLog[];
  customers: Customer[];
  ownershipHistory: CustomerOwnershipHistory[];
  currentTeamId?: string;
}

function emptyState(): FoundationState {
  return {
    teams: [],
    roles: [],
    members: [],
    configs: [],
    onboarding: [],
    logs: [],
    customers: [],
    ownershipHistory: [],
  };
}

function loadState(): FoundationState {
  if (typeof localStorage === 'undefined') {
    return emptyState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  return {
    ...emptyState(),
    ...JSON.parse(raw),
  };
}

export function saveDevelopmentState(state: FoundationState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDevelopmentState(): FoundationState {
  return loadState();
}

export function appendOperationLog(
  state: FoundationState,
  session: SessionContext,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
): void {
  state.logs.push({
    id: createId(),
    team_id: session.currentTeam.id,
    actorUserId: session.user.id,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: now(),
  });
}

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (character) =>
    (Number(character) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))).toString(16),
  );
}

function createWorkspaceRoles(team_id: string): Role[] {
  return [
    {
      id: createId(),
      team_id,
      code: 'owner',
      name: '老板/负责人',
      description: '拥有工作空间，可查看和维护 MVP-A 基础数据。',
      permissions: ['workspace:read', 'workspace:write', 'settings:read', 'settings:write'],
    },
    {
      id: createId(),
      team_id,
      code: 'sales',
      name: '销售',
      description: '后续任务中负责客户和跟进工作。',
      permissions: ['workspace:read'],
    },
    {
      id: createId(),
      team_id,
      code: 'admin',
      name: '管理员',
      description: '维护基础设置和团队基础信息。',
      permissions: ['workspace:read', 'settings:read'],
    },
  ];
}

export function developmentLogin(): User {
  const state = loadState();

  if (!state.user) {
    state.user = {
      id: createId(),
      name: '开发测试用户',
      isDevelopmentUser: true,
      createdAt: now(),
    };

    state.logs.push({
      id: createId(),
      team_id: SYSTEM_TEAM_ID,
      actorUserId: state.user.id,
      action: 'dev_login_created',
      targetType: 'user',
      createdAt: now(),
    });

    saveDevelopmentState(state);
  }

  return state.user;
}

export function createWorkspace(kind: WorkspaceKind, roleCode: UserRoleCode): SessionContext {
  const state = loadState();
  const user = state.user ?? developmentLogin();
  const team: Team = {
    id: createId(),
    name: kind === 'personal' ? '我的货架客户工作台' : '货架销售团队工作台',
    kind,
    ownerUserId: user.id,
    createdAt: now(),
  };
  const roles = createWorkspaceRoles(team.id);
  const role = roles.find((candidate) => candidate.code === roleCode) ?? roles[0];
  const member: TeamMember = {
    id: createId(),
    team_id: team.id,
    userId: user.id,
    roleId: role.id,
    displayName: user.name,
    joinedAt: now(),
  };
  const onboarding: OnboardingProgress = {
    id: createId(),
    team_id: team.id,
    userId: user.id,
    workspaceChosen: true,
    roleConfirmed: true,
    defaultsReviewed: true,
    firstCustomerPrompted: true,
    completedAt: now(),
  };

  state.user = user;
  state.teams.push(team);
  state.roles.push(...roles);
  state.members.push(member);
  state.configs.push(createWorkspaceConfig(team.id));
  state.onboarding.push(onboarding);
  state.currentTeamId = team.id;
  state.logs.push({
    id: createId(),
    team_id: team.id,
    actorUserId: user.id,
    action: 'workspace_created_with_defaults',
    targetType: 'team',
    targetId: team.id,
    createdAt: now(),
    metadata: { kind, roleCode },
  });

  saveDevelopmentState(state);

  const session = getSession();
  if (!session) {
    throw new Error('创建开发工作空间会话失败');
  }

  return session;
}

export function getSession(): SessionContext | undefined {
  const state = loadState();

  if (!state.user || !state.currentTeamId) {
    return undefined;
  }

  const currentTeam = state.teams.find((team) => team.id === state.currentTeamId);
  const member = state.members.find(
    (candidate) => candidate.team_id === state.currentTeamId && candidate.userId === state.user?.id,
  );
  const role = member ? state.roles.find((candidate) => candidate.id === member.roleId) : undefined;

  if (!currentTeam || !member || !role) {
    return undefined;
  }

  return {
    user: state.user,
    currentTeam,
    member,
    role,
  };
}

export function getWorkspaceConfig(teamId: string): WorkspaceConfig | undefined {
  return loadState().configs.find((config) => config.team_id === teamId);
}

export function hasAnyWorkspace(): boolean {
  return loadState().teams.length > 0;
}

export function resetDevelopmentState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
