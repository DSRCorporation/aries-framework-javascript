import { Key, Wallet, injectable } from '@aries-framework/core'
import { Contract, JsonRpcProvider, Provider, Signer } from 'ethers'
import { promises as fs } from 'fs'
import { IndyBesuModuleConfig } from '../IndyBesuModuleConfig'
import { CredentialDefinitionRegistry, DidRegistry, SchemaRegistry } from './contracts'
import { IndyBesuSigner } from './IndyBesuSigner'

@injectable()
export class IndyBesuLedgerService {
  private readonly provider: Provider

  public didRegistry!: DidRegistry
  public schemaRegistry!: SchemaRegistry
  public credentialDefinitionRegistry!: CredentialDefinitionRegistry

  constructor(config: IndyBesuModuleConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl)
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

  public createSigner(signerKey: Key, wallet: Wallet): Signer {
    return new IndyBesuSigner(signerKey, wallet, this.provider)
  }

  public destroyProvider() {
    this.provider.destroy()
  }

  private async createEthersContract(specPath: string, address: string) {
    const data = await fs.readFile(`${specPath}`, 'utf8')
    const spec = JSON.parse(data)

    return new Contract(address, spec.abi, this.provider)
  }
}
