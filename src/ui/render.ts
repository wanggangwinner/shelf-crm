import {
  createCustomer,
  listCustomerOwnershipHistory,
  listCustomers,
  parseCustomerSignals,
} from '../api/customers.js';
import { createWorkspace, developmentLogin, getSession, hasAnyWorkspace } from '../api/devAuth.js';
import { createFollowUp, generateFollowUpAiDraft, listFollowUps } from '../api/followUps.js';
import { bindFileAsset, listFileAssets } from '../api/fileAssets.js';
import { listCustomerTimeline } from '../api/customerTimeline.js';
import { getMvpDashboard } from '../api/mvpFlow.js';
import { DEFAULT_SHELF_CONFIG } from '../domain/defaultConfig.js';
import type {
  CreateCustomerInput,
  Customer,
  CustomerDuplicateMatch,
  FollowUpMethod,
  FollowUpRecord,
  SessionContext,
  UserRoleCode,
  WorkspaceKind,
} from '../domain/models.js';
import { bindMvpPage, mvpPageTemplate, type MvpModuleName } from './mvpPages.js';
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

type ActiveModule = '工作台' | '客户管理' | MvpModuleName;

interface CustomerPageState {
  message?: string;
  error?: string;
  followUpError?: string;
  form?: CreateCustomerInput;
  duplicates?: CustomerDuplicateMatch[];
  selectedCustomerId?: string;
}

function isMvpModule(value: string | undefined): value is MvpModuleName {
  return value === '任务提醒' || value === '报价管理' || value === '订单/回款';
}

export function renderApp(root: HTMLElement): void {
  const session = getSession();
  if (session) {
    renderShell(root, session, '工作台');
    return;
  }
  if (hasAnyWorkspace()) {
    renderOnboarding(root);
    return;
  }
  renderLogin(root);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderLogin(root: HTMLElement): void {
  root.innerHTML = `
    <div class="login-page">
      <section class="login-card premium-card">
        <div class="login-badge">MVP-A 基础版 · 货架销售场景</div>
        <h1>货架客户 CRM</h1>
        <p class="lead">从客户录入、跟进、任务、报价、订单到回款的一体化销售工作台。</p>
        <div class="login-highlights"><span>客户管理</span><span>任务提醒</span><span>报价回款</span></div>
        <label>手机号 / 邮箱<input placeholder="生产认证入口将在后续接入" disabled></label>
        <label>密码<input placeholder="当前阶段不启用真实密码" type="password" disabled></label>
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
            ${Object.entries(DEFAULT_SHELF_CONFIG).map(([key, values]) => `
              <div><strong>${CONFIG_LABELS[key as keyof typeof DEFAULT_SHELF_CONFIG]}</strong><span>${values.length} 项</span></div>
            `).join('')}
          </div>
        </div>
        <div class="first-customer">完成设置后，可按真实销售流程录入客户、写跟进、生成任务、报价、订单和回款。</div>
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
      if (group === 'kind') kind = button.dataset.value as WorkspaceKind;
      if (group === 'role') role = button.dataset.value as UserRoleCode;
    });
  });
  document.getElementById('finish')?.addEventListener('click', () => {
    createWorkspace(kind, role);
    renderApp(root);
  });
}

function renderShell(root: HTMLElement, session: SessionContext, activeModule: ActiveModule, pageState: CustomerPageState = {}): void {
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">架</span><div><strong>货架客户 CRM</strong><small>MVP-A 主链路版</small></div></div>
        <div class="workspace"><span>当前工作空间</span><strong>${escapeHtml(session.currentTeam.name)}</strong><em>${escapeHtml(session.role.name)}</em></div>
        <nav aria-label="网页端主模块">
          ${WEB_MODULES.map((moduleItem) => `
            <a class="${moduleItem.name === activeModule ? 'active' : ''}" data-module="${escapeHtml(moduleItem.name)}">${escapeHtml(moduleItem.name)}</a>
          `).join('')}
        </nav>
      </aside>
      <main class="main">${mainTemplate(session, activeModule, pageState)}</main>
      <nav class="bottom-nav" aria-label="移动端底部入口">
        ${MOBILE_ENTRIES.map((entry, index) => `<a class="${index === 3 ? 'add' : ''}" data-mobile-entry="${entry}">${index === 3 ? '⊕ ' : ''}<span>${entry}</span></a>`).join('')}
      </nav>
    </div>
  `;

  root.querySelectorAll<HTMLAnchorElement>('[data-module]').forEach((link) => {
    link.addEventListener('click', () => {
      const moduleName = link.dataset.module;
      if (moduleName === '客户管理') renderShell(root, session, '客户管理');
      else if (isMvpModule(moduleName)) renderShell(root, session, moduleName);
      else renderShell(root, session, '工作台');
    });
  });

  root.querySelectorAll<HTMLAnchorElement>('[data-mobile-entry]').forEach((link) => {
    link.addEventListener('click', () => {
      const entry = link.dataset.mobileEntry;
      if (entry === '客户' || entry === '新增') renderShell(root, session, '客户管理');
      else if (entry === '任务') renderShell(root, session, '任务提醒');
      else renderShell(root, session, '工作台');
    });
  });

  if (activeModule === '客户管理') bindCustomerPage(root, session);
  if (isMvpModule(activeModule)) bindMvpPage(root, session, (moduleName) => renderShell(root, session, moduleName));
}

function mainTemplate(session: SessionContext, activeModule: ActiveModule, pageState: CustomerPageState): string {
  if (activeModule === '客户管理') return customerPageTemplate(session, pageState);
  if (isMvpModule(activeModule)) return mvpPageTemplate(session, activeModule);
  return dashboardTemplate(session);
}

function dashboardTemplate(session: SessionContext): string {
  const customers = listCustomers(session);
  const followUpCount = customers.reduce((total, customer) => total + listFollowUps(session, customer.id).length, 0);
  const dashboard = getMvpDashboard(session);

  return `
    <header class="page-header"><div><p>MVP-A 主链路版</p><h1>今天工作台</h1><span>客户、跟进、任务、报价、订单和回款已经接入为一条轻量业务链路。</span></div><div class="user">👤 ${escapeHtml(session.user.name)}</div></header>
    <section class="hero"><div><span class="section-label">业务闭环</span><h2>从线索到回款的一体化工作台</h2><p>先跑通真实货架销售流程，再集中验收和修 bug。</p></div><div class="hero-panel"><strong>${dashboard.pendingTasks}</strong><span>待处理任务</span></div></section>
    <section class="cards">
      <div><strong>${customers.length}</strong><span>客户</span></div>
      <div><strong>${followUpCount}</strong><span>跟进</span></div>
      <div><strong>${dashboard.quotations}</strong><span>报价</span></div>
      <div><strong>${dashboard.orders}</strong><span>订单</span></div>
      <div><strong>¥${dashboard.receivableAmount}</strong><span>应收</span></div>
      <div><strong>¥${dashboard.receivedAmount}</strong><span>已收</span></div>
    </section>
    <section class="placeholder-grid">${WEB_MODULES.map((moduleItem) => `<article><span>${escapeHtml(moduleItem.accent)}</span><h3>${escapeHtml(moduleItem.name)}</h3><p>${escapeHtml(moduleItem.summary)}</p></article>`).join('')}</section>
  `;
}

function customerPageTemplate(session: SessionContext, pageState: CustomerPageState): string {
  const customers = listCustomers(session);
  const selectedCustomer = customers.find((customer) => customer.id === pageState.selectedCustomerId) ?? customers[0];
  const form: Partial<CreateCustomerInput> = pageState.form ?? {};
  const parsedDemand = parseCustomerSignals(form.demandText ?? '');

  return `
    <header class="page-header"><div><p>客户管理</p><h1>客户资料与快速录入</h1><span>支持需求短语解析、手机号提取、重复客户拦截、资料完整度和跟进记录。</span></div><div class="user">👤 ${escapeHtml(session.user.name)}</div></header>
    <section class="cards customer-kpis">
      <div><strong>${customers.length}</strong><span>当前客户数</span></div>
      <div><strong>${customers.filter((customer) => getCompletenessStatus(customer) === '待补充资料').length}</strong><span>待补充资料</span></div>
      <div><strong>${customers.reduce((total, customer) => total + listFollowUps(session, customer.id).length, 0)}</strong><span>跟进记录</span></div>
    </section>
    <section class="customer-layout">
      <article class="customer-form-card">
        <div class="section-title"><div><span class="section-label">新增客户</span><h2>快速录入客户</h2></div><small>示例：80平方米 超市李总 电话：15955555555 内蒙古</small></div>
        ${pageState.message ? `<div class="notice success">${escapeHtml(pageState.message)}</div>` : ''}
        ${pageState.error ? `<div class="notice error">${escapeHtml(pageState.error)}</div>` : ''}
        ${pageState.duplicates?.length ? duplicateWarningTemplate(pageState.duplicates) : ''}
        <form id="customer-form" class="customer-form">
          <label>客户/项目名称 *<input name="name" value="${escapeHtml(form.name)}" placeholder="例如：临沂兰山便利店项目" required></label>
          <label>联系人<input name="contactName" value="${escapeHtml(form.contactName)}" placeholder="例如：李总"></label>
          <label>手机号<input id="phone" name="phone" value="${escapeHtml(form.phone ?? parsedDemand.phone)}" placeholder="例如：15955555555"></label>
          <label>微信号<input name="wechat" value="${escapeHtml(form.wechat)}" placeholder="例如：客户微信号"></label>
          <label>城市/区域<input name="city" value="${escapeHtml(form.city)}" placeholder="例如：内蒙古 / 临沂兰山"></label>
          <label>详细地址<input name="address" value="${escapeHtml(form.address)}" placeholder="例如：兰山区人民广场附近"></label>
          <label class="full">需求短语<input id="demand-text" name="demandText" value="${escapeHtml(form.demandText)}" placeholder="例如：80平方米 超市李总 电话：15955555555 内蒙古"></label>
          <div class="parse-preview"><span>识别面积：<strong id="parsed-area">${escapeHtml(parsedDemand.storeArea ?? '未识别')}</strong></span><span>识别店型：<strong id="parsed-store-type">${escapeHtml(parsedDemand.storeType ?? '未识别')}</strong></span><span>识别手机号：<strong id="parsed-phone">${escapeHtml(parsedDemand.phone ?? '未识别')}</strong></span><button id="parse-demand" type="button">解析并填充</button></div>
          <label>店铺类型<input id="store-type" name="storeType" value="${escapeHtml(form.storeType ?? parsedDemand.storeType)}" placeholder="例如：超市"></label>
          <label>面积<input id="store-area" name="storeArea" value="${escapeHtml(form.storeArea ?? parsedDemand.storeArea)}" placeholder="例如：80㎡"></label>
          <label class="full">客户来源<input name="source" value="${escapeHtml(form.source)}" placeholder="例如：手动录入 / 客户转介绍 / 同行介绍"></label>
          <div class="form-actions"><button type="submit" class="primary compact-primary">保存客户</button>${pageState.duplicates?.length ? '<button id="ignore-duplicate-create" type="button" class="secondary">确认仍然创建</button>' : ''}</div>
        </form>
      </article>
      <article class="customer-list-card"><div class="section-title"><div><span class="section-label">客户列表</span><h2>当前团队客户</h2></div><small>${customers.length} 条</small></div>${customers.length ? customerListTemplate(session, customers, selectedCustomer?.id) : emptyCustomerTemplate()}</article>
    </section>
    ${selectedCustomer ? customerDetailTemplate(session, selectedCustomer, pageState) : ''}
  `;
}

function duplicateWarningTemplate(duplicates: CustomerDuplicateMatch[]): string {
  return `<div class="notice warning"><strong>发现疑似重复客户，系统已暂时拦截创建。</strong><ul>${duplicates.map((match) => `<li>${escapeHtml(match.customer.name)}<span>${match.reasons.map((reason) => duplicateReasonLabel(reason)).join('、')}</span></li>`).join('')}</ul><p>确认不是同一个客户时，再点击“确认仍然创建”。</p></div>`;
}

function duplicateReasonLabel(reason: string): string {
  const labels: Record<string, string> = { phone: '手机号相同', wechat: '微信相同', name_city: '客户名称和城市相同', similar_address: '地址相似' };
  return labels[reason] ?? reason;
}

function customerListTemplate(session: SessionContext, customers: Customer[], selectedCustomerId?: string): string {
  return `<div class="customer-table">${customers.map((customer) => `<button type="button" class="customer-row ${customer.id === selectedCustomerId ? 'selected-row' : ''}" data-customer-id="${customer.id}"><strong>${escapeHtml(customer.name)}</strong><span>${escapeHtml(customer.city || '未填写区域')}</span><span>${escapeHtml(customer.storeArea || '未填面积')}</span><em>${escapeHtml(customer.stage)}</em><b>${listFollowUps(session, customer.id).length} 次跟进</b></button>`).join('')}</div>`;
}

function emptyCustomerTemplate(): string {
  return `<div class="empty-state"><strong>还没有客户</strong><p>先录入一个客户。注意：只有“李总/王总”这种名字不能保存为完整客户。</p></div>`;
}

function customerDetailTemplate(session: SessionContext, customer: Customer, pageState: CustomerPageState): string {
  const history = listCustomerOwnershipHistory(session, customer.id);
  const followUps = listFollowUps(session, customer.id);
  const timeline = listCustomerTimeline(session, customer.id);
  const files = listFileAssets(session, customer.id);
  const completenessStatus = getCompletenessStatus(customer);

  return `
    <section class="customer-detail-card">
      <div class="section-title"><div><span class="section-label">客户详情</span><h2>${escapeHtml(customer.name)}</h2></div><small>创建时间：${new Date(customer.createdAt).toLocaleString()}</small></div>
      <div class="status-card"><div><span>当前阶段</span><strong>${escapeHtml(customer.stage)}</strong></div><div><span>客户等级</span><strong>${escapeHtml(customer.level)}</strong></div><div><span>需求面积</span><strong>${escapeHtml(customer.storeArea || '未填写')}</strong></div><div><span>店铺类型</span><strong>${escapeHtml(customer.storeType || '未填写')}</strong></div><div class="${completenessStatus === '资料完整' ? 'complete' : 'incomplete'}"><span>资料状态</span><strong>${completenessStatus}</strong></div></div>
      <div class="detail-grid"><div><span>联系人</span><strong>${escapeHtml(customer.contactName || '未填写')}</strong></div><div><span>手机号</span><strong>${escapeHtml(customer.phone || '未填写')}</strong></div><div><span>微信</span><strong>${escapeHtml(customer.wechat || '未填写')}</strong></div><div><span>城市/区域</span><strong>${escapeHtml(customer.city || '未填写')}</strong></div><div><span>详细地址</span><strong>${escapeHtml(customer.address || '未填写')}</strong></div><div><span>客户来源</span><strong>${escapeHtml(customer.source || '未填写')}</strong></div><div class="full"><span>需求描述</span><strong>${escapeHtml(customer.demandText || '未填写')}</strong></div></div>
      <div class="follow-up-panel"><div class="section-title"><div><span class="section-label">跟进记录</span><h2>新增跟进</h2></div><small>原始内容保留，系统生成辅助摘要和下一步建议。</small></div>${pageState.followUpError ? `<div class="notice error">${escapeHtml(pageState.followUpError)}</div>` : ''}<form id="follow-up-form" class="follow-up-form" data-customer-id="${customer.id}"><label>跟进方式<select name="method"><option value="微信">微信</option><option value="电话">电话</option><option value="面谈">面谈</option><option value="其他">其他</option></select></label><label class="full">原始跟进内容<textarea name="rawContent" rows="5" placeholder="粘贴微信聊天、电话记录或面谈纪要"></textarea></label><label class="full">手动摘要（可选）<input name="summary" placeholder="不填则由系统生成摘要"></label><label class="full">下一步动作（可选）<input name="nextAction" placeholder="不填则由系统建议下一步"></label><button type="submit" class="primary compact-primary">保存跟进记录</button></form></div>
      <div class="follow-up-list"><h3>历史跟进</h3>${followUps.length ? followUps.map(followUpTemplate).join('') : '<p class="muted">暂无跟进记录</p>'}</div>
      <div class="follow-up-panel"><div class="section-title"><div><span class="section-label">资料文件</span><h2>轻量文件绑定</h2></div><small>本地 MVP 仅保存文件元数据和业务关联，不上传文件内容。</small></div><form id="file-binding-form" class="follow-up-form" data-customer-id="${customer.id}"><label class="full">选择文件<input name="file" type="file"></label><label class="full">备注<input name="note" placeholder="例如：现场照片、尺寸图、合同扫描件"></label><button type="submit" class="primary compact-primary">绑定文件</button></form>${files.length ? `<div class="mvp-list">${files.map((file) => `<div class="mvp-item"><div><strong>${escapeHtml(file.fileName)}</strong><span>${escapeHtml(file.note || file.fileType)}</span></div></div>`).join('')}</div>` : '<p class="muted">暂无绑定文件</p>'}</div>
      <div class="follow-up-list"><h3>业务时间线</h3>${timeline.length ? timeline.map((event) => `<article class="follow-up-item"><div class="follow-up-head"><strong>${escapeHtml(event.title)}</strong><span>${new Date(event.occurredAt).toLocaleString()}</span></div><p>${escapeHtml(event.detail)}</p></article>`).join('') : '<p class="muted">暂无业务事件</p>'}</div>
      <div class="ownership-history"><h3>客户归属历史</h3>${history.length ? history.map((record) => `<div><strong>${record.changeType === 'created' ? '创建客户' : escapeHtml(record.changeType)}</strong><span>${escapeHtml(record.reason)} · ${new Date(record.operatedAt).toLocaleString()}</span></div>`).join('') : '<p>暂无归属记录</p>'}</div>
    </section>
  `;
}

function followUpTemplate(followUp: FollowUpRecord): string {
  return `<article class="follow-up-item"><div class="follow-up-head"><strong>${escapeHtml(followUp.method)}跟进</strong><span>${new Date(followUp.createdAt).toLocaleString()}</span></div><p><b>摘要：</b>${escapeHtml(followUp.summary || '未生成摘要')}</p><p><b>下一步：</b>${escapeHtml(followUp.nextAction || '未填写')}</p>${followUp.objections.length ? `<p><b>异议：</b>${followUp.objections.map(escapeHtml).join('、')}</p>` : ''}${followUp.blockers.length ? `<p><b>阻碍：</b>${followUp.blockers.map(escapeHtml).join('、')}</p>` : ''}<details><summary>查看原始沟通内容</summary><pre>${escapeHtml(followUp.rawContent)}</pre></details></article>`;
}

function bindCustomerPage(root: HTMLElement, session: SessionContext): void {
  const form = root.querySelector<HTMLFormElement>('#customer-form');
  const followUpForm = root.querySelector<HTMLFormElement>('#follow-up-form');
  const fileBindingForm = root.querySelector<HTMLFormElement>('#file-binding-form');
  const demandInput = root.querySelector<HTMLInputElement>('#demand-text');
  const storeTypeInput = root.querySelector<HTMLInputElement>('#store-type');
  const storeAreaInput = root.querySelector<HTMLInputElement>('#store-area');
  const phoneInput = root.querySelector<HTMLInputElement>('#phone');

  root.querySelectorAll<HTMLButtonElement>('[data-customer-id]').forEach((button) => button.addEventListener('click', () => renderShell(root, session, '客户管理', { selectedCustomerId: button.dataset.customerId })));
  document.getElementById('parse-demand')?.addEventListener('click', () => {
    const parsed = parseCustomerSignals(demandInput?.value ?? '');
    if (storeTypeInput && !storeTypeInput.value && parsed.storeType) storeTypeInput.value = parsed.storeType;
    if (storeAreaInput && !storeAreaInput.value && parsed.storeArea) storeAreaInput.value = parsed.storeArea;
    if (phoneInput && !phoneInput.value && parsed.phone) phoneInput.value = parsed.phone;
    const areaPreview = document.getElementById('parsed-area');
    const typePreview = document.getElementById('parsed-store-type');
    const phonePreview = document.getElementById('parsed-phone');
    if (areaPreview) areaPreview.textContent = parsed.storeArea ?? '未识别';
    if (typePreview) typePreview.textContent = parsed.storeType ?? '未识别';
    if (phonePreview) phonePreview.textContent = parsed.phone ?? '未识别';
  });

  if (form) {
    const collectInput = (): CreateCustomerInput => {
      const formData = new FormData(form);
      return { name: String(formData.get('name') ?? ''), contactName: String(formData.get('contactName') ?? ''), phone: String(formData.get('phone') ?? ''), wechat: String(formData.get('wechat') ?? ''), city: String(formData.get('city') ?? ''), address: String(formData.get('address') ?? ''), demandText: String(formData.get('demandText') ?? ''), storeType: String(formData.get('storeType') ?? ''), storeArea: String(formData.get('storeArea') ?? ''), source: String(formData.get('source') ?? '') };
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = collectInput();
      const validationError = validateCustomerInput(input);
      if (validationError) { renderShell(root, session, '客户管理', { form: input, error: validationError }); return; }
      const result = createCustomer(session, input);
      if (result.blockedByDuplicates) { renderShell(root, session, '客户管理', { form: input, duplicates: result.duplicates }); return; }
      renderShell(root, session, '客户管理', { message: '客户已保存', selectedCustomerId: result.customer?.id });
    });
    document.getElementById('ignore-duplicate-create')?.addEventListener('click', () => {
      const input = { ...collectInput(), ignoreDuplicateWarning: true };
      const result = createCustomer(session, input);
      renderShell(root, session, '客户管理', { message: '已忽略重复提醒并创建客户', selectedCustomerId: result.customer?.id });
    });
  }

  followUpForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerId = followUpForm.dataset.customerId ?? '';
    const formData = new FormData(followUpForm);
    const rawContent = String(formData.get('rawContent') ?? '');
    const draft = generateFollowUpAiDraft(rawContent);
    const result = createFollowUp(session, { customerId, method: String(formData.get('method') ?? '微信') as FollowUpMethod, rawContent, summary: String(formData.get('summary') ?? '') || draft.summary, nextAction: String(formData.get('nextAction') ?? '') || draft.nextAction });
    if (result.error) { renderShell(root, session, '客户管理', { selectedCustomerId: customerId, followUpError: result.error }); return; }
    renderShell(root, session, '客户管理', { selectedCustomerId: customerId, message: '跟进记录已保存' });
  });
  fileBindingForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerId = fileBindingForm.dataset.customerId ?? '';
    const data = new FormData(fileBindingForm);
    const file = data.get('file');
    const result = file instanceof File ? bindFileAsset(session, { customerId, targetType: 'customer', targetId: customerId, fileName: file.name, fileType: file.type, size: file.size, note: String(data.get('note') ?? '') }) : { error: '请选择文件。' };
    if (result.error) { renderShell(root, session, '客户管理', { selectedCustomerId: customerId, followUpError: result.error }); return; }
    renderShell(root, session, '客户管理', { selectedCustomerId: customerId, message: '文件已绑定到客户。' });
  });
}

function validateCustomerInput(input: CreateCustomerInput): string | undefined {
  if (!input.name.trim()) return '请先填写客户/项目名称。';
  if (!hasUsableCustomerSignal(input)) return '客户信息不足，请至少填写手机号、微信、地址或明确需求。';
  return undefined;
}

function hasUsableCustomerSignal(input: CreateCustomerInput): boolean {
  const parsed = parseCustomerSignals(input.demandText ?? '');
  return Boolean(input.phone?.trim() || parsed.phone || input.wechat?.trim() || input.address?.trim() || isClearDemand(input.demandText ?? ''));
}

function isClearDemand(demandText: string): boolean {
  const parsed = parseCustomerSignals(demandText);
  const normalizedDemand = demandText.trim();
  return Boolean(parsed.storeArea || parsed.storeType || parsed.phone || (normalizedDemand.length >= 4 && /货架|陈列|便利店|超市|药店|仓库/.test(normalizedDemand)));
}

function getCompletenessStatus(customer: Customer): '资料完整' | '待补充资料' {
  return customer.phone || customer.wechat || customer.address || isClearDemand(customer.demandText) ? '资料完整' : '待补充资料';
}
