import type { AnonCredsProofFormatService, RegisterCredentialDefinitionReturnStateFinished } from '@aries-framework/anoncreds'
import { ConnectionRecord, ConnectionStateChangedEvent, CredentialEventTypes, CredentialExchangeRecord, CredentialState, CredentialStateChangedEvent, Key, ProofEventTypes, ProofExchangeRecord, ProofState, ProofStateChangedEvent, ProofsProtocolVersionType, RequestProofOptions, V2ProofProtocol } from '@aries-framework/core'
import { IndyBesuDidCreateOptions } from '@aries-framework/indy-besu-vdr'
import type BottomBar from 'inquirer/lib/ui/bottom-bar'
import { ConnectionEventTypes, KeyType, TypedArrayEncoder, WalletKeyExistsError, utils } from '@aries-framework/core'
import { ui } from 'inquirer'

import { BaseAgent, indyNetworkConfig } from './BaseAgent'
import { Color, Output, greenText, purpleText, redText } from './OutputClass'

const faberPrivateKey = TypedArrayEncoder.fromHex(
  'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
)
const faberPublicKey = TypedArrayEncoder.fromHex(
  '03af80b90d25145da28c583359beb47b21796b2fe1a23c1511e443e7a64dfdb27d'
)

export enum RegistryOptions {
  indy = 'did:indy',
  cheqd = 'did:cheqd',
  indyBesu = 'did:indy2',
}

export class Faber extends BaseAgent {
  public outOfBandId?: string
  public credentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public anonCredsIssuerId?: string
  public ui: BottomBar
  public accountKey!: Key

  public constructor(port: number, name: string) {
    super({ port, name, useLegacyIndySdk: true })
    this.ui = new ui.BottomBar()
  }

  public static async build(): Promise<Faber> {
    const faber = new Faber(9001, 'faber')
    await faber.initializeAgent()
    await faber.initializeAccountKey()
    return faber
  }

  private async initializeAccountKey() {
    try {
      this.accountKey = await this.agent.wallet.createKey({ keyType: KeyType.K256, privateKey: faberPrivateKey })
    } catch (error) {
      if (error instanceof WalletKeyExistsError) {
        this.accountKey = new Key(faberPublicKey, KeyType.K256)
      } else {
        throw error
      }
    }
  }

  public async createIndy2Did() {
    const createdDid = await this.agent.dids.create<IndyBesuDidCreateOptions>({
      method: 'indy2',
      options: {
        network: 'testnet',
        accountKey: this.accountKey
      },
      secret: {},
    })

    if (createdDid.didState.state == 'failed') {
      throw new Error(createdDid.didState.reason)
    }

    console.log( purpleText(`Created DID${Color.Reset}: ${JSON.stringify(createdDid.didState.didDocument, null, 2)}`))

    this.anonCredsIssuerId = createdDid.didState.did
  }

  public async importDid(registry: string) {
    // NOTE: we assume the did is already registered on the ledger, we just store the private key in the wallet
    // and store the existing did in the wallet
    // indy did is based on private key (seed)
    const unqualifiedIndyDid = '2jEvRuKmfBJTRa7QowDpNN'
    const cheqdDid = 'did:cheqd:testnet:d37eba59-513d-42d3-8f9f-d1df0548b675'
    const indyDid = `did:indy:${indyNetworkConfig.indyNamespace}:${unqualifiedIndyDid}`

    const did = registry === RegistryOptions.indy ? indyDid : cheqdDid
    await this.agent.dids.import({
      did,
      overwrite: true,
      privateKeys: [
        {
          keyType: KeyType.Ed25519,
          privateKey: TypedArrayEncoder.fromString('afjdemoverysercure00000000000000'),
        },
      ],
    })
    this.anonCredsIssuerId = did
  }

  private async getConnectionRecord() {
    if (!this.outOfBandId) {
      throw Error(redText(Output.MissingConnectionRecord))
    }

    const [connection] = await this.agent.connections.findAllByOutOfBandId(this.outOfBandId)

    if (!connection) {
      throw Error(redText(Output.MissingConnectionRecord))
    }

    return connection
  }

  private async printConnectionInvite() {
    const outOfBand = await this.agent.oob.createInvitation()
    this.outOfBandId = outOfBand.id

    console.log(
      Output.ConnectionLink,
      outOfBand.outOfBandInvitation.toUrl({ domain: `http://localhost:${this.port}` }),
      '\n'
    )
  }

  private async waitForConnection() {
    if (!this.outOfBandId) {
      throw new Error(redText(Output.MissingConnectionRecord))
    }

    console.log('Waiting for Alice to finish connection...')

    const getConnectionRecord = (outOfBandId: string) =>
      new Promise<ConnectionRecord>((resolve, reject) => {

        // Start listener
        this.agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, (e) => {
          if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return

          resolve(e.payload.connectionRecord)
        })

        // Also retrieve the connection record by invitation if the event has already fired
        void this.agent.connections.findAllByOutOfBandId(outOfBandId).then(([connectionRecord]) => {
          if (connectionRecord) {
            resolve(connectionRecord)
          }
        })
      })

    const connectionRecord = await getConnectionRecord(this.outOfBandId)

    await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
    console.log(greenText(Output.ConnectionEstablished))
  }

  public async setupConnection() {
    await this.printConnectionInvite()
    await this.waitForConnection()
  }

  private printSchema(name: string, version: string, attributes: string[]) {
    console.log(`\n\nThe credential definition will look like this:\n`)
    console.log(purpleText(`Name: ${Color.Reset}${name}`))
    console.log(purpleText(`Version: ${Color.Reset}${version}`))
    console.log(purpleText(`Attributes: ${Color.Reset}${attributes[0]}, ${attributes[1]}, ${attributes[2]}\n`))
  }

  private async registerSchema() {
    if (!this.anonCredsIssuerId) {
      throw new Error(redText('Missing anoncreds issuerId'))
    }
    const schemaTemplate = {
      name: 'FaberCollege' + utils.uuid(),
      version: '1.0.0',
      attrNames: ['name', 'degree', 'date'],
      issuerId: this.anonCredsIssuerId,
    }
    this.printSchema(schemaTemplate.name, schemaTemplate.version, schemaTemplate.attrNames)
    console.log(greenText('Registering schema...\n', false))

    const { schemaState } = await this.agent.modules.anoncreds.registerSchema({
      schema: schemaTemplate,
      options: {
        endorserMode: 'internal',
        endorserDid: this.anonCredsIssuerId,
        accountKey: this.accountKey,
      },
    })

    if (schemaState.state !== 'finished') {
      throw new Error(
        `Error registering schema: ${schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'}`
      )
    }

    console.log(`Schema registered!\n${Color.Reset}`)

    console.log(purpleText(`Schema ID:${Color.Reset} ${schemaState.schemaId}\n`))

    return schemaState
  }

  private async registerCredentialDefinition(schemaId: string) {
    if (!this.anonCredsIssuerId) {
      throw new Error(redText('Missing anoncreds issuerId'))
    }

    console.log(greenText('Registering credential definition...\n', false))
    
    const { credentialDefinitionState } =
      await this.agent.modules.anoncreds.registerCredentialDefinition({
        credentialDefinition: {
          schemaId,
          issuerId: this.anonCredsIssuerId,
          tag: 'latest',
        },
        options: {
          endorserMode: 'internal',
          endorserDid: this.anonCredsIssuerId,
          accountKey: this.accountKey,
        },
      })

    if (credentialDefinitionState.state !== 'finished') {
      throw new Error(
        `Error registering credential definition: ${
          credentialDefinitionState.state === 'failed' ? credentialDefinitionState.reason : 'Not Finished'
        }}`
      )
    }

    this.credentialDefinition = credentialDefinitionState

    console.log(`Credential definition registered!\n${Color.Reset}`)

    console.log(purpleText(`Credential definition ID:${Color.Reset} ${this.credentialDefinition.credentialDefinitionId}\n`))

    return this.credentialDefinition
  }

  private async waitForAcceptCredential(recordId: string) {
    console.log('Waiting for Alice to accept credential...\n\n')

    const getCredentialExchangeRecord = (recordId: string) =>
      new Promise<CredentialExchangeRecord>((resolve, reject) => {
        
        this.agent.events.on(
          CredentialEventTypes.CredentialStateChanged,
          async ({ payload }: CredentialStateChangedEvent) => {
            if (recordId !== payload.credentialRecord.id) return

            const state = payload.credentialRecord.state
            if (state === CredentialState.Done 
                || state === CredentialState.Declined
                || state === CredentialState.Abandoned) {
              resolve(payload.credentialRecord)
            }
          }
        )
      })

    const record = await getCredentialExchangeRecord(recordId)
    
    switch (record.state) {
      case CredentialState.Done:
        console.log(greenText('Credential accepted!\n'))
        break
      case CredentialState.Declined:
        console.log(redText('Credential declined\n'))
        break
      case CredentialState.Abandoned:
        console.log(redText('Abondened\n'))
    }
  }

  public async issueCredential() {
    const schema = await this.registerSchema()
    const credentialDefinition = await this.registerCredentialDefinition(schema.schemaId)
    const connectionRecord = await this.getConnectionRecord()

    this.ui.updateBottomBar(greenText('\nSending credential offer...\n', false))

    const record = await this.agent.credentials.offerCredential({
      connectionId: connectionRecord.id,
      protocolVersion: 'v2',
      credentialFormats: {
        anoncreds: {
          attributes: [
            {
              name: 'name',
              value: 'Alice Smith',
            },
            {
              name: 'degree',
              value: 'Computer Science',
            },
            {
              name: 'date',
              value: '01/01/2022',
            },
          ],
          credentialDefinitionId: credentialDefinition.credentialDefinitionId,
        },
      },
    })

    this.ui.updateBottomBar(`\nCredential offer sent!\n\n${Color.Reset}`)

    console.log(purpleText(`Credential Record:${Color.Reset} ${JSON.stringify(record, null, 2)}`))
    
    console.log('Go to the Alice agent to accept the credential offer\n')

    await this.waitForAcceptCredential(record.id)
  }

  private async printProofFlow(print: string) {
    this.ui.updateBottomBar(print)
    await new Promise((f) => setTimeout(f, 2000))
  }

  private async newProofAttribute() {
    await this.printProofFlow(greenText(`Creating new proof attribute for 'name' ...\n`))
    const proofAttribute = {
      name: {
        name: 'name',
        restrictions: [
          {
            cred_def_id: this.credentialDefinition?.credentialDefinitionId,
          },
        ],
      },
    }

    return proofAttribute
  }

  private async waitForProof(recordId: string) {
    console.log('Waiting for Alice to present proof...\n\n')

    const getCredentialExchangeRecord = (recordId: string) =>
      new Promise<ProofExchangeRecord>((resolve, reject) => {
        
        this.agent.events.on(
          ProofEventTypes.ProofStateChanged,
          async ({ payload }: ProofStateChangedEvent) => {
            if (recordId !== payload.proofRecord.id) return

            const state = payload.proofRecord.state
            if (state === ProofState.Done 
                || state === ProofState.Declined
                || state === ProofState.Abandoned) {
              resolve(payload.proofRecord)
            }
          }
        )
      })

    const record = await getCredentialExchangeRecord(recordId)
    
    switch (record.state) {
      case ProofState.Done:
        console.log(greenText('Proof presented!\n'))

        const formatData = await this.agent.proofs.getFormatData(recordId)
        const revealedAttrs = formatData.presentation?.anoncreds?.requested_proof.revealed_attrs

        if (revealedAttrs) {
          console.log(purpleText(`Revealed attributes:${Color.Reset} ${JSON.stringify(revealedAttrs, null, 2)}\n\n`))
        }
        break
      case ProofState.Declined:
        console.log(redText('Proof request declined\n'))
        break
      case ProofState.Abandoned:
        console.log(redText('Abondened\n'))
    }
  }

  public async sendProofRequest() {
    const connectionRecord = await this.getConnectionRecord()
    const proofAttribute = await this.newProofAttribute()
    await this.printProofFlow(greenText('\nRequesting proof...\n', false))

    const request = {
      protocolVersion: 'v2',
      connectionId: connectionRecord.id,
      proofFormats: {
        anoncreds: {
          name: 'proof-request',
          version: '1.0',
          requested_attributes: proofAttribute,
        },
      },
    } as RequestProofOptions<(V2ProofProtocol<(AnonCredsProofFormatService)[]>)[]>

    const record = await this.agent.proofs.requestProof(request)

    this.ui.updateBottomBar(`\nProof request sent!\n\n${Color.Reset}`)

    console.log(purpleText(`Proof request:${Color.Reset} ${JSON.stringify(request, null, 2)}`))

    console.log(`Go to the Alice agent to accept the proof request\n`)

    await this.waitForProof(record.id)
  }

  public async sendMessage(message: string) {
    const connectionRecord = await this.getConnectionRecord()
    await this.agent.basicMessages.sendMessage(connectionRecord.id, message)
  }

  public async exit() {
    console.log(Output.Exit)
    await this.agent.wallet.delete()
    await this.agent.shutdown()
    process.exit(0)
  }

  public async restart() {
    await this.agent.shutdown()
  }
}
