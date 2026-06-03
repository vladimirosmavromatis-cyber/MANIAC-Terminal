import { useEffect, useCallback } from 'react';

// Your wallet — receives platform fees on every swap
const FEE_ACCOUNT = 'F2Qns6j8GaA3EDD1YnxAVUXe2zuSNhQSU7t2SCAVz18b';
// 0.5% platform fee (50 basis points)
const PLATFORM_FEE_BPS = 50;

export default function JupiterSwap({ mint, symbol, onClose }) {
  const launch = useCallback(() => {
    if (!window.Jupiter) return;
    window.Jupiter.init({
      displayMode: 'modal',
      integratedTargetId: null,
      endpoint: 'https://rpc.ankr.com/solana',
      strictTokenList: false,
      defaultExplorer: 'Solscan',
      formProps: {
        initialInputMint: 'So11111111111111111111111111111111111111112', // SOL
        initialOutputMint: mint,
        initialAmount: '',
        fixedOutputMint: true,
      },
      platformFeeAndAccounts: {
        feeBps: PLATFORM_FEE_BPS,
        feeAccounts: {
          // Fee account for SOL
          'So11111111111111111111111111111111111111112': FEE_ACCOUNT,
        },
      },
      onSuccess: ({ txid }) => {
        console.log('Swap success:', txid);
      },
      onSwapError: ({ error }) => {
        console.warn('Swap error:', error);
      },
    });
  }, [mint]);

  useEffect(() => {
    // Wait for Jupiter script to load then open
    if (window.Jupiter) {
      launch();
    } else {
      const interval = setInterval(() => {
        if (window.Jupiter) {
          clearInterval(interval);
          launch();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [launch]);

  // Just a trigger — Jupiter renders its own modal
  return null;
}