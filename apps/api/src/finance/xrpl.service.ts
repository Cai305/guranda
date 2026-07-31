import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client, Wallet, multisign } from 'xrpl';

const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';
const DISABLE_MASTER_KEY_FLAG = 4; // asfDisableMaster

function drops(xrp: number): string {
  return String(Math.round(xrp * 1_000_000));
}

function xrp(dropsStr: string): number {
  return Number(dropsStr) / 1_000_000;
}

function txResult(meta: any): string {
  return typeof meta === 'string' ? meta : meta?.TransactionResult;
}

@Injectable()
export class XrplService implements OnModuleDestroy {
  private readonly logger = new Logger(XrplService.name);
  private client: Client | null = null;
  private connecting: Promise<void> | null = null;

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client(TESTNET_URL);
    }
    if (!this.client.isConnected()) {
      if (!this.connecting) {
        this.connecting = this.client.connect().finally(() => {
          this.connecting = null;
        });
      }
      await this.connecting;
    }
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client?.isConnected()) await this.client.disconnect();
  }

  encodeSeed(seed: string): string {
    return Buffer.from(seed).toString('base64');
  }

  private decodeSeed(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString();
  }

  async createFundedWallet(): Promise<{
    address: string;
    encodedSeed: string;
  }> {
    const client = await this.getClient();
    const wallet = Wallet.generate();
    await client.fundWallet(wallet);
    this.logger.log(`Funded new XRPL wallet ${wallet.classicAddress}`);
    return {
      address: wallet.classicAddress,
      encodedSeed: this.encodeSeed(wallet.seed!),
    };
  }

  // Idempotent: funds the wallet behind an existing custodial seed if the
  // account doesn't yet exist on-chain. Safe to call before every real
  // money movement so stale/never-funded wallets self-heal.
  async ensureFunded(encodedSeed: string): Promise<string> {
    const client = await this.getClient();
    const wallet = Wallet.fromSeed(this.decodeSeed(encodedSeed));
    try {
      await client.request({
        command: 'account_info',
        account: wallet.classicAddress,
      });
    } catch (e: any) {
      if (e?.data?.error === 'actNotFound') {
        await client.fundWallet(wallet);
        this.logger.log(
          `Lazily funded existing wallet ${wallet.classicAddress}`,
        );
      } else {
        throw e;
      }
    }
    return wallet.classicAddress;
  }

  async getBalance(address: string): Promise<number> {
    const client = await this.getClient();
    try {
      const info = await client.request({
        command: 'account_info',
        account: address,
      });
      return xrp(info.result.account_data.Balance);
    } catch (e: any) {
      if (e?.data?.error === 'actNotFound') return 0;
      throw e;
    }
  }

  // SignerListSet + AccountSet(DisableMaster): after this call, the
  // creator's own key can no longer move funds — only a signerQuorum of
  // the listed committee addresses, combined, can.
  async activateMultisig(
    ownerEncodedSeed: string,
    signerAddresses: string[],
    quorum: number,
  ): Promise<void> {
    const client = await this.getClient();
    const owner = Wallet.fromSeed(this.decodeSeed(ownerEncodedSeed));

    const signerListTx = await client.autofill({
      TransactionType: 'SignerListSet',
      Account: owner.classicAddress,
      SignerQuorum: quorum,
      SignerEntries: signerAddresses.map((addr) => ({
        SignerEntry: { Account: addr, SignerWeight: 1 },
      })),
    } as any);
    const signedList = owner.sign(signerListTx);
    const listResult = await client.submitAndWait(signedList.tx_blob);
    const listCode = txResult(listResult.result.meta);
    if (listCode !== 'tesSUCCESS')
      throw new Error(`SignerListSet failed: ${listCode}`);

    const disableTx = await client.autofill({
      TransactionType: 'AccountSet',
      Account: owner.classicAddress,
      SetFlag: DISABLE_MASTER_KEY_FLAG,
    } as any);
    const signedDisable = owner.sign(disableTx);
    const disableResult = await client.submitAndWait(signedDisable.tx_blob);
    const disableCode = txResult(disableResult.result.meta);
    if (disableCode !== 'tesSUCCESS')
      throw new Error(`DisableMaster failed: ${disableCode}`);
  }

  // Single-key payment — used for member contributions into the stokvel wallet.
  async sendPayment(
    fromEncodedSeed: string,
    toAddress: string,
    amountXrp: number,
  ): Promise<string> {
    const client = await this.getClient();
    const wallet = Wallet.fromSeed(this.decodeSeed(fromEncodedSeed));
    const tx = await client.autofill({
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: toAddress,
      Amount: drops(amountXrp),
    } as any);
    const signed = wallet.sign(tx);
    const result = await client.submitAndWait(signed.tx_blob);
    const code = txResult(result.result.meta);
    if (code !== 'tesSUCCESS') throw new Error(`Payment failed: ${code}`);
    return result.result.hash;
  }

  // Prepares (autofills) a multisig Payment once — every committee signer
  // must sign this exact same transaction JSON for the signatures to combine.
  // Committee sign-off can reasonably take minutes to days in real
  // governance use — autofill's default LastLedgerSequence buffer
  // (~20 ledgers, under two minutes) would expire long before every
  // signer gets to it, silently invalidating the release. Give it a
  // generous, bounded validity window instead.
  async preparePayment(
    fromAddress: string,
    toAddress: string,
    amountXrp: number,
    signersCount: number,
  ): Promise<any> {
    const client = await this.getClient();
    const tx = await client.autofill(
      {
        TransactionType: 'Payment',
        Account: fromAddress,
        Destination: toAddress,
        Amount: drops(amountXrp),
        SigningPubKey: '',
      } as any,
      signersCount,
    );
    const currentLedger = await client.getLedgerIndex();
    return { ...tx, LastLedgerSequence: currentLedger + 50000 };
  }

  isPreparedTxExpired(preparedTx: any, currentLedgerIndex: number): boolean {
    return (
      typeof preparedTx.LastLedgerSequence === 'number' &&
      preparedTx.LastLedgerSequence <= currentLedgerIndex
    );
  }

  async getLedgerIndex(): Promise<number> {
    const client = await this.getClient();
    return client.getLedgerIndex();
  }

  signPrepared(preparedTx: any, signerEncodedSeed: string): string {
    const wallet = Wallet.fromSeed(this.decodeSeed(signerEncodedSeed));
    const signed = wallet.sign(preparedTx, true);
    return signed.tx_blob;
  }

  async submitMultisigned(txBlobs: string[]): Promise<string> {
    const client = await this.getClient();
    const combined = multisign(txBlobs);
    const result = await client.submitAndWait(combined);
    const code = txResult(result.result.meta);
    if (code !== 'tesSUCCESS')
      throw new Error(`Multisig payment failed: ${code}`);
    return result.result.hash;
  }
}
