import { OpenSea, OpenSeaAsset } from '@bento/client';
import { safePromiseAll } from '@bento/common';
import { priceFromCoinGecko } from '@bento/core/lib/pricings/CoinGecko';
import chunk from 'lodash.chunk';
import groupBy from 'lodash.groupby';
import React, { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import styled from 'styled-components';

import { NoSSR } from '@/components/NoSSR';
import { PageContainer } from '@/components/PageContainer';
import { useAxiosSWR } from '@/hooks/useAxiosSWR';
import { walletsAtom } from '@/recoil/wallets';

import { AddWalletModal } from './components/AddWalletModal';
import { AssetRatioChart } from './components/AssetRatioChart';
import { EmptyBalance } from './components/EmptyBalance';
import { EmptyWallet } from './components/EmptyWallet';
import { TokenBalanceItem } from './components/TokenBalanceItem';
import { WalletList } from './components/WalletList';
import {
  CosmosSDKWalletBalance,
  EVMWalletBalance,
  NFTWalletBalance,
  SolanaWalletBalance,
  WalletBalance,
} from './types/balance';

const walletBalanceReducer =
  (symbol: string, callback: (acc: number, balance: WalletBalance) => number) =>
  (acc: number, balance: WalletBalance) =>
    balance.symbol === symbol ? callback(acc, balance) : acc;

const DashboardPage = () => {
  const wallets = useRecoilValue(walletsAtom);

  const [
    cosmosWalletQuery,
    ethereumWalletQuery,
    bnbWalletQuery,
    polygonWalletQuery,
    klaytnWalletQuery,
    solanaWalletQuery,
  ] = useMemo(() => {
    const addrs = wallets.reduce<
      Record<
        'cosmos' | 'ethereum' | 'bnb' | 'polygon' | 'klaytn' | 'solana',
        string[]
      >
    >(
      (acc, wallet) => {
        if (wallet.type === 'cosmos-sdk') {
          return { ...acc, cosmos: [...acc.cosmos, wallet.address] };
        }
        if (wallet.type === 'solana') {
          return { ...acc, solana: [...acc.solana, wallet.address] };
        }
        if (wallet.type !== 'evm') {
          return acc;
        }

        let _acc = acc;
        if (wallet.networks.includes('ethereum')) {
          _acc = { ..._acc, ethereum: [..._acc.ethereum, wallet.address] };
        }
        if (wallet.networks.includes('bnb')) {
          _acc = { ..._acc, bnb: [..._acc.bnb, wallet.address] };
        }
        if (wallet.networks.includes('polygon')) {
          _acc = { ..._acc, polygon: [..._acc.polygon, wallet.address] };
        }
        if (wallet.networks.includes('klaytn')) {
          _acc = { ..._acc, klaytn: [..._acc.klaytn, wallet.address] };
        }
        return _acc;
      },
      {
        cosmos: [],
        ethereum: [],
        bnb: [],
        polygon: [],
        klaytn: [],
        solana: [],
      },
    );

    return [
      addrs.cosmos.join(','),
      addrs.ethereum.join(','),
      addrs.bnb.join(','),
      addrs.polygon.join(','),
      addrs.klaytn.join(','),
      addrs.solana.join(','),
    ];
  }, [wallets]);

  const { data: ethereumBalance = [] } = useAxiosSWR<EVMWalletBalance[]>(
    !ethereumWalletQuery ? null : `/api/evm/ethereum/${ethereumWalletQuery}`,
  );
  const { data: bnbBalance = [] } = useAxiosSWR<EVMWalletBalance[]>(
    !bnbWalletQuery ? null : `/api/evm/bnb/${bnbWalletQuery}`,
  );
  const { data: polygonBalance = [] } = useAxiosSWR<CosmosSDKWalletBalance[]>(
    !polygonWalletQuery ? null : `/api/evm/polygon/${polygonWalletQuery}`,
  );
  const { data: klaytnBalance = [] } = useAxiosSWR<EVMWalletBalance[]>(
    !klaytnWalletQuery ? null : `/api/evm/klaytn/${klaytnWalletQuery}`,
  );
  const { data: cosmosHubBalance = [] } = useAxiosSWR<CosmosSDKWalletBalance[]>(
    !cosmosWalletQuery
      ? null
      : `/api/cosmos-sdk/cosmos-hub/${cosmosWalletQuery}`,
  );
  const { data: osmosisBalance = [] } = useAxiosSWR<CosmosSDKWalletBalance[]>(
    !cosmosWalletQuery ? null : `/api/cosmos-sdk/osmosis/${cosmosWalletQuery}`,
  );
  const { data: solanaBalance = [] } = useAxiosSWR<SolanaWalletBalance[]>(
    !solanaWalletQuery ? null : `/api/solana/mainnet/${solanaWalletQuery}`,
  );

  const [NFTBalance, setNFTBalance] = useState<NFTWalletBalance[]>([]);
  const [ethereumPrice, setEthereumPrice] = useState<number>(0);
  const [fetchedAssets, setFetchedAssets] = useState<{
    [walletAddress: string]: {
      [cursor: string]: (OpenSeaAsset & { walletAddress: string })[];
    };
  }>({});

  useEffect(() => {
    const fetchAssets = async (walletAddress: string) => {
      let cursor: string | undefined = undefined;
      let firstFetch: boolean = true;

      while (firstFetch || !!cursor) {
        // FIXME: TypeScript behaving strange here
        const res: { assets: OpenSeaAsset[]; cursor: string | undefined } =
          await OpenSea.getAssets({
            owner: walletAddress,
            cursor,
          });

        const { assets, cursor: fetchedCursor } = res;
        firstFetch = false;
        cursor = fetchedCursor;

        setFetchedAssets((prev) => ({
          ...prev,
          [walletAddress]: {
            ...prev[walletAddress],
            [cursor ?? 'undefined']: assets.map((v) => ({
              ...v,
              walletAddress,
            })),
          },
        }));
      }
    };

    const main = async () => {
      for (const wallet of wallets) {
        if (wallet.type === 'evm' && wallet.networks.includes('opensea')) {
          await fetchAssets(wallet.address);
        }
      }
    };

    main();
    priceFromCoinGecko('ethereum').then(setEthereumPrice);
  }, [wallets]);

  useEffect(() => {
    const flattedAssets = Object.values(fetchedAssets)
      .map((v) => Object.values(v))
      .flat(3);
    const groupedByWalletAddress = groupBy(flattedAssets, 'walletAddress');

    safePromiseAll(
      Object.keys(groupedByWalletAddress).map(async (walletAddress) => {
        const groupByCollection: Record<
          string,
          (OpenSeaAsset & { walletAddress: string })[]
        > = groupBy(
          groupedByWalletAddress[walletAddress],
          (v) => v.collection.slug,
        );

        const CHUNK_SIZE = 5;
        const balances: NFTWalletBalance[] = (
          await safePromiseAll(
            chunk(Object.keys(groupByCollection), CHUNK_SIZE).map(
              async (chunckedCollectionSlugs) =>
                safePromiseAll(
                  chunckedCollectionSlugs.map(async (collectionSlug) => {
                    const collection =
                      groupByCollection[collectionSlug][0].collection;

                    const { floor_price: floorPrice } =
                      await OpenSea.getCollectionStats(collectionSlug).catch(
                        (error) => {
                          console.error(error);
                          // FIXME: Error handling
                          return { floor_price: 0 };
                        },
                      );

                    return {
                      symbol: collection.name,
                      name: collection.name,
                      walletAddress,
                      balance: groupByCollection[collectionSlug].length,
                      logo: collection.image_url,
                      price: ethereumPrice * floorPrice,
                      type: 'nft' as const,
                    };
                  }),
                ),
            ),
          )
        ).flat();

        return balances;
      }),
    ).then((v) => setNFTBalance(v.flat()));
  }, [fetchedAssets]);

  const tokenBalances = useMemo(() => {
    // NOTE: `balance.symbol + balance.name` 로 키를 만들어 groupBy 하고, 그 결과만 남긴다.
    // TODO: 추후 `tokenAddress` 로만 그룹핑 해야 할 것 같다(같은 심볼과 이름을 사용하는 토큰이 여러개 있을 수 있기 때문).
    const balancesByPlatform = Object.entries(
      groupBy<WalletBalance>(
        [
          ethereumBalance,
          bnbBalance,
          polygonBalance,
          klaytnBalance,
          cosmosHubBalance,
          osmosisBalance,
          solanaBalance,
          NFTBalance,
        ].flat(),
        (balance) => balance.symbol + balance.name,
      ),
    ).map((v) => v[1]);

    const tokens = balancesByPlatform
      .map((balances) => {
        // NOTE: balances 는 모두 같은 토큰의 정보를 담고 있기에, first 에서만 정보를 꺼내온다.
        const [first] = balances;

        return {
          symbol: first.symbol,
          name: first.name,
          logo: first.logo,
          type: 'type' in first ? first.type : undefined,
          tokenAddress: 'address' in first ? first.address : undefined,
          balances: balances,
          netWorth: balances.reduce(
            walletBalanceReducer(
              first.symbol,
              (acc, balance) =>
                acc +
                (balance.balance +
                  ('delegations' in balance ? balance.delegations : 0)) *
                  balance.price,
            ),
            0,
          ),
          amount: balances.reduce(
            walletBalanceReducer(
              first.symbol,
              (acc, balance) =>
                acc +
                balance.balance +
                ('delegations' in balance ? balance.delegations : 0),
            ),
            0,
          ),
          price: first.price,
        };
      })
      .flat();

    tokens.sort((a, b) => b.netWorth - a.netWorth);
    return tokens.filter((v) => v.netWorth > 0);
  }, [
    ethereumBalance,
    bnbBalance,
    polygonBalance,
    klaytnBalance,
    cosmosHubBalance,
    osmosisBalance,
    solanaBalance,
    NFTBalance,
  ]);

  const netWorthInUSD = useMemo(
    () => tokenBalances.reduce((acc, info) => acc + info.netWorth, 0),
    [tokenBalances],
  );

  const [isAddWalletModalVisible, setAddWalletModalVisible] =
    useState<boolean>(false);

  return (
    <PageContainer className="pt-0">
      <div className="absolute top-2 left-2 w-[120px] h-[120px] rounded-full bg-[#fa3737] blur-[88px] -z-10" />

      <div className="mt-10 w-full flex justify-between">
        <div className="flex flex-col justify-center">
          <h2 className="text-md font-semibold text-slate-50/60">Net worth</h2>
          <span className="mt-2 text-3xl font-bold text-slate-50">{`$${netWorthInUSD.toLocaleString()}`}</span>
        </div>
      </div>

      <TopSection>
        <div className="flex-1 min-w-sm flex">
          <AssetRatioChart
            tokenBalances={tokenBalances}
            netWorthInUSD={netWorthInUSD}
          />
        </div>
        <div className="flex-1 flex flex-col">
          <NoSSR>
            <h2 className="mt-2 text-md font-semibold text-slate-50/60">
              Wallets
              {wallets.length > 0 && (
                <span className="ml-1 text-slate-50/80 text-[#88a9ca]">
                  {`(${wallets.length.toLocaleString()})`}
                </span>
              )}
            </h2>

            {wallets.length > 0 ? (
              <WalletList
                onClickConnect={() => setAddWalletModalVisible((prev) => !prev)}
              />
            ) : (
              <EmptyWallet
                onClickConnect={() => setAddWalletModalVisible((prev) => !prev)}
              />
            )}
          </NoSSR>
        </div>
      </TopSection>

      <Divider className="my-4" />

      <section className="mt-4 flex flex-col">
        <h2 className="text-md font-semibold text-slate-50/60">
          Assets
          {tokenBalances.length > 0 && (
            <span className="ml-1 text-slate-50/80 text-[#88a9ca]">
              {`(${tokenBalances.length.toLocaleString()})`}
            </span>
          )}
        </h2>

        {tokenBalances.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {tokenBalances.map((info) => (
              <TokenBalanceItem
                key={`${info.symbol}-${
                  'tokenAddress' in info ? info.tokenAddress : 'native'
                }`}
                {...info}
              />
            ))}
          </ul>
        ) : (
          <EmptyBalance />
        )}
      </section>

      <AddWalletModal
        visible={isAddWalletModalVisible}
        onDismiss={() => setAddWalletModalVisible((prev) => !prev)}
      />
    </PageContainer>
  );
};

export default DashboardPage;

const TopSection = styled.section`
  width: 100%;
  display: flex;

  @media screen and (max-width: 647px) {
    flex-direction: column;
  }
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background-color: rgba(248, 250, 252, 0.25);
`;
