/* global harden */

import { makeZoe } from '@agoric/zoe';

export function buildRootObject(vatPowers) {
  const zoe = makeZoe({}, vatPowers);
  return harden({
    getZoe: () => zoe,
  });
}
