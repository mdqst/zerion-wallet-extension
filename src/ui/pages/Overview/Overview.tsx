import React, { useEffect, useMemo, useRef } from 'react';
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { RenderArea } from 'react-area';
import { UIText } from 'src/ui/ui-kit/UIText';
import { PageColumn } from 'src/ui/components/PageColumn';
import { Spacer } from 'src/ui/ui-kit/Spacer';
import {
  formatCurrencyToParts,
  formatCurrencyValue,
} from 'src/shared/units/formatCurrencyValue';
import { formatPercent } from 'src/shared/units/formatPercent/formatPercent';
import ArrowDownIcon from 'jsx:src/ui/assets/caret-down-filled.svg';
import ReadonlyIcon from 'jsx:src/ui/assets/visible.svg';
import { HStack } from 'src/ui/ui-kit/HStack';
import { useAddressParams } from 'src/ui/shared/user-address/useAddressParams';
import { usePendingTransactions } from 'src/ui/transactions/usePendingTransactions';
import { NeutralDecimals } from 'src/ui/ui-kit/NeutralDecimals';
import { Button } from 'src/ui/ui-kit/Button';
import { UnstyledLink } from 'src/ui/ui-kit/UnstyledLink';
import {
  SegmentedControlGroup,
  SegmentedControlLink,
} from 'src/ui/ui-kit/SegmentedControl';
import { PageBottom } from 'src/ui/components/PageBottom';
import { useQuery } from '@tanstack/react-query';
import { walletPort } from 'src/ui/shared/channels';
import { NBSP } from 'src/ui/shared/typography';
import { WalletDisplayName } from 'src/ui/components/WalletDisplayName';
import { PageFullBleedColumn } from 'src/ui/components/PageFullBleedColumn';
import { CopyButton } from 'src/ui/components/CopyButton';
import { ViewLoading } from 'src/ui/components/ViewLoading';
import { VStack } from 'src/ui/ui-kit/VStack';
import { DelayedRender } from 'src/ui/components/DelayedRender/DelayedRender';
import { useBodyStyle } from 'src/ui/components/Background/Background';
import { useProfileName } from 'src/ui/shared/useProfileName';
import {
  CenteredFillViewportView,
  FillView,
} from 'src/ui/components/FillView/FillView';
import { NavigationTitle } from 'src/ui/components/NavigationTitle';
import { getActiveTabOrigin } from 'src/ui/shared/requests/getActiveTabOrigin';
import { useIsConnectedToActiveTab } from 'src/ui/shared/requests/useIsConnectedToActiveTab';
import { requestChainForOrigin } from 'src/ui/shared/requests/requestChainForOrigin';
import {
  ENABLE_DNA_BANNERS,
  OverviewDnaBanners,
} from 'src/ui/DNA/components/DnaBanners';
import { updateAddressDnaInfo } from 'src/modules/dna-service/dna.client';
import { WalletSourceIcon } from 'src/ui/components/WalletSourceIcon';
import { useStore } from '@store-unit/react';
import { TextLink } from 'src/ui/ui-kit/TextLink';
import { getWalletGroupByAddress } from 'src/ui/shared/requests/getWalletGroupByAddress';
import { isReadonlyContainer } from 'src/shared/types/validators';
import { useCurrency } from 'src/modules/currency/useCurrency';
import { EmptyView2 } from 'src/ui/components/EmptyView';
import {
  useMainnetNetwork,
  useNetworks,
} from 'src/modules/networks/useNetworks';
import { createChain } from 'src/modules/networks/Chain';
import { usePreferences } from 'src/ui/features/preferences';
import { UnstyledButton } from 'src/ui/ui-kit/UnstyledButton';
import { useEvent } from 'src/ui/shared/useEvent';
import { useWalletPortfolio } from 'src/modules/zerion-api/hooks/useWalletPortfolio';
import { useHttpClientSource } from 'src/modules/zerion-api/hooks/useHttpClientSource';
import { SidepanelOptionsButton } from 'src/shared/sidepanel/SidepanelOptionsButton';
import { HistoryList } from '../History/History';
import { SettingsLinkIcon } from '../Settings/SettingsLinkIcon';
import { WalletAvatar } from '../../components/WalletAvatar';
import { Feed } from '../Feed';
import { ViewSuspense } from '../../components/ViewSuspense';
import { NonFungibleTokens } from './NonFungibleTokens';
import { Positions } from './Positions';
import { ActionButtonsRow } from './ActionButtonsRow';
import {
  TAB_SELECTOR_HEIGHT,
  getStickyOffset,
  TABS_OFFSET_METER_ID,
  TAB_TOP_PADDING,
  getCurrentTabsOffset,
  offsetValues,
  getMinTabContentHeight,
} from './getTabsOffset';
import { ConnectionHeader } from './ConnectionHeader';
import { BackupReminder } from './BackupReminder';

interface ChangeInfo {
  isPositive: boolean;
  isNegative: boolean;
  isNonNegative: boolean;
  isZero: boolean;
  formatted: string;
}

function formatPercentChange(value: number, locale: string): ChangeInfo {
  return {
    isPositive: value > 0,
    isNonNegative: value >= 0,
    isNegative: value < 0,
    isZero: value === 0,
    formatted: `${formatPercent(value, locale)}%`,
  };
}

function PendingTransactionsIndicator() {
  const pendingTxs = usePendingTransactions();

  if (pendingTxs.length === 0) {
    return null;
  } else {
    return (
      <svg
        viewBox="0 0 16 16"
        style={{ width: 8, height: 8, position: 'relative', top: -4 }}
      >
        <circle cx="8" cy="8" r="8" fill="var(--notice-500)" />
      </svg>
    );
  }
}

/**
 * Product requirement:
 * if we're in default mode (not testnet), but the current dapp chain
 * is a testnet, we want to hide positions and history to supposedy avoid
 * confusion for the user
 */
function TestnetworkGuard({
  dappChain: dappChainStr,
  renderGuard,
  children,
}: React.PropsWithChildren<{
  dappChain: string | null;
  renderGuard: ({
    testnetModeEnabled,
  }: {
    testnetModeEnabled: boolean;
  }) => React.ReactNode;
}>) {
  const { preferences } = usePreferences();
  const dappChain = dappChainStr ? createChain(dappChainStr) : null;
  const { networks, isLoading } = useNetworks(
    dappChainStr ? [dappChainStr] : undefined
  );
  const currentNetwork = dappChain
    ? networks?.getNetworkByName(dappChain)
    : null;
  const { data: mainnetNetwork } = useMainnetNetwork({
    chain: dappChainStr || null,
    enabled:
      Boolean(preferences?.testnetMode?.on) &&
      !isLoading &&
      !currentNetwork &&
      Boolean(dappChainStr),
  });
  const network = currentNetwork || mainnetNetwork;
  const testnetModeEnabled = Boolean(preferences?.testnetMode?.on);
  if (
    dappChainStr &&
    network &&
    testnetModeEnabled !== Boolean(network.is_testnet)
  ) {
    return renderGuard({ testnetModeEnabled });
  }
  return children;
}

function PercentChange({
  value,
  locale,
  render,
}: {
  value?: number;
  locale: string;
  render: (changeInfo: ChangeInfo) => JSX.Element;
}): JSX.Element | null {
  if (value == null) {
    return null;
  }
  return render(formatPercentChange(value, locale));
}

function CurrentAccountControls() {
  const { singleAddress, ready } = useAddressParams();
  const { data: wallet } = useQuery({
    queryKey: ['wallet/uiGetCurrentWallet'],
    queryFn: () => walletPort.request('uiGetCurrentWallet'),
  });
  if (!ready || !wallet) {
    return null;
  }
  const addressToCopy = wallet.address || singleAddress;
  return (
    <HStack gap={0} alignItems="center">
      <Button
        kind="text-primary"
        size={40}
        as={UnstyledLink}
        to="/wallet-select"
        title="Select Account"
        className="parent-hover"
        style={{
          paddingInline: '8px 4px',
          ['--button-text-hover' as string]: 'var(--neutral-800)',
          ['--parent-content-color' as string]: 'var(--neutral-500)',
          ['--parent-hovered-content-color' as string]: 'var(--black)',
        }}
      >
        <HStack gap={4} alignItems="center">
          <UIText
            kind="headline/h3"
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              alignItems: 'center',
            }}
          >
            <WalletDisplayName
              wallet={wallet}
              maxCharacters={16}
              render={(data) => (
                <span
                  style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {data.value}
                </span>
              )}
            />
            <ArrowDownIcon
              className="content-hover"
              style={{ width: 24, height: 24 }}
            />
          </UIText>
        </HStack>
      </Button>
      <CopyButton address={addressToCopy} />

      <RenderArea name="wallet-name-end" />
    </HStack>
  );
}

function DevelopmentOnly({ children }: React.PropsWithChildren) {
  if (process.env.NODE_ENV === 'development') {
    return children as JSX.Element;
  } else {
    return null;
  }
}

let didRenderOnce = false;
let didRunEffectOnce = false;
function RenderTimeMeasure() {
  // Expected measures:
  // TAB
  // Overview render: ~30ms
  // Overview render effect: ~75ms
  //
  // POPUP
  // Overview render: ~40ms
  // Overview render effect: ~74ms
  //
  if (!didRenderOnce) {
    console.timeEnd('UI render'); // eslint-disable-line no-console
  }

  useEffect(() => {
    if (!didRunEffectOnce) {
      console.timeEnd('UI render effect'); // eslint-disable-line no-console
    }
    didRunEffectOnce = true;
  }, []);
  didRenderOnce = true;
  return null;
}

function ReadonlyMode() {
  return (
    <div
      style={{
        backgroundColor: 'var(--neutral-100)',
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <UIText kind="small/accent" color="var(--neutral-500)">
        <HStack gap={8} justifyContent="space-between">
          <HStack gap={8}>
            <ReadonlyIcon />
            <span>You’re in view-only mode</span>
          </HStack>
          <TextLink
            to="/get-started/existing-select"
            style={{ color: 'var(--primary)' }}
          >
            Import Wallet
          </TextLink>
        </HStack>
      </UIText>
    </div>
  );
}

function OverviewComponent() {
  useBodyStyle(
    useMemo(() => ({ ['--background' as string]: 'var(--z-index-0)' }), [])
  );
  const { currency } = useCurrency();
  const location = useLocation();
  const { singleAddress, params, ready, singleAddressNormalized } =
    useAddressParams();
  useProfileName({ address: singleAddress, name: null });
  const { data: walletGroup } = useQuery({
    queryKey: ['getWalletGroupByAddress', singleAddress],
    queryFn: () => getWalletGroupByAddress(singleAddress),
  });
  const isReadonlyGroup =
    walletGroup && isReadonlyContainer(walletGroup.walletContainer);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterChain = searchParams.get('chain') || null;
  const setFilterChain = useEvent((value: string | null) => {
    // setSearchParams is not a stable reference: https://github.com/remix-run/react-router/issues/9304
    setSearchParams(value ? [['chain', value]] : '');
  });
  const { data, isLoading: isLoadingPortfolio } = useWalletPortfolio(
    { addresses: [params.address], currency },
    { source: useHttpClientSource() },
    { enabled: ready, refetchInterval: 40000 }
  );
  const walletPortfolio = data?.data;

  const offsetValuesState = useStore(offsetValues);

  const handleTabChange = (to: string) => {
    const isActiveTabClicked = location.pathname === to;
    window.scrollTo({
      behavior: isActiveTabClicked ? 'smooth' : 'instant',
      top: Math.min(window.scrollY, getCurrentTabsOffset(offsetValuesState)),
    });
  };

  const { data: tabData } = useQuery({
    queryKey: ['activeTab/origin'],
    queryFn: getActiveTabOrigin,
    useErrorBoundary: true,
  });
  const activeTabOrigin = tabData?.tabOrigin;
  const { data: siteChain } = useQuery({
    queryKey: ['requestChainForOrigin', activeTabOrigin],
    queryFn: () => requestChainForOrigin(activeTabOrigin),
    enabled: Boolean(activeTabOrigin),
    useErrorBoundary: true,
    suspense: false,
  });

  // Update backend record with 'platform: extension'
  useEffect(() => {
    if (singleAddressNormalized) {
      updateAddressDnaInfo(singleAddressNormalized);
    }
  }, [singleAddressNormalized]);

  const { data: isConnected } = useIsConnectedToActiveTab(
    singleAddressNormalized
  );

  const dappChain = isConnected ? siteChain?.toString() : null;

  const tabFallback = (
    <CenteredFillViewportView
      maxHeight={getMinTabContentHeight(offsetValuesState)}
    >
      <DelayedRender delay={2000}>
        <ViewLoading kind="network" />
      </DelayedRender>
    </CenteredFillViewportView>
  );

  const { preferences, setPreferences } = usePreferences();
  const isTestnetMode = Boolean(preferences?.testnetMode?.on);
  const isTestnetModeOnFirstRender = useRef<boolean | null>(isTestnetMode);
  useEffect(() => {
    // reset filter chain when switching between modes
    // so that we do not show unsupported network data
    if (isTestnetModeOnFirstRender.current !== isTestnetMode) {
      isTestnetModeOnFirstRender.current = null; // make it never equal current value
      setFilterChain(null);
    }
  }, [isTestnetMode, setFilterChain]);
  const testnetGuardView = (
    <CenteredFillViewportView
      adjustForNavigationBar={true}
      maxHeight={getMinTabContentHeight(offsetValuesState)}
    >
      <FillView>
        <EmptyView2
          title="Wrong Environment"
          message={
            <div>
              {preferences?.testnetMode?.on ? (
                <UnstyledButton
                  className="underline hover:no-underline"
                  onClick={() => {
                    setPreferences({ testnetMode: null });
                  }}
                >
                  Turn off Testnet Mode
                </UnstyledButton>
              ) : (
                <UnstyledButton
                  className="underline hover:no-underline"
                  onClick={() => {
                    setPreferences({ testnetMode: { on: true } });
                  }}
                >
                  Turn on Testnet Mode
                </UnstyledButton>
              )}{' '}
              or change your network
            </div>
          }
        />
      </FillView>
    </CenteredFillViewportView>
  );

  /**
   * Creates href such that "chain" search-param is preserved between
   * tabs, but clicking on current tab resets searchParams
   */
  const createTo = (to: string, { end = false } = {}) => {
    if (!filterChain) {
      return to;
    }
    const isActiveRoute = end
      ? location.pathname === to
      : location.pathname.startsWith(to);
    if (isActiveRoute) {
      return to;
    } else {
      return `${to}?chain=${filterChain}`;
    }
  };

  return (
    <PageColumn
      style={{
        ['--column-padding-inline' as string]: '8px',
        ['--background' as string]: 'var(--neutral-100)',
      }}
    >
      <PageFullBleedColumn
        paddingInline={true}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--navbar-index)',
          paddingInline: 0,
        }}
      >
        <ConnectionHeader />
        <BackupReminder />
        <div style={{ backgroundColor: 'var(--white)' }}>
          <Spacer height={16} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingInline: '8px 16px',
              height: 24,
            }}
          >
            <CurrentAccountControls />
            <HStack gap={0}>
              <SettingsLinkIcon />
              <SidepanelOptionsButton />
            </HStack>
          </div>
          <Spacer height={16} />
        </div>
      </PageFullBleedColumn>
      <div
        style={{
          height: isLoadingPortfolio ? 68 : undefined,
          paddingInline: 8,
        }}
      >
        <HStack gap={12} alignItems="center">
          {!isLoadingPortfolio ? (
            <WalletAvatar
              address={singleAddress}
              size={64}
              borderRadius={12}
              icon={
                <WalletSourceIcon
                  address={singleAddress}
                  groupId={null}
                  style={{ width: 24, height: 24 }}
                  borderRadius={8}
                  cutoutStroke={3}
                />
              }
            />
          ) : null}
          <VStack gap={0}>
            <UIText kind="headline/h1">
              {walletPortfolio?.totalValue != null ? (
                <NeutralDecimals
                  parts={formatCurrencyToParts(
                    walletPortfolio.totalValue,
                    'en',
                    currency
                  )}
                />
              ) : (
                NBSP
              )}
            </UIText>
            {walletPortfolio?.change24h.relative ? (
              <PercentChange
                value={walletPortfolio.change24h.relative}
                locale="en"
                render={(change) => {
                  const sign = change.isPositive ? '+' : '';
                  return (
                    <UIText
                      kind="small/regular"
                      color={
                        change.isNonNegative
                          ? 'var(--positive-500)'
                          : 'var(--negative-500)'
                      }
                    >
                      {`${sign}${change.formatted}`}{' '}
                      {walletPortfolio?.change24h.absolute
                        ? `(${formatCurrencyValue(
                            Math.abs(walletPortfolio.change24h.absolute),
                            'en',
                            currency
                          )})`
                        : ''}{' '}
                      Today
                    </UIText>
                  );
                }}
              />
            ) : (
              <UIText kind="small/regular">{NBSP}</UIText>
            )}
          </VStack>
        </HStack>
      </div>
      <Spacer height={16} />
      <div style={{ paddingInline: 'var(--column-padding-inline)' }}>
        {isReadonlyGroup ? <ReadonlyMode /> : <ActionButtonsRow />}
      </div>
      <DevelopmentOnly>
        <RenderTimeMeasure />
      </DevelopmentOnly>
      <Spacer height={isReadonlyGroup ? 16 : 24} />
      {ENABLE_DNA_BANNERS ? (
        <div style={{ paddingInline: 'var(--column-padding-inline)' }}>
          <OverviewDnaBanners address={singleAddressNormalized} />
        </div>
      ) : null}
      <div id={TABS_OFFSET_METER_ID} />
      <PageFullBleedColumn
        paddingInline={false}
        style={{
          position: 'sticky',
          top: getStickyOffset(offsetValuesState),
          zIndex: 'var(--max-layout-index)',
          backgroundColor: 'var(--background)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--white)',
            height: TAB_SELECTOR_HEIGHT,
          }}
        >
          <SegmentedControlGroup
            style={{
              paddingInline: 16,
              gap: 24,
              borderBottom: 'none',
            }}
            childrenLayout="start"
          >
            <div
              style={{
                height: 2,
                backgroundColor: 'var(--neutral-200)',
                position: 'absolute',
                bottom: -1,
                left: 16,
                right: 16,
                zIndex: 0,
              }}
            />
            <SegmentedControlLink
              to={createTo('/overview', { end: true })}
              end={true}
              onClick={() => handleTabChange('/overview')}
            >
              Tokens
            </SegmentedControlLink>
            <SegmentedControlLink
              to={createTo('/overview/nfts')}
              onClick={() => handleTabChange('/overview/nfts')}
            >
              NFTs
            </SegmentedControlLink>
            <SegmentedControlLink
              to={createTo('/overview/history')}
              onClick={() => handleTabChange('/overview/history')}
            >
              History <PendingTransactionsIndicator />
            </SegmentedControlLink>
            <SegmentedControlLink
              to={createTo('/overview/feed')}
              onClick={() => handleTabChange('/overview/feed')}
            >
              Perks
            </SegmentedControlLink>
          </SegmentedControlGroup>
        </div>
      </PageFullBleedColumn>
      <PageFullBleedColumn
        paddingInline={false}
        style={{
          position: 'relative',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--white)',
          ['--surface-background-color' as string]: 'var(--white)',
        }}
      >
        <div style={{ minHeight: getMinTabContentHeight(offsetValuesState) }}>
          <Routes>
            <Route
              path="/"
              element={
                <ViewSuspense logDelays={true} fallback={tabFallback}>
                  <NavigationTitle title={null} documentTitle="Overview" />
                  <div
                    style={{
                      height: TAB_TOP_PADDING,
                      position: 'sticky',
                      top:
                        getStickyOffset(offsetValuesState) +
                        TAB_SELECTOR_HEIGHT,
                      zIndex: 1,
                      backgroundColor: 'var(--white)',
                    }}
                  />
                  <TestnetworkGuard
                    dappChain={dappChain || null}
                    renderGuard={() => testnetGuardView}
                  >
                    <Positions
                      dappChain={dappChain || null}
                      filterChain={filterChain}
                      onChainChange={setFilterChain}
                    />
                  </TestnetworkGuard>
                </ViewSuspense>
              }
            />
            <Route
              path="/nfts"
              element={
                <ViewSuspense logDelays={true} fallback={tabFallback}>
                  <NavigationTitle title={null} documentTitle="NFTs" />
                  <Spacer height={TAB_TOP_PADDING} />
                  <TestnetworkGuard
                    dappChain={dappChain || null}
                    renderGuard={() => testnetGuardView}
                  >
                    <NonFungibleTokens
                      dappChain={dappChain || null}
                      filterChain={filterChain}
                      onChainChange={setFilterChain}
                    />
                  </TestnetworkGuard>
                </ViewSuspense>
              }
            />
            <Route
              path="/history"
              element={
                <ViewSuspense logDelays={true} fallback={tabFallback}>
                  <NavigationTitle title={null} documentTitle="History" />
                  <Spacer height={TAB_TOP_PADDING} />
                  <TestnetworkGuard
                    dappChain={dappChain || null}
                    renderGuard={() => testnetGuardView}
                  >
                    <HistoryList
                      dappChain={dappChain || null}
                      filterChain={filterChain}
                      onChainChange={setFilterChain}
                    />
                  </TestnetworkGuard>
                </ViewSuspense>
              }
            />
            <Route
              path="/feed"
              element={
                <ViewSuspense logDelays={true} fallback={tabFallback}>
                  <NavigationTitle title={null} documentTitle="Perks" />
                  <Spacer height={TAB_TOP_PADDING} />
                  <Feed />
                </ViewSuspense>
              }
            />
          </Routes>
          <PageBottom />
        </div>
      </PageFullBleedColumn>
    </PageColumn>
  );
}

export function Overview() {
  return <OverviewComponent />;
}
