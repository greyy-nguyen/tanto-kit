import { DEFAULT_CONNECTORS_CONFIG } from '../../common/connectors';
import { RONIN_WALLET_RDNS } from '../../common/constant';
import { requestEIP6963Providers } from '../../providers';
import { IConnectorConfig } from '../../types/connector';
import { ConnectorError, ConnectorErrorType } from '../../types/connector-error';
import { EIP1193Event, IEIP1193Provider } from '../../types/eip1193';
import { numberToHex } from '../../utils';
import { BaseConnector } from '../base/BaseConnector';

export class RoninWalletConnector extends BaseConnector {
  constructor(config?: IConnectorConfig) {
    super({ ...DEFAULT_CONNECTORS_CONFIG.RONIN_WALLET, ...config });
  }

  private provider?: IEIP1193Provider;

  async getProvider() {
    if (this.provider) {
      return this.provider;
    }
    const providersDetail = await requestEIP6963Providers();
    const roninProvider = providersDetail.find(detail => detail.info.rdns === RONIN_WALLET_RDNS)?.provider;

    if (!roninProvider) {
      throw new ConnectorError(ConnectorErrorType.PROVIDER_NOT_FOUND);
    }
    this.provider = roninProvider;
    return this.provider;
  }

  async connect(chainId?: number) {
    const provider = await this.getProvider();
    if (!provider) {
      throw new ConnectorError(ConnectorErrorType.PROVIDER_NOT_FOUND);
    }
    const accounts = await this.requestAccounts();
    const currentChainId = await this.getChainId();
    if (chainId && currentChainId !== chainId) {
      await this.switchChain(chainId);
    }
    this.setupProviderListeners();

    return {
      provider,
      chainId: chainId ?? currentChainId,
      account: accounts[0],
    };
  }

  async disconnect() {
    this.removeAllListeners();
    this.removeProviderListeners();
  }

  async isAuthorized() {
    const accounts = await this.getAccounts();
    return accounts.length > 0;
  }

  async getAccounts() {
    const provider = await this.getProvider();
    return provider.request<string[]>({
      method: 'eth_accounts',
    });
  }

  async switchChain(chain: number) {
    const provider = await this.getProvider();
    const chainId = provider?.request<number | string>({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(chain) }],
    });
    return !!chainId;
  }

  async getChainId() {
    const provider = await this.getProvider();
    const chainId = await provider?.request<number | string>({
      method: 'eth_chainId',
    });

    return Number(chainId);
  }

  async requestAccounts() {
    const provider = await this.getProvider();
    return provider?.request<string[]>({
      method: 'eth_requestAccounts',
    });
  }

  protected setupProviderListeners() {
    this.removeProviderListeners();
    if (this.provider) {
      this.provider.on(EIP1193Event.CONNECT, this.onConnect);
      this.provider.on(EIP1193Event.DISCONNECT, this.onDisconnect);
      this.provider.on(EIP1193Event.ACCOUNTS_CHANGED, this.onAccountsChanged);
      this.provider.on(EIP1193Event.CHAIN_CHANGED, this.onChainChanged);
    }
  }

  protected removeProviderListeners() {
    if (this.provider) {
      this.provider.removeListener(EIP1193Event.CONNECT, this.onConnect);
      this.provider.removeListener(EIP1193Event.DISCONNECT, this.onDisconnect);
      this.provider.removeListener(EIP1193Event.ACCOUNTS_CHANGED, this.onAccountsChanged);
      this.provider.removeListener(EIP1193Event.CHAIN_CHANGED, this.onChainChanged);
    }
  }
}