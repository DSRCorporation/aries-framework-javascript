import { Key, Wallet } from '@aries-framework/core'
import { Contract, JsonRpcProvider, Signer, Provider } from 'ethers'
import { IndyBesuSigner } from './IndyBesuSigner'
import { promises as fs } from 'fs'
import { DidRegistry } from './contracts/DidRegistry'
import { IndyBesuModuleConfig } from '../IndyBesuModuleConfig'
import { SchemaRegistry } from './contracts/SchemaRegistry'
import { CredentialDefinitionRegistry } from './contracts/CredentialDefinitionRegistry'

export class IndyBesuLedgerService {
  private readonly provider: Provider
  private readonly wallet: Wallet

  public didRegistry!: DidRegistry
  public schemaRegistry!: SchemaRegistry
  public credentialDefinitionRegistry!: CredentialDefinitionRegistry

  constructor(config: IndyBesuModuleConfig, wallet: Wallet) {
    this.provider = new JsonRpcProvider(config.rpcUrl)
    this.wallet = wallet
  }

  public async initContracts() {
    const ethersDidRegistry = await this.createEthersContract(DidRegistry.specPath, DidRegistry.address)
    this.didRegistry = new DidRegistry(ethersDidRegistry)

    const ethersSchemaRegistry = await this.createEthersContract(SchemaRegistry.specPath, SchemaRegistry.address)
    this.schemaRegistry = new SchemaRegistry(ethersSchemaRegistry)

    const ethersCredentialDefinitionRegistry = await this.createEthersContract(
      CredentialDefinitionRegistry.specPath,
      CredentialDefinitionRegistry.address
    )
    this.credentialDefinitionRegistry = new CredentialDefinitionRegistry(ethersCredentialDefinitionRegistry)
  }

  public createSigner(signerKey: Key): Signer {
    return new IndyBesuSigner(signerKey, this.wallet, this.provider)
  }

  private async createEthersContract(specPath: string, address: string) {
    const data = await fs.readFile(`${specPath}`, 'utf8')
    const spec = JSON.parse(data)

    return new Contract(address, spec.abi)
  }
}
