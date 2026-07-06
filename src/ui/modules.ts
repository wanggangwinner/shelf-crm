export interface ModulePlaceholder {
  name: string;
  summary: string;
  accent: string;
}

export const WEB_MODULES: ModulePlaceholder[] = [
  { name: '工作台', summary: '今日提醒、待办节奏和关键概览将在后续任务接入。', accent: '今日' },
  { name: '客户管理', summary: '客户资料、跟进记录、AI 提炼将在后续任务接入。', accent: '客户' },
  { name: '任务提醒', summary: '跟进提醒、逾期任务和今日安排将在后续任务接入。', accent: '提醒' },
  { name: '报价管理', summary: '报价版本、产品明细、报价反馈将在后续任务接入。', accent: '报价' },
  { name: '订单/回款', summary: '订单确认、应收节点、实收记录将在后续任务接入。', accent: '回款' },
  { name: '方案/文件', summary: '现场照片、设计方案和业务文件绑定将在后续任务接入。', accent: '文件' },
  { name: '交付/售后', summary: '交付安装、售后回访和复购线索将在后续任务接入。', accent: '交付' },
  { name: '数据看板', summary: '看板数字和可下钻列表将在后续任务接入。', accent: '看板' },
  { name: '团队/权限', summary: '成员协作、角色边界和权限校验将在后续任务接入。', accent: '团队' },
  { name: '系统设置', summary: '行业默认项、基础配置和操作日志将在后续任务接入。', accent: '设置' },
];

export const MOBILE_ENTRIES = ['首页', '客户', '任务', '新增', '我的'] as const;
