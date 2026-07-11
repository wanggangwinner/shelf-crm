import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomer, resetCustomerModuleState } from '../dist/api/customers.js';
import { copyQuotationVersion, createQuotation, confirmQuotation, expireQuotation, listQuotationSets, listQuotations, markQuotationConverted, resetMvpFlowState, sendQuotation, updateQuotationDraft, voidQuotation } from '../dist/api/mvpFlow.js';
import { resetOpportunityState } from '../dist/api/opportunities.js';

globalThis.localStorage = { store: new Map(), getItem(k) { return this.store.get(k) ?? null; }, setItem(k,v) { this.store.set(k,String(v)); }, removeItem(k) { this.store.delete(k); }, clear() { this.store.clear(); } };
const session={user:{id:'u',name:'U',isDevelopmentUser:true,createdAt:'now'},currentTeam:{id:'t',name:'T',kind:'team',ownerUserId:'u',createdAt:'now'},member:{id:'m',team_id:'t',userId:'u',roleId:'r',displayName:'U',joinedAt:'now'},role:{id:'r',team_id:'t',code:'owner',name:'owner',description:'',permissions:[]}};
function reset(){localStorage.clear();resetCustomerModuleState();resetOpportunityState();resetMvpFlowState();}
function customer(){return createCustomer(session,{name:'项目客户',phone:'13800000000'}).customer;}

test('quotation versions share a set and enforce draft-only editing',()=>{
  reset(); const c=customer(); const v1=createQuotation(session,{customerId:c.id,productName:'主架',quantity:1,unitPrice:1000}).quotation;
  assert.equal(v1.status,'草稿'); assert.ok(v1.quotationSetId); assert.equal(listQuotationSets(session).length,1);
  sendQuotation(session,v1.id); assert.equal(updateQuotationDraft(session,v1.id,{freightFee:10}).error,'只有草稿报价可以修改，请复制为新版本。');
  const v2=copyQuotationVersion(session,v1.id).quotation; assert.equal(v2.status,'草稿'); assert.equal(v2.version,2); assert.equal(v2.quotationSetId,v1.quotationSetId);
});

test('confirmation replaces the prior confirmed version and conversion locks it',()=>{
  reset(); const c=customer(); const v1=createQuotation(session,{customerId:c.id,productName:'主架',quantity:1,unitPrice:1000}).quotation;
  assert.equal(confirmQuotation(session,v1.id).error,'只有已发送报价可以客户确认。'); sendQuotation(session,v1.id); confirmQuotation(session,v1.id);
  const v2=copyQuotationVersion(session,v1.id).quotation; sendQuotation(session,v2.id); confirmQuotation(session,v2.id);
  const rows=listQuotations(session); assert.equal(rows.find(q=>q.id===v1.id).status,'已被替代'); assert.equal(rows.find(q=>q.id===v2.id).status,'客户确认');
  markQuotationConverted(session,v2.id); assert.equal(listQuotations(session).find(q=>q.id===v2.id).status,'已转订单');
});

test('sent quotations can expire or be voided without content mutation',()=>{
  reset(); const c=customer(); const q1=createQuotation(session,{customerId:c.id,productName:'主架',quantity:1,unitPrice:1000}).quotation; sendQuotation(session,q1.id); expireQuotation(session,q1.id,'超过有效期'); assert.equal(listQuotations(session)[0].status,'已过期');
  const q2=createQuotation(session,{customerId:c.id,productName:'端架',quantity:1,unitPrice:500}).quotation; assert.equal(voidQuotation(session,q2.id,'客户取消').quotation.status,'已作废');
});
