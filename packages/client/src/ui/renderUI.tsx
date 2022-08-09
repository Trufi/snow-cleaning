import { createRoot } from 'react-dom/client';
import { App, AppProps } from './components/app';
import './index.css';

const rootUI = document.getElementById('ui');
const root = createRoot(rootUI!);

export function renderUI(appProps: AppProps) {
  root.render(<App {...appProps} />);
}

export type RenderUIFunction = typeof renderUI;
