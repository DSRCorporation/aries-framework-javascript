import { Key, Wallet } from "@aries-framework/core";
import { Contract, JsonRpcProvider, Signer, Provider } from "ethers";
import { IndyBesuSigner } from "./IndyBesuSigner";
import { promises as fs } from 'fs';
import { DidRegistry } from "./contracts/DidRegistry";
import { IndyBesuModuleConfig } from "../IndyBesuModuleConfig";

export class IndyBesuLedgerService {
    private readonly provider: Provider
    private readonly wallet: Wallet

    public didRegistry!: DidRegistry

    constructor(config: IndyBesuModuleConfig, wallet: Wallet) {
        this.provider = new JsonRpcProvider(config.rpcUrl)
        this.wallet = wallet
    }

    public async initContracts() {
        const didRegistryInstance = await this.createEtherContract(DidRegistry.specPath, DidRegistry.address)
        this.didRegistry = new DidRegistry(didRegistryInstance)
    }

    public createSigner(signerKey: Key): Signer {
        return new IndyBesuSigner(signerKey, this.wallet, this.provider)
    }

    private async createEtherContract(specPath: string, address: string) {
        const data = await fs.readFile(`${specPath}`, 'utf8');
        const spec = JSON.parse(data);

        return new Contract(address, spec.abi)
    }
}