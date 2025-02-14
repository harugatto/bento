import clsx from 'clsx';
import { useMemo } from 'react';
import styled from 'styled-components';

import { AnimatedTooltip } from '@/components/AnimatedToolTip';

import { WalletBalance } from '../types/balance';

const tierStyles = ['bg-[#89aacc]', 'bg-[#c74b62]'];

type AssetRatioItem = {
  type: string;
  percentage: number;
};

type TokenBalanceRatioBarProps = {
  className?: string;
  balances: WalletBalance[];
};

export const TokenBalanceRatioBar: React.FC<TokenBalanceRatioBarProps> = ({
  className,
  balances,
}) => {
  const assetRatios = useMemo(() => {
    const { wallet, staked } = balances.reduce(
      (acc, balance) => {
        const stakingAmount =
          'delegations' in balance
            ? balance.delegations
            : 'staking' in balance && !!balance.staking
            ? balance.balance
            : 0;
        if (!!stakingAmount) {
          acc.staked += stakingAmount;

          if ('delegations' in balance) {
            acc.wallet += balance.balance;
          }
        } else {
          acc.wallet += balance.balance;
        }
        return acc;
      },
      { wallet: 0, staked: 0 },
    );
    const total = wallet + staked;

    let items: AssetRatioItem[] = [];

    const walletPercentage = (wallet / total) * 100;
    if (walletPercentage > 0) {
      items.push({ type: 'Wallet', percentage: walletPercentage });
    }

    const stakedPercentage = (staked / total) * 100;
    if (stakedPercentage > 0) {
      items.push({ type: 'Staked', percentage: stakedPercentage });
    }

    return items;
  }, [balances]);

  return (
    <ProgressBarContainer className={clsx('mt-2', className)}>
      {assetRatios.map(({ type, percentage }, index) => {
        const className = tierStyles[index];

        return (
          <AnimatedTooltip
            key={type}
            label={`${type} ${percentage.toLocaleString()}%`}
          >
            <Bar className={className} style={{ maxWidth: `${percentage}%` }} />
          </AnimatedTooltip>
        );
      })}
    </ProgressBarContainer>
  );
};

const ProgressBarContainer = styled.ul`
  width: 100%;
  height: 5px;
  display: flex;
`;
const Bar = styled.li`
  min-width: 8px;
  border-radius: 3px;
  position: relative;

  flex: 1;
  display: flex;
  transition: all 0.2s ease-in-out;

  &:not(:last-of-type) {
    margin-right: 3px;
  }
`;
