import { Bech32Address } from '@bento/core/lib/bech32';
import { getAddress, isAddress } from '@ethersproject/address';
import { PublicKey } from '@solana/web3.js';
import clsx from 'clsx';
import produce from 'immer';
import React, { useCallback, useEffect, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import styled, { css } from 'styled-components';

import { Modal } from '@/components/Modal';
import { Portal } from '@/components/Portal';
import { WalletConnector } from '@/components/WalletConnector';
import { useSession } from '@/hooks/useSession';
import { useRevalidateWallets } from '@/hooks/useWallets';
import { FieldInput } from '@/profile/components/FieldInput';
import { walletsAtom } from '@/recoil/wallets';
import { Supabase } from '@/utils/Supabase';

export type Network = {
  id: string;
  type: string;
  name: string;
  logo: string;
};
const NETWORKS: Network[] = [
  {
    id: 'ethereum',
    type: 'evm',
    name: 'Ethereum',
    logo: '/assets/ethereum.png',
  },
  {
    id: 'bnb',
    type: 'evm',
    name: 'BNB',
    logo: 'https://assets-cdn.trustwallet.com/blockchains/binance/info/logo.png',
  },
  {
    id: 'polygon',
    type: 'evm',
    name: 'Polygon',
    logo: '/assets/polygon.webp',
  },
  {
    id: 'klaytn',
    type: 'evm',
    name: 'Klaytn',
    logo: 'https://avatars.githubusercontent.com/u/41137100?s=200&v=4',
  },
  {
    id: 'opensea',
    type: 'evm',
    name: 'OpenSea',
    logo: '/assets/opensea.png',
  },
  {
    id: 'cosmos',
    type: 'cosmos-sdk',
    name: 'Cosmos',
    logo: 'https://assets-cdn.trustwallet.com/blockchains/cosmos/info/logo.png',
  },
  {
    id: 'osmosis',
    type: 'cosmos-sdk',
    name: 'Osmosis',
    logo: 'https://assets-cdn.trustwallet.com/blockchains/osmosis/info/logo.png',
  },
  {
    id: 'solana',
    type: 'solana',
    name: 'Solana',
    logo: 'https://assets-cdn.trustwallet.com/blockchains/solana/info/logo.png',
  },
];

const identifyWalletAddress = (value: string) => {
  if (value.length < 32) {
    // minimal length of a valid address(solana)
    return null;
  }
  if (value.startsWith('0x')) {
    try {
      const addressWithChecksum = getAddress(value.toLowerCase());
      if (isAddress(addressWithChecksum)) {
        return 'evm';
      }
      return null;
    } catch {
      return null;
    }
  }
  try {
    if (!!Bech32Address.fromBech32(value)) {
      return 'cosmos-sdk';
    }
  } catch {
    try {
      if (PublicKey.isOnCurve(new PublicKey(value))) {
        return 'solana';
      }
    } catch {
      return null;
    }
  }
  return null;
};

type AddWalletModalProps = {
  visible?: boolean;
  onDismiss?: () => void;
};

export const AddWalletModal: React.FC<AddWalletModalProps> = ({
  visible: isVisible = false,
  onDismiss,
}) => {
  const { session } = useSession();
  const isLoggedIn = !!session;

  const [networks, setNetworks] = useState<Network[]>([]);
  const firstNetwork = networks[0];
  const onSelectNetwork = useCallback((network: Network) => {
    setNetworks((prev) =>
      !prev.find((v) => v.id === network.id)
        ? [...prev, network]
        : prev.filter((v) => v.id !== network.id),
    );
  }, []);

  const onClickSignInGitHub = useCallback(async () => {
    const { user, session, error } = await Supabase.auth.signIn(
      { provider: 'github' },
      { redirectTo: window.location.href },
    );
    console.log({ user, session, error });
  }, []);

  const revalidateWallets = useRevalidateWallets();

  const [draftWalletAddress, setDraftWalletAddress] = useState<string>('');
  const [draftWalletType, setDraftWalletType] = useState<string | null>(null);

  useEffect(() => {
    if (!draftWalletAddress) {
      return;
    }
    const _walletType = identifyWalletAddress(draftWalletAddress);
    setDraftWalletType(_walletType);
    console.log(_walletType);
  }, [draftWalletAddress]);

  // Add wallet without session
  const setWallets = useSetRecoilState(walletsAtom);
  const onClickAddWallet = useCallback(() => {
    const walletDraft = {
      type: draftWalletType as any,
      address: draftWalletAddress,
      networks: networks.map((v) => v.id),
    };

    setWallets((prev) =>
      produce(prev, (walletsDraft) => {
        const index = walletsDraft.findIndex(
          (v) => v.address === walletDraft.address,
        );
        if (index === -1) {
          walletsDraft.push(walletDraft);
        } else {
          // update only chain if existing wallet
          const wallet = walletsDraft[index];
          if (wallet.type === 'solana') {
            return;
          }
          wallet.networks = Array.from(
            new Set([...walletDraft.networks, ...wallet.networks]),
          ) as any[];
        }
      }),
    );
  }, [draftWalletType, draftWalletAddress, networks, setWallets]);

  return (
    <Portal>
      <OverlayWrapper
        visible={isVisible}
        onDismiss={onDismiss}
        transition={{ ease: 'linear' }}
      >
        <div
          className={clsx(
            'p-4 h-fit overflow-hidden',
            'flex flex-col gap-8',
            'border border-slate-800 rounded-md drop-shadow-2xl',
            'bg-slate-800/5 backdrop-blur-md flex flex-col cursor-pointer',
          )}
        >
          {isLoggedIn ? (
            <>
              <section>
                <h3 className="mb-3 font-bold text-white">Choose Chains</h3>
                <div className="flex flex-wrap">
                  {NETWORKS.map((network) => {
                    const selected = !!networks.find(
                      (v) => v.id === network.id,
                    );
                    const disabled =
                      typeof firstNetwork !== 'undefined' &&
                      firstNetwork.type !== network.type;

                    return (
                      <NetworkItem
                        key={network.id}
                        className={clsx(
                          'p-2 m-1 rounded-md',
                          disabled && 'opacity-10 cursor-not-allowed',
                        )}
                        selected={selected}
                        onClick={
                          !disabled //
                            ? () => onSelectNetwork(network)
                            : undefined
                        }
                      >
                        <img
                          className="w-12 h-12 rounded-full object-contain ring-1 ring-slate-100/25"
                          src={network.logo}
                          alt={network.name}
                        />
                        <span className="mt-1 text-white text-xs">
                          {network.name}
                        </span>
                      </NetworkItem>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold text-white">Sign with Wallet</h3>
                <WalletConnector
                  networks={networks}
                  onSave={() => {
                    onDismiss?.();
                    setNetworks([]);
                    revalidateWallets?.();
                  }}
                />
              </section>
            </>
          ) : (
            <>
              <section>
                <h3 className="mb-3 font-bold text-white">
                  1. Sign in to save and verify; else it'll be per-device
                </h3>
                <div>
                  <button
                    className="m-1 p-2 bg-slate-200"
                    onClick={onClickSignInGitHub}
                  >
                    GitHub
                  </button>
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold text-white">2. Input Address</h3>

                <FieldInput
                  field="Address"
                  value={draftWalletAddress}
                  onChange={(e) => setDraftWalletAddress(e.target.value)}
                />
              </section>

              <section>
                <h3 className="mb-3 font-bold text-white">3. Choose Chains</h3>
                <div className="flex flex-wrap">
                  {NETWORKS.map((network) => {
                    const selected = !!networks.find(
                      (v) => v.id === network.id,
                    );
                    const disabled =
                      (typeof firstNetwork !== 'undefined' &&
                        firstNetwork.type !== network.type) ||
                      draftWalletType !== network.type;

                    return (
                      <NetworkItem
                        key={network.id}
                        className={clsx(
                          'p-2 m-1 rounded-md',
                          disabled && 'opacity-10 cursor-not-allowed',
                        )}
                        selected={selected}
                        onClick={
                          !disabled //
                            ? () => onSelectNetwork(network)
                            : undefined
                        }
                      >
                        <img
                          className="w-12 h-12 rounded-full object-contain ring-1 ring-slate-100/25"
                          src={network.logo}
                          alt={network.name}
                        />
                        <span className="mt-1 text-white text-xs">
                          {network.name}
                        </span>
                      </NetworkItem>
                    );
                  })}
                </div>
              </section>

              <Button onClick={onClickAddWallet}>Add Button</Button>
            </>
          )}
        </div>
      </OverlayWrapper>
    </Portal>
  );
};

const OverlayWrapper = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

type NetworkItemProps = {
  selected?: boolean;
};
const NetworkItem = styled.div<NetworkItemProps>`
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  user-select: none;

  ${({ selected }) =>
    selected &&
    css`
      border-color: rgb(168 85 247 / var(--tw-border-opacity));
    `};
`;

const Button = styled.button`
  padding: 20px 80px;
  cursor: pointer;

  border-radius: 8px;
  border: 1px solid rgba(255, 165, 165, 0.66);
  background: radial-gradient(98% 205% at 0% 0%, #74021a 0%, #c1124f 100%);
  filter: drop-shadow(0px 10px 32px rgba(151, 42, 53, 0.33));

  font-weight: 700;
  font-size: 21.3946px;

  line-height: 100%;
  text-align: center;
  letter-spacing: -0.05em;

  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0px 4px 12px rgba(101, 0, 12, 0.42);
`;
