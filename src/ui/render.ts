import { createWorkspace, developmentLogin, getSession, hasAnyWorkspace } from '../api/devAuth.js';
import { DEFAULT_SHELF_CONFIG } from '../domain/defaultConfig.js';
import type { SessionContext, UserRoleCode, WorkspaceKind } from '../domain/models.js';
import { MOBILE_ENTRIES, WEB_MODULES } from './modules.js';

const CONFIG_LABELS: Record<keyof typeof DEFAULT_SHELF_CONFIG, string> = {
  customerStages: '客户阶段',
  customerSources: '客户来源',
  riskTags: '风险标签',
  taskTypes: '任务类型',
  quotationFeeItems: '报价费用项',
  fileTypes: '文件类型',
  storeTypes: '门店类型',
  shelfProductCategories: '货架产品类目',
};

export function renderApp(root: HTMLElement): void {
  const session = getSession();

  if (session) {
    renderShell(root, session);
    return;
  }

  if (hasAnyWorkspace()) {
    renderOnboarding(root);
    return;
  }

  renderLogin(root);
}

function renderLogin(root: HTMLElement): void {
  root.innerHTML = `
    <div class="login-page">
      <section class="login-card premium-card">
        <div class="login-badge">MVP-A 基础版 · 货架销售场景</div>
        <h1>货架客户 CRM</h1>
        <p class="lead">为便利店、超市和仓储货架项目打造的轻量客户跟进工作台。</p>
        <div class="login-highlights" aria-label="产品能力预览">
          <span>团队空间</span>
          <span>跟进提醒</span>
          <span>报价链路</span>
        </div>
        <div class="tabs" aria-label="登录方式占位">
          <button type="button">密码登录</button>
          <button type="button">验证码登录</button>
          <button type="button">微信登录</button>
          <button type="button">企微登录</button>
        </div>
        <label>
          手机号 / 邮箱
          <input placeholder="生产认证入口将在后续接入" disabled>
        </label>
        <label>
          密码
          <input placeholder="当前阶段不启用真实密码" type="password" disabled>
        </label>
        <button id="dev-login" type="button" class="primary">使用开发账号进入</button>
        <small>开发占位认证仅用于本地验证，不包含生产硬编码凭据。</small>
      </section>
    </div>
  `;

  document.getElementById('dev-login')?.addEventListener('click', () => {
    developmentLogin();
    renderOnboarding(root);
  });
}

// 第 1 阶段保持轻量单屏引导；后续任务可再拆分为真正的多步骤流程。
function renderOnboarding(root: HTMLElement): void {
  root.innerHTML = `
    <div class="onboarding">
      <div class="panel onboarding-panel premium-card">
        <div class="login-badge">首次使用引导</div>
        <h1>先搭好你的货架销售工作台</h1>
        <p class="lead">选择工作空间和角色后，系统会预置货架行业常用阶段、风险标签与任务类型。</p>
        <div class="onboarding-section">
          <h2>选择工作空间</h2>
          <div class="choice" data-group="kind">
            <button type="button" class="selected" data-value="personal">个人工作空间</button>
            <button type="button" data-value="team">小团队工作空间</button>
          </div>
        </div>
        <div class="onboarding-section">
          <h2>确认你的角色</h2>
          <div class="choice" data-group="role">
            <button type="button" class="selected" data-value="owner">老板/负责人</button>
            <button type="button" data-value="sales">销售成员</button>
            <button type="button" data-value="admin">管理员</button>
          </div>
        </div>
        <div class="onboarding-section">
          <h2>默认货架行业配置</h2>
          <div class="config-list">
            ${Object.entries(DEFAULT_SHELF_CONFIG)
              .map(
                ([key, values]) => `
                  <div>
                    <strong>${CONFIG_LABELS[key as keyof typeof DEFAULT_SHELF_CONFIG]}</strong>
                    <span>${values.length} 项</span>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>
        <div class="first-customer">
          后续任务将接入首个客户创建，例如“80㎡便利店货架”；本次仅完成基础界面和工作空间准备。
        </div>
        <button id="finish" type="button" class="primary">完成设置，进入工作台</button>
      </div>
    </div>
  `;

  let kind: WorkspaceKind = 'personal';
  let role: UserRoleCode = 'owner';

  root.querySelectorAll<HTMLButtonElement>('.choice button').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.parentElement?.getAttribute('data-group');
      button.parentElement?.querySelectorAll('button').forEach((sibling) => sibling.classList.remove('selected'));
      button.classList.add('selected');

      if (group === 'kind') {
        kind = button.dataset.value as WorkspaceKind;
      }

      if (group === 'role') {
        role = button.dataset.value as UserRoleCode;
      }
    });
  });

  document.getElementById('finish')?.addEventListener('click', () => {
    createWorkspace(kind, role);
    renderApp(root);
  });
}

function renderShell(root: HTMLElement, session: SessionContext): void {
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">架</span>
          <div>
            <strong>货架客户 CRM</strong>
            <small>销售跟进基础版</small>
          </div>
        </div>
        <div class="workspace">
          <span>当前工作空间</span>
          <strong>${session.currentTeam.name}</strong>
          <em>${session.role.name}</em>
        </div>
        <nav aria-label="网页端主模块">
          ${WEB_MODULES.map((moduleItem, index) => `<a class="${index === 0 ? 'active' : ''}">${moduleItem.name}</a>`).join('')}
        </nav>
      </aside>
      <main class="main">
        <header class="page-header">
          <div>
            <p>MVP-A 基础版</p>
            <h1>今天工作台</h1>
            <span>先把登录、工作空间、默认配置和团队隔离打牢，后续再接入真实业务链路。</span>
          </div>
          <div class="user">👤 ${session.user.name}</div>
        </header>
        <section class="hero">
          <div>
            <span class="section-label">基础能力已就绪</span>
            <h2>为货架销售团队准备的轻量起步工作台</h2>
            <p>当前阶段仅展示产品框架、移动端入口和行业默认配置，不写入客户、报价、订单或回款业务数据。</p>
          </div>
          <div class="hero-panel">
            <strong>下一步</strong>
            <span>客户管理模块将在后续任务接入</span>
          </div>
        </section>
        <section class="cards" aria-label="基础概览">
          <div><strong>10</strong><span>网页端主模块占位</span></div>
          <div><strong>5</strong><span>移动端底部入口</span></div>
          <div><strong>${Object.keys(DEFAULT_SHELF_CONFIG).length}</strong><span>行业默认配置组</span></div>
        </section>
        <section class="placeholder-grid">
          ${WEB_MODULES.map(
            (moduleItem) => `
              <article>
                <span>${moduleItem.accent}</span>
                <h3>${moduleItem.name}</h3>
                <p>${moduleItem.summary}</p>
              </article>
            `,
          ).join('')}
        </section>
      </main>
      <nav class="bottom-nav" aria-label="移动端底部入口">
        ${MOBILE_ENTRIES.map(
          (entry, index) => `<a class="${index === 3 ? 'add' : ''}">${index === 3 ? '⊕ ' : ''}<span>${entry}</span></a>`,
        ).join('')}
      </nav>
    </div>
  `;
}
