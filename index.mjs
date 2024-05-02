// index.js

import { startPSSAutomation } from './src/automatizaciones/pss.mjs';
import { startOfferAutomation } from './src/automatizaciones/offer.mjs';
import { startSCAutomatization } from './src/automatizaciones/spotContract.mjs';
import { startSampleStateAutomatization } from './src/automatizaciones/sampleStatus.mjs';
import { startSampleStateRHAutomatization } from './src/automatizaciones/sampleStatusRH.mjs';



// Llama a las funciones para ejecutar las automatizaciones
startPSSAutomation();
startOfferAutomation();
startSCAutomatization()
startSampleStateAutomatization()
startSampleStateRHAutomatization()