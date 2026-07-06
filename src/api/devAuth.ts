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
} from '../domain/models.js';

const STORAGE_KEY = 'shelf-crm-foundation-state-v2';

interface FoundationState {
  user?: User;
  teams: Team[];
  roles: Role[];
  members: TeamMember[];
  configs: WorkspaceConfig[];
  onboarding: OnboardingProgress[];
  logs: OperationLog[];
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
  };
}

function loadState(): FoundationState {
  if (typeof localStorage === 'undefined') {
    return emptyState();
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : emptyState();
}

function saveState(state: FoundationState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function createWorkspaceRoles(team_id: string): Role[] {
  return [
    {
      id: createId('role'),
      team_id,
      code: 'owner',
      name: '老板/负责人',
      description: 'Owns workspace and can review all MVP-A foundation data.',
      permissions: ['workspace:read', 'workspace:write', 'settings:read', 'settings:write'],
    },
    {
      id: createId('role'),
      team_id,
      code: 'sales',
      name: '销售',
      description: 'Handles customers and follow-ups in future tasks.',
      permissions: ['workspace:read'],
    },
    {
      id: createId('role'),
      team_id,
      code: 'admin',
      name: '管理员',
      description: 'Maintains settings and team basics.',
      permissions: ['workspace:read', 'settings:read'],
    },
  ];
}

export function developmentLogin(): User {
  const state = loadState();

  if (!state.user) {
    state.user = {
      id: 'dev_user',
      name: 'MVP-A Development User',
      isDevelopmentUser: true,
      createdAt: now(),
    };

    state.logs.push({
      id: createId('log'),
      team_id: 'system',
      actorUserId: state.user.id,
      action: 'dev_login_created',
      targetType: 'user',
      createdAt: now(),
    });

    saveState(state);
  }

  return state.user;
}

export function createWorkspace(kind: WorkspaceKind, roleCode: UserRoleCode): SessionContext {
  const state = loadState();
  const user = state.user ?? developmentLogin();
  const team: Team = {
    id: createId('team'),
    name: kind === 'personal' ? '我的货架客户工作台' : '货架销售团队工作台',
    kind,
    ownerUserId: user.id,
    createdAt: now(),
  };
  const roles = createWorkspaceRoles(team.id);
  const role = roles.find((candidate) => candidate.code === roleCode) ?? roles[0];
  const member: TeamMember = {
    id: createId('member'),
    team_id: team.id,
    userId: user.id,
    roleId: role.id,
    displayName: user.name,
    joinedAt: now(),
  };
  const onboarding: OnboardingProgress = {
    id: createId('onboard'),
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
    id: createId('log'),
    team_id: team.id,
    actorUserId: user.id,
    action: 'workspace_created_with_defaults',
    targetType: 'team',
    targetId: team.id,
    createdAt: now(),
    metadata: { kind, roleCode },
  });

  saveState(state);

  const session = getSession();
  if (!session) {
    throw new Error('Failed to create development workspace session');
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
