import { listCustomers } from '../api/customers.js';
import {
  completeTask,
  confirmQuotation,
  copyQuotationVersion,
  createQuotation,
  createTask,
  getMvpDashboard,
  listQuotations,
  listTasks,
  sendQuotation,
  voidQuotation,
} from '../api/mvpFlow.js';
import { recordCollection } from '../api/collectionFlow.js';
import { createOrderFromQuotation, listOrders } from '../api/orderFlow.js';
import type { Customer, Quotation, SalesOrder, SalesTask, SessionContext } from '../domain/models.js';

export type MvpModuleName = '任务提醒' | '报价管理' | '订单/回款';
let pageError = '';

function errorNotice(): string {
  return pageError ? `<div class="notice error" role="alert">${escapeHtml(pageError)}</div>` : '';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function customerOptions(customers: Customer[]): string {
  return customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)}</option>`).join('');
}

function money(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

export function mvpPageTemplate(session: SessionContext, moduleName: MvpModuleName): string {
  if (moduleName === '任务提醒') return taskPageTemplate(session);
  if (moduleName === '报价管理') return quotationPageTemplate(session);
  return `${errorNotice()}${orderPageTemplate(session)}`;
}

function pageHeader(title: string, subtitle: string): string {
  return `<header class="page-header"><div><p>MVP-A 主链路</p><h1>${escapeHtml(title)}</h1><span>${escapeHtml(subtitle)}</span></div><div class="user">主链路闭环</div></header>`;
}

function taskPageTemplate(session: SessionContext): string {
  const customers = listCustomers(session);
  const tasks = listTasks(session);
  const dashboard = getMvpDashboard(session);
  return `
    ${pageHeader('任务提醒', '将跟进、报价、订单和回款节点沉淀为可执行任务。')}
    <section class="cards customer-kpis"><div><strong>${dashboard.pendingTasks}</strong><span>待处理任务</span></div><div><strong>${tasks.filter((task) => task.status === '已完成').length}</strong><span>已完成任务</span></div><div><strong>${tasks.length}</strong><span>全部任务</span></div></section>
    <section class="mvp-layout">
      <article class="customer-form-card"><div class="section-title"><div><span class="section-label">新增任务</span><h2>手动创建提醒</h2></div></div>${customers.length ? `<form id="task-form" class="customer-form"><label>关联客户<select name="customerId">${customerOptions(customers)}</select></label><label>截止日期<input type="date" name="dueAt"></label><label class="full">任务标题<input name="title" placeholder="例如：今天确认客户是否接受报价"></label><button type="submit" class="primary compact-primary">创建任务</button></form>` : '<div class="empty-state"><strong>还没有客户</strong><p>先在客户管理里创建客户。</p></div>'}</article>
      <article class="customer-list-card"><div class="section-title"><div><span class="section-label">任务列表</span><h2>待办与已完成</h2></div></div>${tasks.length ? `<div class="mvp-list">${tasks.map(taskItem).join('')}</div>` : '<div class="empty-state"><strong>暂无任务</strong><p>报价、订单和收款会自动生成任务。</p></div>'}</article>
    </section>`;
}

function taskItem(task: SalesTask): string {
  return `<div class="mvp-item"><div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.source)} · 截止 ${escapeHtml(task.dueAt)}</span></div><em>${escapeHtml(task.status)}</em>${task.status === '待处理' ? `<button type="button" data-complete-task="${task.id}" class="secondary">完成</button>` : ''}</div>`;
}

function quotationPageTemplate(session: SessionContext): string {
  const customers = listCustomers(session);
  const quotations = listQuotations(session);
  const dashboard = getMvpDashboard(session);
  return `
    ${pageHeader('报价管理', '轻量结构化报价：产品、数量、单价、运费、安装费、折扣和总价。')}
    <section class="cards customer-kpis"><div><strong>${dashboard.quotations}</strong><span>报价数量</span></div><div><strong>${dashboard.confirmedQuotations}</strong><span>客户确认报价</span></div><div><strong>${money(quotations.reduce((total, quotation) => total + quotation.totalAmount, 0))}</strong><span>报价总额</span></div></section>
    <section class="mvp-layout">
      <article class="customer-form-card"><div class="section-title"><div><span class="section-label">新增报价</span><h2>创建多行报价单</h2></div></div>${errorNotice()}${customers.length ? `<form id="quotation-form" class="customer-form"><label>关联客户<select name="customerId">${customerOptions(customers)}</select></label><div class="full quote-lines" id="quote-lines">${quotationLine(0)}${quotationLine(1)}</div><button type="button" id="add-quote-line" class="secondary">添加产品行</button><label>运费<input name="freightFee" type="number" min="0" step="0.01"></label><label>安装费<input name="installationFee" type="number" min="0" step="0.01"></label><label>设计/测量费<input name="designFee" type="number" min="0" step="0.01"></label><label>折扣<input name="discountAmount" type="number" min="0" step="0.01"></label><button type="submit" class="primary compact-primary">生成报价</button></form>` : '<div class="empty-state"><strong>还没有客户</strong><p>先创建客户，再报价。</p></div>'}</article>
      <article class="customer-list-card"><div class="section-title"><div><span class="section-label">报价列表</span><h2>历史报价</h2></div></div>${quotations.length ? `<div class="mvp-list">${quotations.map(quotationItem).join('')}</div>` : '<div class="empty-state"><strong>暂无报价</strong><p>创建报价后会自动生成同日反馈确认任务。</p></div>'}</article>
    </section>`;
}

function quotationLine(index: number): string {
  return `<fieldset class="quote-line" data-quote-line><legend>产品 ${index + 1}</legend><input name="productName" placeholder="产品名称"><input name="specification" placeholder="规格"><input name="quantity" type="number" min="0" step="1" value="1" aria-label="数量"><input name="unitPrice" type="number" min="0" step="0.01" placeholder="单价" aria-label="单价"><button type="button" class="secondary" data-remove-line>删除</button></fieldset>`;
}

function quotationItem(quotation: Quotation): string {
  const send = quotation.status === '草稿' ? `<button type="button" data-send-quotation="${quotation.id}" class="secondary">发送报价</button>` : '';
  const confirm = quotation.status === '已发送' ? `<button type="button" data-confirm-quotation="${quotation.id}" class="secondary">客户确认</button>` : '';
  const voidButton = quotation.status === '草稿' || quotation.status === '已发送' ? `<button type="button" data-void-quotation="${quotation.id}" class="secondary">作废</button>` : '';
  return `<div class="mvp-item"><div><strong>报价 V${quotation.version} · ${money(quotation.totalAmount)}</strong><span>${quotation.lineItems.map((item) => item.productName).join('、')} · ${quotation.status}</span></div><em>${escapeHtml(quotation.status)}</em><button type="button" data-copy-quotation="${quotation.id}" class="secondary">复制新版本</button>${send}${confirm}${voidButton}</div>`;
}

function orderPageTemplate(session: SessionContext): string {
  const customers = listCustomers(session);
  const quotations = listQuotations(session).filter((quotation) => quotation.status === '客户确认');
  const orders = listOrders(session);
  const nodes = orders.flatMap((order) => order.receivableNodes);
  return `
    ${pageHeader('订单/回款', '报价确认后转订单，拆分定金和尾款节点，记录实际收款。')}
    <section class="cards customer-kpis"><div><strong>${orders.length}</strong><span>订单数量</span></div><div><strong>${money(nodes.reduce((total, node) => total + node.plannedAmount, 0))}</strong><span>应收金额</span></div><div><strong>${money(nodes.reduce((total, node) => total + node.receivedAmount, 0))}</strong><span>已收金额</span></div></section>
    <section class="mvp-layout">
      <article class="customer-form-card"><div class="section-title"><div><span class="section-label">转订单</span><h2>从确认报价生成订单</h2></div></div>${customers.length && quotations.length ? `<form id="order-form" class="customer-form"><label>关联客户<select name="customerId">${customerOptions(customers)}</select></label><label>确认报价<select name="quotationId">${quotations.map((quotation) => `<option value="${quotation.id}">V${quotation.version} · ${money(quotation.totalAmount)}</option>`).join('')}</select></label><label>定金<input name="depositAmount" type="number" min="0" step="0.01"></label><label>尾款<input name="finalPaymentAmount" type="number" min="0" step="0.01"></label><button type="submit" class="primary compact-primary">生成订单</button></form>` : '<div class="empty-state"><strong>没有可转订单的报价</strong><p>先在报价管理里把报价标记为客户确认。</p></div>'}</article>
      <article class="customer-list-card"><div class="section-title"><div><span class="section-label">订单与回款</span><h2>订单列表</h2></div></div>${orders.length ? `<div class="mvp-list">${orders.map(orderItem).join('')}</div>` : '<div class="empty-state"><strong>暂无订单</strong><p>确认报价后可以生成订单和收款节点。</p></div>'}</article>
    </section>`;
}

function orderItem(order: SalesOrder): string {
  return `<div class="mvp-item order-item"><div><strong>订单 ${money(order.orderAmount)}</strong><span>${escapeHtml(order.status)} · ${new Date(order.createdAt).toLocaleString()}</span></div><div class="receivable-list">${order.receivableNodes.map((node) => `<form class="collection-form" data-order-id="${order.id}" data-node-id="${node.id}"><span>${escapeHtml(node.title)}：${money(node.receivedAmount)} / ${money(node.plannedAmount)} · ${escapeHtml(node.status)}</span><input name="amount" type="number" min="0" step="0.01" placeholder="收款金额"><button type="submit" class="secondary">记录收款</button></form>`).join('')}</div></div>`;
}

export function bindMvpPage(root: HTMLElement, session: SessionContext, rerender: (moduleName: MvpModuleName) => void): void {
  root.querySelector<HTMLButtonElement>('#add-quote-line')?.addEventListener('click', () => {
    const container = root.querySelector<HTMLElement>('#quote-lines');
    if (container) container.insertAdjacentHTML('beforeend', quotationLine(container.querySelectorAll('[data-quote-line]').length));
  });
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('[data-remove-line]') && root.querySelectorAll('[data-quote-line]').length > 1) target.closest('[data-quote-line]')?.remove();
  });
  root.querySelector<HTMLFormElement>('#task-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    createTask(session, { customerId: String(form.get('customerId') ?? ''), title: String(form.get('title') ?? ''), dueAt: String(form.get('dueAt') ?? '') });
    rerender('任务提醒');
  });
  root.querySelectorAll<HTMLButtonElement>('[data-complete-task]').forEach((button) => button.addEventListener('click', () => { completeTask(session, button.dataset.completeTask ?? ''); rerender('任务提醒'); }));
  root.querySelector<HTMLFormElement>('#quotation-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const element = event.currentTarget as HTMLFormElement;
    const form = new FormData(element);
    const lineItems = [...element.querySelectorAll<HTMLElement>('[data-quote-line]')].map((line) => ({ productName: line.querySelector<HTMLInputElement>('[name="productName"]')?.value ?? '', specification: line.querySelector<HTMLInputElement>('[name="specification"]')?.value ?? '', quantity: Number(line.querySelector<HTMLInputElement>('[name="quantity"]')?.value ?? 0), unitPrice: Number(line.querySelector<HTMLInputElement>('[name="unitPrice"]')?.value ?? 0) })).filter((line) => line.productName || line.unitPrice);
    const result = createQuotation(session, { customerId: String(form.get('customerId') ?? ''), lineItems, freightFee: Number(form.get('freightFee') ?? 0), installationFee: Number(form.get('installationFee') ?? 0), designFee: Number(form.get('designFee') ?? 0), discountAmount: Number(form.get('discountAmount') ?? 0) });
    pageError = result.error ?? '';
    rerender('报价管理');
  });
  root.querySelectorAll<HTMLButtonElement>('[data-copy-quotation]').forEach((button) => button.addEventListener('click', () => { const result = copyQuotationVersion(session, button.dataset.copyQuotation ?? ''); pageError = result.error ?? ''; rerender('报价管理'); }));
  root.querySelectorAll<HTMLButtonElement>('[data-send-quotation]').forEach((button) => button.addEventListener('click', () => { const result = sendQuotation(session, button.dataset.sendQuotation ?? ''); pageError = result.error ?? ''; rerender('报价管理'); }));
  root.querySelectorAll<HTMLButtonElement>('[data-confirm-quotation]').forEach((button) => button.addEventListener('click', () => { const result = confirmQuotation(session, button.dataset.confirmQuotation ?? ''); pageError = result.error ?? ''; rerender('报价管理'); }));
  root.querySelectorAll<HTMLButtonElement>('[data-void-quotation]').forEach((button) => button.addEventListener('click', () => { const result = voidQuotation(session, button.dataset.voidQuotation ?? '', '用户作废'); pageError = result.error ?? ''; rerender('报价管理'); }));
  root.querySelector<HTMLFormElement>('#order-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const result = createOrderFromQuotation(session, { customerId: String(form.get('customerId') ?? ''), quotationId: String(form.get('quotationId') ?? ''), depositAmount: Number(form.get('depositAmount') ?? 0), finalPaymentAmount: Number(form.get('finalPaymentAmount') ?? 0) });
    pageError = result.error ?? '';
    rerender('订单/回款');
  });
  root.querySelectorAll<HTMLFormElement>('.collection-form').forEach((formElement) => formElement.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(formElement);
    const result = recordCollection(session, { orderId: formElement.dataset.orderId ?? '', nodeId: formElement.dataset.nodeId ?? '', amount: Number(form.get('amount') ?? 0), method: '手动记录' });
    pageError = result.error ?? '';
    rerender('订单/回款');
  }));
}
