/* global globalThis */

import { makeVStorage } from '@agoric/client-utils';
import { depositForBurn, makeProvider } from '../util/cctp.js';
import {
  makeSigner,
  queryForwardingAccount,
  registerFwdAccount,
} from '../util/noble.js';
import { queryFastUSDCLocalChainAccount } from '../util/agoric.js';

/** @typedef {import('../util/file').file} file */
/** @typedef {import('@agoric/client-utils').VStorage} VStorage */
/** @typedef {import('@cosmjs/stargate').SigningStargateClient} SigningStargateClient */
/** @typedef {import('ethers').ethers.JsonRpcProvider} ethProvider */

const transfer = async (
  /** @type {file} */ configFile,
  /** @type {string} */ amount,
  /** @type {string} */ destination,
  out = console,
  fetch = globalThis.fetch,
  /** @type {VStorage | undefined} */ vstorage,
  /** @type {{signer: SigningStargateClient, address: string} | undefined} */ nobleSigner,
  /** @type {ethProvider | undefined} */ ethProvider,
) => {
  const execute = async (
    /** @type {import('./config').ConfigOpts} */ config,
  ) => {
    vstorage ||= makeVStorage(
      { fetch },
      { chainName: 'agoric', rpcAddrs: [config.agoricRpc] },
    );
    const agoricAddr = await queryFastUSDCLocalChainAccount(vstorage, out);
    const appendedAddr = `${agoricAddr}+${destination}`;
    out.log(`forwarding destination ${appendedAddr}`);

    const { exists, address } = await queryForwardingAccount(
      config.nobleApi,
      config.nobleToAgoricChannel,
      appendedAddr,
      out,
      fetch,
    );

    if (!exists) {
      nobleSigner ||= await makeSigner(config.nobleSeed, config.nobleRpc, out);
      const { address: signerAddress, signer } = nobleSigner;
      try {
        const res = await registerFwdAccount(
          signer,
          signerAddress,
          config.nobleToAgoricChannel,
          appendedAddr,
          out,
        );
        out.log(res);
      } catch (e) {
        out.error(e);
        out.error(
          `Error noble registering forwarding account for ${appendedAddr} on channel ${config.nobleToAgoricChannel}`,
        );
        return;
      }
    }

    ethProvider ||= makeProvider(config.ethRpc);
    await depositForBurn(
      ethProvider,
      config.ethSeed,
      config.tokenMessengerAddress,
      config.tokenAddress,
      address,
      amount,
      out,
    ).catch(out.error);
  };

  let config;
  await null;
  try {
    config = JSON.parse(await configFile.read());
  } catch {
    out.error(
      `No config found at ${configFile.path}. Use "config init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  await execute(config);
};

export default { transfer };
