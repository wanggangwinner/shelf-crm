import { createWorkspace, developmentLogin, getSession, hasAnyWorkspace } from '../api/devAuth.js';
import { DEFAULT_SHELF_CONFIG } from '../domain/defaultConfig.js';
import { createCustomer, findCustomerDuplicates, getCustomer, listCustomers, listOwnershipHistory, parseDemandPhrase, type CustomerCreateInput } from '../api/customers.js';
import type { Customer, CustomerDuplicateMatch, SessionContext, UserRoleCode, WorkspaceKind } from '../domain/models.js';
import { MOBILE_ENTRIES, WEB_MODULES } from './modules.js';

let activeModule = '工作台';
let pendingCustomerInput: CustomerCreateInput | undefined;
let pendingDuplicateMatches: CustomerDuplicateMatch[] = [];

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

function renderMainContent(session: SessionContext): string {
  if (activeModule === '客户管理') {
    return renderCustomerModule(session);
  }

  return renderWorkbench();
}

function renderWorkbench(): string {
  return `
    <section class="hero">
      <div>
        <span class="section-label">基础能力已就绪</span>
        <h2>为货架销售团队准备的轻量起步工作台</h2>
        <p>当前阶段仅展示产品框架、移动端入口和行业默认配置；客户模块已支持基础创建、查重和详情壳。</p>
      </div>
      <div class="hero-panel">
        <strong>下一步</strong>
        <span>客户管理模块已可创建客户，后续再接入跟进和 AI 提炼</span>
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
  `;
}

function renderCustomerModule(session: SessionContext): string {
  const customers = listCustomers(session);
  return `
    <section class="customer-module">
      <div class="module-heading">
        <div>
          <span class="section-label">客户模块基础版</span>
          <h2>客户管理</h2>
          <p>支持客户创建、列表、重复提醒、详情壳、顶部状态卡和归属历史。</p>
        </div>
        <button id="show-customer-form" type="button" class="secondary-action">新建客户</button>
      </div>
      <div id="customer-form-panel" class="customer-form-panel ${customers.length ? 'collapsed' : ''}">
        ${renderDuplicateWarning()}
        ${renderCustomerForm(session)}
      </div>
      <div class="customer-list">
        ${customers.length ? customers.map(renderCustomerRow).join('') : renderEmptyCustomers()}
      </div>
      <div id="customer-detail-root"></div>
    </section>
  `;
}

function renderDuplicateWarning(): string {
  if (!pendingDuplicateMatches.length) return '';
  return `
    <div class="duplicate-warning">
      <strong>发现可能重复的客户</strong>
      <p>系统仅在当前团队内查重。你可以取消返回列表，或确认仍然创建新客户。</p>
      ${pendingDuplicateMatches
        .map(
          (match) => `
            <div class="duplicate-item">
              <span>${match.customer.name} · ${match.customer.city || '未填写城市'}</span>
              <em>${match.reasons.join('、')}</em>
            </div>
          `,
        )
        .join('')}
      <div class="duplicate-actions">
        <button id="cancel-duplicate-create" type="button">取消创建</button>
        <button id="confirm-duplicate-create" type="button">仍然创建</button>
      </div>
    </div>
  `;
}

function renderCustomerForm(session: SessionContext): string {
  const config = DEFAULT_SHELF_CONFIG;
  const values = pendingCustomerInput;
  return `
    <form id="customer-create-form" class="customer-form">
      <div class="quick-phrase">
        <label>需求一句话快捷识别
          <input id="quick-demand" placeholder="例如：80㎡便利店货架" value="${values?.demandText ?? ''}">
        </label>
        <button id="apply-demand" type="button">识别面积/店铺类型</button>
      </div>
      <div class="form-grid">
        ${inputField('客户名称', 'name', values?.name ?? '', true)}
        ${inputField('联系人', 'contactName', values?.contactName ?? '')}
        ${inputField('手机号', 'phone', values?.phone ?? '')}
        ${inputField('微信号', 'wechat', values?.wechat ?? '')}
        ${inputField('城市/区域', 'city', values?.city ?? '')}
        ${inputField('详细地址', 'address', values?.address ?? '')}
        ${selectField('店铺类型', 'storeType', config.storeTypes, values?.storeType ?? '')}
        ${inputField('店铺面积', 'storeArea', values?.storeArea ?? '')}
        ${selectField('客户来源', 'source', config.customerSources, values?.source ?? config.customerSources[0])}
        ${inputField('下次跟进时间', 'nextFollowTime', values?.nextFollowTime ?? '', false, 'datetime-local')}
      </div>
      <label>需求一句话
        <textarea name="demandText" placeholder="例如：80㎡便利店货架，需要靠墙主货架和收银台">${values?.demandText ?? ''}</textarea>
      </label>
      <div class="form-actions">
        <span>负责人：${session.user.name}</span>
        <button type="submit" class="primary inline-primary">保存客户</button>
      </div>
    </form>
  `;
}

function inputField(label: string, name: string, value = '', required = false, type = 'text'): string {
  return `<label>${label}<input name="${name}" type="${type}" value="${value}" ${required ? 'required' : ''}></label>`;
}

function selectField(label: string, name: string, options: readonly string[], selected: string): string {
  return `<label>${label}<select name="${name}">${options
    .map((option) => `<option value="${option}" ${option === selected ? 'selected' : ''}>${option}</option>`)
    .join('')}</select></label>`;
}

function renderCustomerRow(customer: Customer): string {
  return `
    <button type="button" class="customer-row" data-customer-id="${customer.id}">
      <strong>${customer.name}</strong>
      <span>${customer.contactName || '未填写联系人'}</span>
      <span>${customer.phone || customer.wechat || '未填写电话/微信'}</span>
      <span>${customer.city || '未填写城市'}</span>
      <span>${customer.storeType || '未填写类型'}</span>
      <span>${customer.storeArea || '未填写面积'}</span>
      <span>${customer.stage}</span>
      <span>${customer.level}</span>
      <span>${customer.riskTags.length ? customer.riskTags.join('、') : '暂无风险'}</span>
      <span>${customer.nextFollowTime || '未设置'}</span>
      <span>${customer.latestFollowSummary}</span>
    </button>
  `;
}

function renderEmptyCustomers(): string {
  return `<div class="empty-state"><strong>暂无客户</strong><p>先创建一个客户，例如填写“80㎡便利店货架”。</p></div>`;
}

function renderCustomerDetail(session: SessionContext, customerId: string): void {
  const root = document.getElementById('customer-detail-root');
  const customer = getCustomer(session, customerId);
  if (!root || !customer) return;
  const histories = listOwnershipHistory(session, customerId);
  const overdue = customer.nextFollowTime ? new Date(customer.nextFollowTime).getTime() < Date.now() : false;
  root.innerHTML = `
    <aside class="customer-detail-panel">
      <div class="detail-header"><h2>${customer.name}</h2><button id="close-customer-detail" type="button">关闭</button></div>
      <section class="status-card">
        <div><span>当前阶段</span><strong>${customer.stage}</strong></div>
        <div><span>客户等级</span><strong>${customer.level}</strong></div>
        <div><span>风险标签</span><strong>${customer.riskTags.length ? customer.riskTags.join('、') : '暂无'}</strong></div>
        <div><span>当前卡点</span><strong>待人工补充</strong></div>
        <div><span>下一步动作</span><strong>建议继续确认需求</strong></div>
        <div><span>下次跟进</span><strong>${customer.nextFollowTime || '未设置'}</strong></div>
        <div><span>是否逾期</span><strong>${overdue ? '已逾期' : '未逾期'}</strong></div>
        <div><span>报价未反馈</span><strong>暂无报价</strong></div>
        <div><span>待收款</span><strong>暂无应收</strong></div>
      </section>
      <section class="detail-section"><h3>基础信息</h3><p>${customer.contactName || '未填写联系人'} · ${customer.phone || customer.wechat || '未填写联系方式'} · ${customer.city || '未填写城市'}</p><p>${customer.address || '未填写地址'}</p></section>
      <section class="detail-section"><h3>需求摘要占位</h3><p>${customer.demandText || '暂未填写需求'}</p></section>
      <section class="detail-section"><h3>跟进时间线占位</h3><p>真实跟进记录将在后续任务接入。</p></section>
      <section class="detail-section"><h3>报价占位</h3><p>报价版本和反馈状态将在后续任务接入。</p></section>
      <section class="detail-section"><h3>订单/回款占位</h3><p>订单与回款节点将在后续任务接入。</p></section>
      <section class="detail-section"><h3>归属历史</h3>${histories
        .map((item) => `<p>${item.reason} · ${new Date(item.operatedAt).toLocaleString('zh-CN')}</p>`)
        .join('')}</section>
    </aside>
  `;
  document.getElementById('close-customer-detail')?.addEventListener('click', () => {
    root.innerHTML = '';
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
          ${WEB_MODULES.map((moduleItem) => `<a data-module="${moduleItem.name}" class="${moduleItem.name === activeModule ? 'active' : ''}">${moduleItem.name}</a>`).join('')}
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
${renderMainContent(session)}
      </main>
      <nav class="bottom-nav" aria-label="移动端底部入口">
        ${MOBILE_ENTRIES.map(
          (entry, index) => `<a class="${index === 3 ? 'add' : ''}">${index === 3 ? '⊕ ' : ''}<span>${entry}</span></a>`,
        ).join('')}
      </nav>
    </div>
  `;
  bindShellEvents(root, session);
}

function bindShellEvents(root: HTMLElement, session: SessionContext): void {
  root.querySelectorAll<HTMLElement>('[data-module]').forEach((link) => {
    link.addEventListener('click', () => {
      activeModule = link.dataset.module ?? '工作台';
      pendingCustomerInput = undefined;
      pendingDuplicateMatches = [];
      renderShell(root, session);
    });
  });

  document.getElementById('show-customer-form')?.addEventListener('click', () => {
    document.getElementById('customer-form-panel')?.classList.toggle('collapsed');
  });

  document.getElementById('apply-demand')?.addEventListener('click', () => {
    const phrase = (document.getElementById('quick-demand') as HTMLInputElement | null)?.value ?? '';
    const parsed = parseDemandPhrase(phrase);
    const form = document.getElementById('customer-create-form') as HTMLFormElement | null;
    if (!form) return;
    const demand = form.elements.namedItem('demandText') as HTMLTextAreaElement | null;
    const area = form.elements.namedItem('storeArea') as HTMLInputElement | null;
    const storeType = form.elements.namedItem('storeType') as HTMLSelectElement | null;
    if (demand) demand.value = parsed.demandText;
    if (area && parsed.storeArea) area.value = parsed.storeArea;
    if (storeType && parsed.storeType) storeType.value = parsed.storeType;
  });

  document.getElementById('customer-create-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const input: CustomerCreateInput = {
      name: String(data.get('name') ?? ''),
      contactName: String(data.get('contactName') ?? ''),
      phone: String(data.get('phone') ?? ''),
      wechat: String(data.get('wechat') ?? ''),
      city: String(data.get('city') ?? ''),
      address: String(data.get('address') ?? ''),
      storeType: String(data.get('storeType') ?? ''),
      storeArea: String(data.get('storeArea') ?? ''),
      demandText: String(data.get('demandText') ?? ''),
      source: String(data.get('source') ?? ''),
      nextFollowTime: String(data.get('nextFollowTime') ?? ''),
    };
    pendingCustomerInput = input;
    pendingDuplicateMatches = findCustomerDuplicates(session, input);
    if (pendingDuplicateMatches.length) {
      renderShell(root, session);
      return;
    }
    createCustomer(session, input);
    pendingCustomerInput = undefined;
    renderShell(root, session);
  });

  document.getElementById('cancel-duplicate-create')?.addEventListener('click', () => {
    pendingCustomerInput = undefined;
    pendingDuplicateMatches = [];
    renderShell(root, session);
  });

  document.getElementById('confirm-duplicate-create')?.addEventListener('click', () => {
    if (pendingCustomerInput) {
      createCustomer(session, pendingCustomerInput, { ignoreDuplicateWarning: true });
    }
    pendingCustomerInput = undefined;
    pendingDuplicateMatches = [];
    renderShell(root, session);
  });

  root.querySelectorAll<HTMLElement>('[data-customer-id]').forEach((row) => {
    row.addEventListener('click', () => renderCustomerDetail(session, row.dataset.customerId ?? ''));
  });
}
