import { createWorkspace, developmentLogin, getSession, hasAnyWorkspace } from '../api/devAuth.js';
import { DEFAULT_SHELF_CONFIG } from '../domain/defaultConfig.js';
import type { SessionContext, UserRoleCode, WorkspaceKind } from '../domain/models.js';
import { MOBILE_ENTRIES, WEB_MODULES } from './modules.js';

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
      <section class="login-card">
        <p class="eyebrow">MVP-A · Shelf Sales CRM</p>
        <h1>货架客户 CRM</h1>
        <p>面向便利店、超市、仓储货架销售的小团队客户管理基础。</p>
        <div class="tabs" aria-label="登录方式占位">
          <button type="button">密码登录</button>
          <button type="button">验证码占位</button>
          <button type="button">微信占位</button>
          <button type="button">企微占位</button>
        </div>
        <label>
          手机号 / 邮箱
          <input placeholder="未来生产认证入口" disabled>
        </label>
        <label>
          密码
          <input placeholder="Task 01 不启用真实密码" type="password" disabled>
        </label>
        <button id="dev-login" type="button" class="primary">使用开发登录进入</button>
        <small>开发占位认证仅用于 MVP-A 本地验证，不包含生产硬编码凭据。</small>
      </section>
    </div>
  `;

  document.getElementById('dev-login')?.addEventListener('click', () => {
    developmentLogin();
    renderOnboarding(root);
  });
}

// Task 01 keeps onboarding intentionally compact; later tasks can split this into a true multi-step flow.
function renderOnboarding(root: HTMLElement): void {
  root.innerHTML = `
    <div class="onboarding">
      <div class="panel">
        <p class="eyebrow">首次进入设置</p>
        <h1>创建你的工作空间</h1>
        <h2>选择工作空间</h2>
        <div class="choice" data-group="kind">
          <button type="button" class="selected" data-value="personal">个人工作空间</button>
          <button type="button" data-value="team">团队工作空间占位</button>
        </div>
        <h2>确认你的角色</h2>
        <div class="choice" data-group="role">
          <button type="button" class="selected" data-value="owner">老板</button>
          <button type="button" data-value="sales">销售</button>
          <button type="button" data-value="admin">管理员</button>
        </div>
        <h2>默认货架行业配置</h2>
        <div class="config-list">
          ${Object.entries(DEFAULT_SHELF_CONFIG)
            .map(([key, values]) => `<div><strong>${key}</strong><span>${values.length} 项默认值</span></div>`)
            .join('')}
        </div>
        <div class="first-customer">
          下一步将提示创建首个客户（例如“80㎡便利店货架”），完整客户管理由 Task 02 实现。
        </div>
        <button id="finish" type="button" class="primary">确认并进入工作台</button>
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
        <div class="brand">▦ 货架客户 CRM</div>
        <div class="workspace">
          当前工作空间<br>
          <strong>${session.currentTeam.name}</strong>
          <span>${session.role.name}</span>
        </div>
        <nav aria-label="Web 主模块">
          ${WEB_MODULES.map((moduleName, index) => `<a class="${index === 0 ? 'active' : ''}">${moduleName}</a>`).join('')}
        </nav>
      </aside>
      <main class="main">
        <header>
          <div>
            <p>MVP-A Foundation</p>
            <h1>今天工作台</h1>
          </div>
          <div class="user">👤 ${session.user.name}</div>
        </header>
        <section class="hero">
          <h2>基础已就绪，后续任务将接入真实业务对象</h2>
          <p>本 PR 只提供登录、工作空间、首登引导、默认配置、团队隔离与模块壳，不实现客户/AI/报价/订单。</p>
          <div class="cards">
            <div>🏠 10 个 Web 主模块</div>
            <div>📱 5 个移动底部入口</div>
            <div>⚙️ 货架行业默认配置</div>
          </div>
        </section>
        <section class="placeholder-grid">
          ${WEB_MODULES.map(
            (moduleName) => `
              <article>
                <h3>${moduleName}</h3>
                <p>Task 01 placeholder route area. Detailed business logic will be implemented in later issues.</p>
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
