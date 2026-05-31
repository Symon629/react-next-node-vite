/*
 * index.js
 * ---------------------------------------------------------------------------
 * Public entry point of the `react-n8n-lib` package. Anything not exported
 * here is considered internal and may change between versions.
 * ---------------------------------------------------------------------------
 */

import N8nProvider from './N8nProvider';
import withN8nTranslation from './withN8nTranslation';
import N8nContext from './n8nContext';
import { fetchTranslations } from './n8nClient';
import { makeT, makeTT, interpolate } from './translate';

export {
    N8nProvider,
    withN8nTranslation,
    N8nContext,
    fetchTranslations,
    makeT,
    makeTT,
    interpolate,
};

/*
 * Default export is the HOC because it is by far the most commonly used
 * symbol — handy for `import withN8nTranslation from 'react-n8n-lib'`.
 */
export default withN8nTranslation;
