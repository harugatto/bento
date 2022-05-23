import { Web3Connector } from './components/Web3Connector';
import { WalletBalance } from '@/pages/api/erc/[network]/[walletAddress]';
import { WalletBalance as TendermintWalletBalance } from '@/pages/api/tendermint/[network]/[walletAddress]';
import { useAxiosSWR } from '@/hooks/useAxiosSWR';
import React, { useMemo } from 'react';
import { TokenBalanceItem } from './components/TokenBalanceItem';
import { AppendWallet } from './components/AppendWallet';
import { walletsAtom } from '@/recoil/wallets';
import { WalletList } from './components/WalletList';
import { useRecoilValue } from 'recoil';

const walletBalanceReducer =
  (symbol: string, callback: (acc: number, balance: WalletBalance) => number) =>
  (acc: number, balance: WalletBalance) =>
    balance.symbol === symbol ? callback(acc, balance) : acc;

const LandingPage = () => {
  const wallets = useRecoilValue(walletsAtom);

  const [
    cosmosWalletQuery,
    ethereumWalletQuery,
    polygonWalletQuery,
    klaytnWalletQuery,
  ] = useMemo(() => {
    const addrs = wallets.reduce(
      (acc, wallet) => {
        if (wallet.type === 'tendermint') {
          return { ...acc, cosmos: [...acc.cosmos, wallet.address] };
        }
        if (wallet.type !== 'erc') {
          return acc;
        }

        let _acc = acc;
        if (wallet.chains.includes('ethereum')) {
          _acc = { ..._acc, ethereum: [..._acc.ethereum, wallet.address] };
        }
        if (wallet.chains.includes('polygon')) {
          _acc = { ..._acc, polygon: [..._acc.polygon, wallet.address] };
        }
        if (wallet.chains.includes('klaytn')) {
          _acc = { ..._acc, klaytn: [..._acc.klaytn, wallet.address] };
        }
        return _acc;
      },
      { cosmos: [], klaytn: [], polygon: [], ethereum: [] },
    );

    return [
      addrs.cosmos.join(','),
      addrs.ethereum.join(','),
      addrs.polygon.join(','),
      addrs.klaytn.join(','),
    ];
  }, [wallets]);

  const { data: ethereumBalance } = useAxiosSWR<WalletBalance[]>(
    !ethereumWalletQuery ? null : `/api/erc/ethereum/${ethereumWalletQuery}`,
  );
  const { data: polygonBalance } = useAxiosSWR<TendermintWalletBalance[]>(
    !polygonWalletQuery ? null : `/api/erc/polygon/${polygonWalletQuery}`,
  );
  const { data: klaytnBalance } = useAxiosSWR<WalletBalance[]>(
    !klaytnWalletQuery ? null : `/api/erc/klaytn/${klaytnWalletQuery}`,
  );
  const { data: cosmosHubBalance } = useAxiosSWR<TendermintWalletBalance[]>(
    !cosmosWalletQuery
      ? null
      : `/api/tendermint/cosmos-hub/${cosmosWalletQuery}`,
  );
  const { data: osmosisBalance } = useAxiosSWR<TendermintWalletBalance[]>(
    !cosmosWalletQuery ? null : `/api/tendermint/osmosis/${cosmosWalletQuery}`,
  );

  const tokenBalances = useMemo(() => {
    const tokens = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
        netWorth: (ethereumBalance ?? []).reduce(
          walletBalanceReducer(
            'ETH',
            (acc, balance) => acc + balance.balance * balance.price,
          ),
          0,
        ),
        amount: (ethereumBalance ?? []).reduce(
          walletBalanceReducer('ETH', (acc, balance) => acc + balance.balance),
          0,
        ),
        price: (ethereumBalance ?? [])[0]?.price ?? 0,
        balances: ethereumBalance ?? [],
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
        netWorth: (polygonBalance ?? []).reduce(
          walletBalanceReducer(
            'MATIC',
            (acc, balance) => acc + balance.balance * balance.price,
          ),
          0,
        ),
        amount: (polygonBalance ?? []).reduce(
          walletBalanceReducer(
            'MATIC',
            (acc, balance) => acc + balance.balance,
          ),
          0,
        ),
        price: (polygonBalance ?? [])[0]?.price ?? 0,
        balances: polygonBalance ?? [],
      },
      {
        symbol: 'KLAY',
        name: 'Klaytn',
        logo: 'https://avatars.githubusercontent.com/u/41137100?s=200&v=4',
        netWorth: (klaytnBalance ?? []).reduce(
          walletBalanceReducer(
            'KLAY',
            (acc, balance) => acc + balance.balance * balance.price,
          ),
          0,
        ),
        amount: (klaytnBalance ?? []).reduce(
          walletBalanceReducer('KLAY', (acc, balance) => acc + balance.balance),
          0,
        ),
        price: (klaytnBalance ?? [])[0]?.price ?? 0,
        balances: (klaytnBalance ?? []).filter((v) => v.symbol === 'KLAY'),
      },
      {
        symbol: 'SCNR',
        name: 'Swapscanner',
        logo: 'https://api.swapscanner.io/api/tokens/0x8888888888885b073f3c81258c27e83db228d5f3/icon',
        netWorth: (klaytnBalance ?? []).reduce(
          walletBalanceReducer(
            'SCNR',
            (acc, balance) => acc + balance.balance * balance.price,
          ),
          0,
        ),
        amount: (klaytnBalance ?? []).reduce(
          walletBalanceReducer('SCNR', (acc, balance) => acc + balance.balance),
          0,
        ),
        price:
          (klaytnBalance ?? []).find((v) => v.symbol === 'SCNR')?.price ?? 0,
        balances: (klaytnBalance ?? []).filter((v) => v.symbol === 'SCNR'),
      },
      {
        symbol: 'COSMOS',
        name: 'Cosmos Hub',
        // FIXME: divide staking
        staking: true,
        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cosmos/info/logo.png',
        netWorth: (cosmosHubBalance ?? []).reduce(
          (acc, balance) =>
            acc +
            balance.balance * balance.price +
            balance.delegations * balance.price,
          0,
        ),
        amount: (cosmosHubBalance ?? []).reduce(
          (acc, balance) => acc + balance.balance + balance.delegations,
          0,
        ),
        price: (cosmosHubBalance ?? [])[0]?.price ?? 0,
        balances: cosmosHubBalance ?? [],
      },
      {
        symbol: 'OSMO',
        name: 'Osmosis',
        staking: true,
        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/osmosis/info/logo.png',
        netWorth: (osmosisBalance ?? []).reduce(
          (acc, balance) =>
            acc +
            balance.balance * balance.price +
            balance.delegations * balance.price,
          0,
        ),
        amount: (osmosisBalance ?? []).reduce(
          (acc, balance) => acc + balance.balance + balance.delegations,
          0,
        ),
        price: (osmosisBalance ?? [])[0]?.price ?? 0,
        balances: osmosisBalance ?? [],
      },
    ];

    tokens.sort((a, b) => b.netWorth - a.netWorth);
    return tokens;
  }, [
    ethereumBalance,
    polygonBalance,
    klaytnBalance,
    cosmosHubBalance,
    osmosisBalance,
  ]);

  const netWorthInUSD = useMemo(
    () => tokenBalances.reduce((acc, info) => acc + info.netWorth, 0),
    [tokenBalances],
  );

  return (
    <div className="min-h-screen px-4 pt-6 pb-24 flex">
      <div className="w-full max-w-2xl mx-auto relative z-0">
        <div className="absolute top-2 left-2 w-[120px] h-[120px] rounded-full bg-[#fa3737] blur-[88px] -z-10" />

        <div className="mt-4 w-full flex justify-between">
          <div className="flex flex-col justify-center">
            <span className="text-xl text-slate-500">Net worth</span>
            <span className="text-2xl font-bold text-slate-50">{`$${netWorthInUSD.toLocaleString()}`}</span>
          </div>

          <div className="flex flex-col">
            <Web3Connector />
          </div>
        </div>

        <WalletList />
        <AppendWallet />

        <ul className="mt-8">
          {tokenBalances.map((info) => (
            <TokenBalanceItem key={info.symbol} {...info} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LandingPage;
