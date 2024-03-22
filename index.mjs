// index.js

import { startPSSAutomation } from './src/automatizaciones/pss.mjs';
import { startOfferAutomation } from './src/automatizaciones/offer.mjs';

// Llama a las funciones para ejecutar las automatizaciones
startPSSAutomation();
startOfferAutomation();