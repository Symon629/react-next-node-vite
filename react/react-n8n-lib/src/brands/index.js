/*
 * brands/index.js
 * ---------------------------------------------------------------------------
 * Static brand registry shipped with the library. Acts as the seed data for
 * brandStore() before the GitHub poller has had a chance to run, and as a
 * permanent fallback if the network is unavailable.
 *
 * Each entry has the shape { strings, config }.
 * Consumer apps can override / extend this registry at runtime by passing
 * `initialBrands` to getInitialBrandState() without forking the library.
 * ---------------------------------------------------------------------------
 */
import tommyHilfigerStrings from './tommyHilfiger/strings';
import tommyHilfigerConfig from './tommyHilfiger/config';
import calvinKleinStrings from './calvinKlein/strings';
import calvinKleinConfig from './calvinKlein/config';

const brands = {
    tommyHilfiger: { strings: tommyHilfigerStrings, config: tommyHilfigerConfig },
    calvinKlein: { strings: calvinKleinStrings, config: calvinKleinConfig },
};

export default brands;
