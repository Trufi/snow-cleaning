import { render } from 'react-dom';
import { App, AppProps } from './components/app';
import './index.css';

const rootUI = document.getElementById('ui');

export function renderUI(appProps: AppProps) {
  render(<App {...appProps} />, rootUI);
}
