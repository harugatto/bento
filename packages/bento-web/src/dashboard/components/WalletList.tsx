import {
  CosmosSDKBasedNetworks,
  EVMBasedNetworks,
  WALLET_TYPES,
} from '@bento/common';
import { shortenAddress } from '@bento/common';
import { Icon } from '@iconify/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';

import { NoSSR } from '@/components/NoSSR';
import { walletsAtom } from '@/recoil/wallets';
import { copyToClipboard } from '@/utils/clipboard';
import { toast } from '@/utils/toast';

type WalletListProps = {
  onClickConnect?: () => void;
};

export const WalletList: React.FC<WalletListProps> = ({ onClickConnect }) => {
  const [wallets, setWallets] = useRecoilState(walletsAtom);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  const renderedWallets = useMemo(
    () => (collapsed ? wallets.slice(0, 3) : wallets),
    [collapsed, wallets],
  );
  const hasCollapseEffect = wallets.length > 3;

  const onClickCopy = useCallback((text: string) => {
    copyToClipboard(text);
    toast({
      title: 'Copied to Clipboard!',
      description: text,
    });
  }, []);

  return (
    <NoSSR>
      <ul className="flex flex-col">
        {renderedWallets.map((wallet) => (
          <li className="p-1 py-2 flex items-center" key={wallet.address}>
            <img
              className="w-10 min-w-[40px] h-10 rounded-full overflow-hidden shadow-md ring-1 ring-slate-100/25"
              src={WALLET_TYPES[wallet.type].logo}
            />
            <div className="ml-2 flex flex-col flex-1">
              <div className="flex items-center">
                <span className="text-white/60 text-lg">
                  {shortenAddress(wallet.address)}
                </span>
                <button
                  className="ml-1 text-white focus:opacity-40"
                  onClick={() => onClickCopy(wallet.address)}
                >
                  <Icon icon="eva:copy-fill" />
                </button>

                <button
                  className="ml-auto text-white/25"
                  onClick={() => {
                    setWallets(
                      wallets.filter(
                        (w) =>
                          w.address.toLowerCase() !==
                          wallet.address.toLowerCase(),
                      ),
                    );
                  }}
                >
                  <Icon icon="entypo:cross" width={20} height={20} />
                </button>
              </div>

              <div>
                {wallet.type !== 'solana' ? (
                  wallet.networks.map(
                    (network: EVMBasedNetworks | CosmosSDKBasedNetworks) => (
                      <span
                        key={network}
                        className="mr-1 p-[2px] px-[3px] text-xs rounded bg-slate-100/25 text-slate-100/60"
                      >
                        {network}
                      </span>
                    ),
                  )
                ) : (
                  <span className="mr-1 p-[2px] px-[3px] text-xs rounded bg-slate-100/25 text-slate-100/60">
                    solana
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(hasCollapseEffect || !!onClickConnect) && (
        <ButtonList>
          {hasCollapseEffect && (
            <ShowAllButton onClick={() => setCollapsed((prev) => !prev)}>
              {collapsed ? 'Show All' : 'Show Less'}
            </ShowAllButton>
          )}
          {!!onClickConnect && (
            <Button onClick={onClickConnect}>Add Another</Button>
          )}
        </ButtonList>
      )}
    </NoSSR>
  );
};

const ButtonList = styled.div`
  margin-top: 12px;
  margin-bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
`;
const ShowAllButton = styled.button`
  padding: 8px 20px;
  background: #121a32;
  border: 1px solid #020322;
  border-radius: 8px;

  font-weight: 500;
  font-size: 12px;
  line-height: 100%;
  color: rgba(255, 255, 255, 0.65);

  &:not(:last-of-type) {
    margin-right: 8px;
  }

  &:active {
    opacity: 0.45;
  }
`;

const Button = styled.button`
  padding: 8px 20px;
  width: fit-content;
  cursor: pointer;

  border-radius: 8px;
  border: 1px solid rgba(255, 165, 165, 0.4);
  background: radial-gradient(98% 205% at 0% 0%, #74021a 0%, #c1124f 100%);
  filter: drop-shadow(0px 10px 32px rgba(151, 42, 53, 0.33));
  transition: all 0.2s ease-in-out;

  font-weight: 500;
  font-size: 12px;
  line-height: 100%;

  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0px 4px 12px rgba(101, 0, 12, 0.42);

  &:active {
    opacity: 0.45;
  }
`;
