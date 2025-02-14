import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import styled, { css } from 'styled-components';

import { WalletBalance } from '../types/balance';
import { TooltipContent, tooltipWrapperStyle } from './AssetRatioChartTooltip';

const PIE_WIDTH = 12;

type AssetRatioChartProps = {
  tokenBalances: {
    symbol: string;
    name: string;
    logo?: string;
    tokenAddress?: string;
    balances: WalletBalance[];
    netWorth: number;
    amount: number;
    price: number;
    type?: 'nft';
  }[];
  netWorthInUSD: number;
};

export const AssetRatioChart: React.FC<AssetRatioChartProps> = ({
  tokenBalances,
  netWorthInUSD,
}) => {
  const data = useMemo(() => {
    if (tokenBalances.length < 1) {
      return [{ label: 'Empty', value: 100 }];
    }

    // merge type nft with one
    let items: { label: string; value: number }[] = [];
    const netWorthInNFTs = tokenBalances.reduce(
      (acc, info) => (info.type === 'nft' ? (acc += info.netWorth) : acc),
      0,
    );
    if (netWorthInNFTs > 0) {
      const percentage = (netWorthInNFTs / netWorthInUSD) * 100;
      items.push({
        label: 'NFTs',
        value: !percentage || isNaN(percentage) ? 0 : percentage,
      });
    }

    items = items.concat(
      tokenBalances.flatMap((info) => {
        if (info.type === 'nft') {
          return [];
        }

        const { name, netWorth } = info;
        const percentage = (netWorth / netWorthInUSD) * 100;
        if (percentage < 0.01) {
          return [];
        }
        return {
          label: name,
          value: !percentage || isNaN(percentage) ? 0 : percentage,
        };
      }),
    );

    return items;
  }, [tokenBalances]);

  return (
    <ChartContainer>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={100 - PIE_WIDTH}
            outerRadius={100}
            cornerRadius={PIE_WIDTH}
            paddingAngle={4}
            startAngle={90}
            endAngle={90 + 360}
            dataKey="value"
            minAngle={PIE_WIDTH - 2}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={
                  [
                    '#FF214A',
                    '#f72585',
                    '#FAA945',
                    '#d446ff',
                    '#7c44ff',
                    '#656fff',
                    '#4cc9f0',
                  ][index] ?? '#5b739b'
                }
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            content={({ payload }) => {
              const first = payload?.[0]?.payload;
              return (
                <TooltipContent
                  label={first?.label ?? ''}
                  value={first?.value ?? 0}
                  color={first?.fill ?? '#fff'}
                />
              );
            }}
            wrapperStyle={tooltipWrapperStyle}
          />
        </PieChart>
      </ResponsiveContainer>

      <AvatarContainer>
        <Avatar src="/assets/avatar.png" />
      </AvatarContainer>
    </ChartContainer>
  );
};

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;

  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;
`;
const AvatarContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  pointer-events: none;
`;
type AvatarProps = {
  src: string;
  enlarge?: boolean;
};
const Avatar = styled.div<AvatarProps>`
  width: 154px;
  height: 154px;
  border-radius: 50%;
  transition: all 0.3s ease-in-out;
  cursor: pointer;

  ${({ src }) =>
    src &&
    css`
      background-image: url(${src});
      background-size: 100%;
      background-position: center;
    `};

  &:hover {
    background-size: 110%;
  }
`;
