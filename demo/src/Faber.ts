import type { RegisterCredentialDefinitionReturnStateFinished } from '@aries-framework/anoncreds'
import type { ConnectionRecord, ConnectionStateChangedEvent } from '@aries-framework/core'
import type {
  IndyVdrRegisterSchemaOptions,
  IndyVdrRegisterCredentialDefinitionOptions,
} from '@aries-framework/indy-vdr'
import type BottomBar from 'inquirer/lib/ui/bottom-bar'

import {
  ConnectionEventTypes,
  CREDENTIALS_CONTEXT_V1_URL,
  KeyType,
  TypedArrayEncoder,
  utils,
} from '@aries-framework/core'
import { ui } from 'inquirer'

import { BaseAgent, indyNetworkConfig } from './BaseAgent'
import { Color, Output, greenText, purpleText, redText } from './OutputClass'

export enum RegistryOptions {
  indy = 'anoncreds did:indy',
  cheqd = 'anoncreds did:cheqd',
  cardano = 'anoncreds did:cardano',
  w3ccheqd = 'w3c did:cheqd',
  w3cdidkey = 'w3c did:key',
}

export class Faber extends BaseAgent {
  public outOfBandId?: string

  public indyAnonCredsIssuerId?: string
  public cheqdAnonCredsIssuerId?: string
  public cardanoAnonCredsIssuerId?: string
  public cheqdW3CIssuerId?: string
  public didKeyW3CIssuerId?: string

  public indyCredentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public cheqdCredentialDefinition?: RegisterCredentialDefinitionReturnStateFinished
  public cardanoCredentialDefinition?: RegisterCredentialDefinitionReturnStateFinished

  public ui: BottomBar

  public constructor(port: number, name: string) {
    super({ port, name, useLegacyIndySdk: true })
    this.ui = new ui.BottomBar()
  }

  public static async build(): Promise<Faber> {
    const faber = new Faber(9001, 'faber')
    await faber.initializeAgent()
    return faber
  }

  public async importIssuerDid(registry: string) {
    // NOTE: we assume the did is already registered on the ledger, we just store the private key in the wallet
    // and store the existing did in the wallet
    // indy did is based on private key (seed)
    const unqualifiedIndyDid = '2jEvRuKmfBJTRa7QowDpNN'
    const cheqdDid = 'did:cheqd:testnet:d37eba59-513d-42d3-8f9f-d1df0548b675'
    const indyDid = `did:indy:${indyNetworkConfig.indyNamespace}:${unqualifiedIndyDid}`

    if (registry === RegistryOptions.indy) {
      await this.agent.dids.import({
        did: indyDid,
        overwrite: true,
        privateKeys: [
          {
            keyType: KeyType.Ed25519,
            privateKey: TypedArrayEncoder.fromString('afjdemoverysercure00000000000000'),
          },
        ],
      })
      this.indyAnonCredsIssuerId = indyDid
    } else if (registry === RegistryOptions.cheqd) {
      await this.agent.dids.import({
        did: cheqdDid,
        overwrite: true,
        privateKeys: [
          {
            keyType: KeyType.Ed25519,
            privateKey: TypedArrayEncoder.fromString('afjdemoverysercure00000000000000'),
          },
        ],
      })
      this.cheqdAnonCredsIssuerId = cheqdDid
    } else if (registry === RegistryOptions.w3ccheqd) {
      await this.agent.dids.import({
        did: cheqdDid,
        overwrite: true,
        privateKeys: [
          {
            keyType: KeyType.Ed25519,
            privateKey: TypedArrayEncoder.fromString('afjdemoverysercure00000000000000'),
          },
        ],
      })
      this.cheqdW3CIssuerId = cheqdDid
    } else if (registry === RegistryOptions.cardano) {
      const didResult = await this.agent.dids.create({
        method: 'key',
        options: {
          keyType: KeyType.Ed25519,
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.cardanoAnonCredsIssuerId = didResult.didState.did!
    } else if (registry === RegistryOptions.w3cdidkey) {
      const didResult = await this.agent.dids.create({
        method: 'key',
        options: {
          keyType: KeyType.Ed25519,
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.didKeyW3CIssuerId = didResult.didState.did!
    }
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
        // Timeout of 20 seconds
        const timeoutId = setTimeout(() => reject(new Error(redText(Output.MissingConnectionRecord))), 20000)

        // Start listener
        this.agent.events.on<ConnectionStateChangedEvent>(ConnectionEventTypes.ConnectionStateChanged, (e) => {
          if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return

          clearTimeout(timeoutId)
          resolve(e.payload.connectionRecord)
        })

        // Also retrieve the connection record by invitation if the event has already fired
        void this.agent.connections.findAllByOutOfBandId(outOfBandId).then(([connectionRecord]) => {
          if (connectionRecord) {
            clearTimeout(timeoutId)
            resolve(connectionRecord)
          }
        })
      })

    const connectionRecord = await getConnectionRecord(this.outOfBandId)

    try {
      await this.agent.connections.returnWhenIsConnected(connectionRecord.id)
    } catch (e) {
      console.log(redText(`\nTimeout of 20 seconds reached.. Returning to home screen.\n`))
      return
    }
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

  private async registerSchema(issuerDid: string) {
    const schemaTemplate = {
      name: 'Faber College' + utils.uuid(),
      version: '1.0.0',
      attrNames: ['name', 'degree', 'date'],
      issuerId: issuerDid,
    }
    this.printSchema(schemaTemplate.name, schemaTemplate.version, schemaTemplate.attrNames)
    this.ui.updateBottomBar(greenText('\nRegistering schema...\n', false))

    const { schemaState } = await this.agent.modules.anoncreds.registerSchema<IndyVdrRegisterSchemaOptions>({
      schema: schemaTemplate,
      options: {
        endorserMode: 'internal',
        endorserDid: issuerDid,
      },
    })

    if (schemaState.state !== 'finished') {
      throw new Error(
        `Error registering schema: ${schemaState.state === 'failed' ? schemaState.reason : 'Not Finished'}`
      )
    }
    this.ui.updateBottomBar('\nSchema registered!\n')
    return schemaState
  }

  private async registerCredentialDefinition(issuerDid: string, schemaId: string) {
    if (!this.indyAnonCredsIssuerId) {
      throw new Error(redText('Missing anoncreds issuerId'))
    }

    this.ui.updateBottomBar('\nRegistering credential definition...\n')
    const { credentialDefinitionState } =
      await this.agent.modules.anoncreds.registerCredentialDefinition<IndyVdrRegisterCredentialDefinitionOptions>({
        credentialDefinition: {
          schemaId,
          issuerId: issuerDid,
          tag: 'latest',
        },
        options: {
          supportRevocation: false,
          endorserMode: 'internal',
          endorserDid: issuerDid,
        },
      })

    if (credentialDefinitionState.state !== 'finished') {
      throw new Error(
        `Error registering credential definition: ${
          credentialDefinitionState.state === 'failed' ? credentialDefinitionState.reason : 'Not Finished'
        }}`
      )
    }

    this.ui.updateBottomBar('\nCredential definition registered!!\n')
    return credentialDefinitionState
  }

  private getIssuerDid(registry: string) {
    switch (registry) {
      case RegistryOptions.indy:
        return this.indyAnonCredsIssuerId
      case RegistryOptions.cheqd:
        return this.cheqdAnonCredsIssuerId
      case RegistryOptions.cardano:
        return this.cardanoAnonCredsIssuerId
      case RegistryOptions.w3ccheqd:
        return this.cheqdW3CIssuerId
      case RegistryOptions.w3cdidkey:
        return this.didKeyW3CIssuerId
      default:
        return null
    }
  }

  private setCredentialDefinition(
    registry: string,
    credentialDefinition: RegisterCredentialDefinitionReturnStateFinished
  ) {
    switch (registry) {
      case RegistryOptions.indy:
        this.indyCredentialDefinition = credentialDefinition
        break
      case RegistryOptions.cheqd:
        this.cheqdCredentialDefinition = credentialDefinition
        break
      case RegistryOptions.cardano:
        this.cardanoCredentialDefinition = credentialDefinition
        break
    }
  }

  private getCredentialDefinition(registry: string) {
    switch (registry) {
      case RegistryOptions.indy:
        return this.indyCredentialDefinition
      case RegistryOptions.cheqd:
        return this.cheqdCredentialDefinition
      case RegistryOptions.cardano:
        return this.cardanoCredentialDefinition
      default:
        return null
    }
  }

  public async setupIssuer(registry: string) {
    if (registry === RegistryOptions.w3ccheqd || registry === RegistryOptions.w3cdidkey) {
      // not needed
      return
    }

    const issuerDid = this.getIssuerDid(registry)
    if (!issuerDid) {
      throw new Error(redText('Issuer is not ready'))
    }

    const schema = await this.registerSchema(issuerDid)
    const credentialDefinition = await this.registerCredentialDefinition(issuerDid, schema.schemaId)

    console.log(greenText('-----------------------------'))
    console.log(greenText(`Schema ID: ${schema.schemaId}`))
    console.log(greenText(`Credential Definition ID: ${credentialDefinition.credentialDefinitionId}`))

    this.setCredentialDefinition(registry, credentialDefinition)
  }

  public async issueW3CCredential(registry: string) {
    const connectionRecord = await this.getConnectionRecord()

    const issuerDid = this.getIssuerDid(registry)
    if (!issuerDid) {
      throw new Error(redText('Issuer is not ready'))
    }

    console.log('\n\nCredential preview:')

    const attributes = [
      {
        name: 'name',
        value: 'Bachelor of Science and Arts',
      },
    ]

    console.log('------------------')

    attributes.forEach((element) => {
      console.log(purpleText(`${element.name} ${Color.Reset}${element.value}`))
    })
    console.log('------------------')
    console.log('')
    console.log('')

    this.ui.updateBottomBar('\nSending credential offer...\n')

    const credential = {
      credential: {
        '@context': [CREDENTIALS_CONTEXT_V1_URL, 'https://www.w3.org/2018/credentials/examples/v1'],
        type: ['VerifiableCredential', 'UniversityDegreeCredential'],
        issuer: issuerDid,
        issuanceDate: '2023-12-07T12:23:48Z',
        credentialSubject: {
          degree: {
            type: 'BachelorDegree',
            name: 'Bachelor of Science and Arts',
          },
        },
      },
      options: {
        proofType: 'Ed25519Signature2018',
        proofPurpose: 'assertionMethod',
      },
    }

    await this.agent.credentials.offerCredential({
      connectionId: connectionRecord.id,
      protocolVersion: 'v2',
      credentialFormats: {
        jsonld: credential,
      },
    })
    this.ui.updateBottomBar(
      `\nCredential offer sent!\n\nGo to the Alice agent to accept the credential offer\n\n${Color.Reset}`
    )
  }

  public async issueCredential(registry: string) {
    const connectionRecord = await this.getConnectionRecord()

    const credentialDefinition = this.getCredentialDefinition(registry)
    if (!credentialDefinition) {
      throw new Error(redText('Issuer is not ready'))
    }

    console.log('\n\nCredential preview:')

    const attributes = [
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
    ]

    console.log('------------------')
    console.log(purpleText(`Credential Definition ID: ${credentialDefinition.credentialDefinitionId}`))
    console.log(purpleText(`Issuer ID: ${credentialDefinition.credentialDefinition.issuerId}`))

    attributes.forEach((element) => {
      console.log(purpleText(`${element.name} ${Color.Reset}${element.value}`))
    })
    console.log('------------------')
    console.log('')
    console.log('')

    this.ui.updateBottomBar('\nSending credential offer...\n')

    await this.agent.credentials.offerCredential({
      connectionId: connectionRecord.id,
      protocolVersion: 'v2',
      credentialFormats: {
        anoncreds: {
          attributes: attributes,
          credentialDefinitionId: credentialDefinition.credentialDefinitionId,
        },
      },
    })
    this.ui.updateBottomBar(
      `\nCredential offer sent!\n\nGo to the Alice agent to accept the credential offer\n\n${Color.Reset}`
    )
  }

  private async printProofFlow(print: string) {
    this.ui.updateBottomBar(print)
    await new Promise((f) => setTimeout(f, 2000))
  }

  private async newProofAttribute(credentialDefinitionId: string) {
    console.log(purpleText(`Credential Definition ID: ${credentialDefinitionId}`))
    console.log(purpleText(`Request attributes: 'name' and 'degree\n\n`))
    console.log('')
    console.log('')
    console.log('')

    await this.printProofFlow(greenText(`Creating request...`))
    const proofAttribute = {
      name: {
        name: 'name',
        restrictions: [
          {
            cred_def_id: credentialDefinitionId,
          },
        ],
      },
      degree: {
        name: 'degree',
        restrictions: [
          {
            cred_def_id: credentialDefinitionId,
          },
        ],
      },
    }

    return proofAttribute
  }

  public async sendProofRequest(registry: string) {
    const credentialDefinition =
      registry === RegistryOptions.indy
        ? this.indyCredentialDefinition
        : registry === RegistryOptions.cheqd
        ? this.cheqdCredentialDefinition
        : this.cardanoCredentialDefinition

    if (!credentialDefinition) {
      throw new Error(redText('Issuer is not ready'))
    }

    const connectionRecord = await this.getConnectionRecord()
    const proofAttribute = await this.newProofAttribute(credentialDefinition?.credentialDefinitionId)
    await this.printProofFlow(greenText('\nRequesting proof...\n', false))

    await this.agent.proofs.requestProof({
      protocolVersion: 'v2',
      connectionId: connectionRecord.id,
      proofFormats: {
        anoncreds: {
          name: 'proof-request',
          version: '1.0',
          requested_attributes: proofAttribute,
        },
      },
    })
    this.ui.updateBottomBar(
      `\nProof request sent!\n\nGo to the Alice agent to accept the proof request\n\n${Color.Reset}`
    )
  }

  public async sendMessage(message: string) {
    const connectionRecord = await this.getConnectionRecord()
    await this.agent.basicMessages.sendMessage(connectionRecord.id, message)
  }

  public async exit() {
    console.log(Output.Exit)
    await this.agent.shutdown()
    process.exit(0)
  }

  public async restart() {
    await this.agent.shutdown()
  }
}
