import '@fontsource/press-start-2p/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './style.css';

import pkg from '../package.json';
import { h } from './app/dom';
import { startRouter } from './app/router';
import { homeScreen } from './screens/home';
import { fightScreen } from './screens/fight';
import { resultScreen } from './screens/result';
import { parentScreen } from './screens/parent';

const app = document.getElementById('app');
if (!app) throw new Error('Élément #app introuvable dans index.html');

startRouter(app, {
  accueil: homeScreen,
  combat: fightScreen,
  resultat: resultScreen,
  parent: parentScreen,
});

// Libellé de version lu dans package.json, en bas à droite.
document.body.append(h('footer', { className: 'app-version' }, `v${pkg.version}`));
