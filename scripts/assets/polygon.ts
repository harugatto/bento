import { safePromiseAll } from '@bento/common';
import { ERC20TokenInput } from '@bento/core/lib/tokens';
import { promises as fs } from 'fs';
import path from 'path';
import prettier from 'prettier';

import coingeckoTokenList from './coingecko-coin-list.json';
import {
  TRUSTWALLET_ASSETS_PATH,
  WORKSPACE_ROOT_PATH,
  stringify,
} from './config';

type TokenItem = {
  chainId: number;
  asset: string;
  type: 'ERC20' | 'coin' | unknown;
  address: string;
  name: string;
  symbol: string;
  decimals: 18;
  logoURI: string;
  pairs: { base: string }[];
};

const CHAIN_OUTPUT_PATH = path.resolve(
  WORKSPACE_ROOT_PATH,
  './packages/bento-core/src/tokens/polygon.json',
);

export const update = async () => {
  const tokenAddrs = await fs.readdir(
    path.resolve(TRUSTWALLET_ASSETS_PATH, './blockchains/polygon/assets'),
  );
  const tokens = await safePromiseAll(
    tokenAddrs.map(async (tokenAddress) => {
      const infoFilePath = path.resolve(
        TRUSTWALLET_ASSETS_PATH,
        `./blockchains/polygon/assets/${tokenAddress}/info.json`,
      );
      const token = JSON.parse(await fs.readFile(infoFilePath, 'utf8'));
      const coinGeckoToken = coingeckoTokenList.find(
        (v) =>
          v.platforms['polygon-pos']?.toLowerCase() ===
          tokenAddress.toLowerCase(),
      );
      const logoURI = `https://assets-cdn.trustwallet.com/blockchains/solana/assets/${tokenAddress}/logo.png`;

      return {
        symbol: token.symbol,
        name: coinGeckoToken?.name ?? token.name,
        decimals: token.decimals,
        address: tokenAddress,
        coinGeckoId: coinGeckoToken?.id,
        logo: logoURI,
      };
    }),
  );

  const previousTokens = JSON.parse(
    await fs.readFile(CHAIN_OUTPUT_PATH, 'utf8'),
  ) as ERC20TokenInput[];
  const newTokens = tokens.reduce((acc, token) => {
    const prev = acc.find(
      (v) => v.address?.toLowerCase() === token.address?.toLowerCase(),
    );
    if (!prev) {
      acc.push(token);
    } else {
      // replace undefined values
      const index = acc.indexOf(prev);
      acc[index] = { ...acc[index], ...token };
    }
    return acc;
  }, previousTokens);

  await fs.writeFile(
    CHAIN_OUTPUT_PATH,
    prettier.format(stringify(newTokens), { parser: 'json' }),
    'utf8',
  );
};
