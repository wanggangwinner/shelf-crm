import { renderApp } from './ui/render.js';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing root element for 货架客户 CRM app');
}

renderApp(root);
