import { cachedAxios } from '@bento/client';
import { Base64 } from '@bento/common';
import clsx from 'clsx';
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { Network } from '@/dashboard/components/AddWalletModal';
import { toast } from '@/utils/toast';

declare global {
  interface Window {
    keplr: any;
    klaytn: any;
    solana: any;
  }
}

const validateAndSaveWallet = async (
  params:
    | {
        walletType: 'web3' | 'kaikas' | 'phantom';
        walletAddress: string;
        signature: string;
        nonce: string;
        networks: Network[];
      }
    | {
        walletType: 'keplr';
        walletAddress: string;
        signature: string;
        nonce: string;
        publicKeyValue: string;
        networks: Network[];
      },
) => {
  const { walletType, walletAddress, signature, nonce, networks } = params;
  const { data } = await cachedAxios.post(`/api/auth/verify/${walletType}`, {
    walletAddress,
    signature,
    nonce: Base64.encode(nonce),
    ...(walletType === 'keplr' && {
      publicKeyValue: params.publicKeyValue,
    }),
    networks: Base64.encode(networks.map((v) => v.id).join(',')),
  });
  console.log({ data });
};

type WalletSelectorProps = {
  networks?: {
    id: string;
    type: string;
    name: string;
    logo: string;
  }[];
  onSave?: () => void;
};
export const WalletConnector: React.FC<WalletSelectorProps> = ({
  networks,
  onSave,
}) => {
  const firstNetwork = useMemo(() => {
    if (!networks || networks.length === 0) {
      return undefined;
    }
    return networks[0].type;
  }, [networks]);

  const messageToBeSigned = useMemo(
    () => 'Sign this message to add your wallet',
    [],
  ); // TODO: Add username and more

  const connectMetaMask = useCallback(async () => {
    if (!networks) {
      return;
    }

    const [
      { default: Web3Modal },
      { default: WalletConnectProvider },
      { Web3Provider },
    ] = await Promise.all([
      import('web3modal'),
      import('@walletconnect/web3-provider'),
      import('@ethersproject/providers'),
    ]);

    const providerOptions = {
      injected: {
        display: {
          name: 'Metamask',
          description: 'Connect with MetaMask',
        },
        package: null,
      },
      walletconnect: {
        display: {
          name: 'WalletConnect',
          description: 'Connect with WalletConnect',
        },
        package: WalletConnectProvider,
        options: {
          infuraId: 'fcb656a7b4d14c9f9b0803a5d7475877',
        },
      },
    };

    const web3Modal = new Web3Modal({
      network: 'mainnet',
      cacheProvider: true,
      providerOptions,
      theme: 'dark',
    });

    web3Modal.clearCachedProvider();

    try {
      const instance = await web3Modal.connect();
      const provider = new Web3Provider(instance);

      const signer = provider.getSigner();
      const walletAddress = await signer.getAddress();
      const signature = await signer.signMessage(messageToBeSigned);

      const walletType = 'web3';
      await validateAndSaveWallet({
        networks,
        walletType,
        walletAddress,
        signature,
        nonce: messageToBeSigned,
      });

      onSave?.();
    } catch (error) {
      console.error(error);
    }
  }, [onSave]);

  const connectKeplr = useCallback(async () => {
    if (!networks) {
      return;
    }

    if (typeof window.keplr === 'undefined') {
      toast({
        type: 'error',
        title: 'Please install keplr extension',
      });
      return;
    }

    try {
      const chainId = 'cosmoshub-4';
      await window.keplr.enable(chainId);

      const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(chainId);
      const accounts = await offlineSigner.getAccounts();
      const walletAddress = accounts[0].address;

      const { pub_key: publicKey, signature } =
        await window.keplr.signArbitrary(
          chainId,
          walletAddress,
          messageToBeSigned,
        );

      const walletType = 'keplr';
      await validateAndSaveWallet({
        networks,
        walletType,
        walletAddress,
        signature,
        nonce: messageToBeSigned,
        publicKeyValue: publicKey.value,
      });

      onSave?.();
    } catch (error) {
      console.error(error);
    }
  }, [onSave]);

  const connectKaikas = useCallback(async () => {
    if (!networks) {
      return;
    }

    if (typeof window.klaytn === 'undefined') {
      toast({
        type: 'error',
        title: 'Please install kaikas extension',
      });
      return;
    }

    try {
      const provider = window.klaytn;
      const accounts = await provider.enable();
      const walletAddress = accounts[0];

      const Caver = await import('caver-js');
      const caver = new Caver.default(provider);
      const signature = await caver.rpc.klay.sign(
        walletAddress,
        messageToBeSigned,
      );
      const walletType = 'kaikas';

      await validateAndSaveWallet({
        networks,
        walletType,
        walletAddress,
        signature,
        nonce: messageToBeSigned,
      });

      onSave?.();
    } catch (error) {
      console.error(error);
    }
  }, [onSave]);

  const connectSolana = useCallback(async () => {
    if (!networks) {
      return;
    }

    if (typeof window.solana === 'undefined') {
      toast({
        type: 'error',
        title: 'Please install phantom extension',
      });
      return;
    }

    const resp = await window.solana.connect();
    const walletAddress = resp.publicKey.toString();

    const encodedMessage = new TextEncoder().encode(messageToBeSigned);
    const signedMessage = await window.solana.signMessage(
      encodedMessage,
      'utf8',
    );

    const signature = Buffer.from(signedMessage.signature).toString('hex');

    const walletType = 'phantom';
    await validateAndSaveWallet({
      networks,
      walletType,
      walletAddress,
      signature,
      nonce: messageToBeSigned,
    });

    onSave?.();
  }, [onSave]);

  return (
    <div className="flex gap-2">
      <Button
        className={clsx(
          'p-4 text-slate-800 font-bold bg-slate-300',
          firstNetwork !== 'evm' && 'opacity-10 cursor-not-allowed',
        )}
        onClick={firstNetwork === 'evm' ? connectMetaMask : undefined}
      >
        MetaMask or WalletConnect
      </Button>

      <Button
        className={clsx(
          'p-4 text-slate-800 font-bold bg-slate-300',
          firstNetwork !== 'evm' && 'opacity-10 cursor-not-allowed',
        )}
        onClick={firstNetwork === 'evm' ? connectKaikas : undefined}
      >
        Kaikas
      </Button>

      <Button
        className={clsx(
          'p-4 text-slate-800 font-bold bg-slate-300',
          firstNetwork !== 'cosmos-sdk' && 'opacity-10 cursor-not-allowed',
        )}
        onClick={firstNetwork === 'cosmos-sdk' ? connectKeplr : undefined}
      >
        Keplr
      </Button>

      <Button
        className={clsx(
          'p-4 text-slate-800 font-bold bg-slate-300',
          firstNetwork !== 'solana' && 'opacity-10 cursor-not-allowed',
        )}
        onClick={firstNetwork === 'solana' ? connectSolana : undefined}
      >
        Phantom
      </Button>
    </div>
  );
};

const Button = styled.button``;
