import type { Alice } from './Alice'
import type { AliceInquirer } from './AliceInquirer'
import type { Faber } from './Faber'
import type { FaberInquirer } from './FaberInquirer'
import type {
  Agent,
  BasicMessageStateChangedEvent,
  CredentialExchangeRecord,
  CredentialStateChangedEvent,
  JsonLdFormatDataCredentialDetail,
  ProofExchangeRecord,
  ProofStateChangedEvent,
  V2OfferCredentialMessage,
  V2RequestPresentationMessage,
} from '@aries-framework/core'
import type BottomBar from 'inquirer/lib/ui/bottom-bar'

import {
  BasicMessageEventTypes,
  BasicMessageRole,
  CredentialEventTypes,
  CredentialState,
  ProofEventTypes,
  ProofState,
  isJsonObject,
} from '@aries-framework/core'
import { ui } from 'inquirer'

import { Color, purpleText } from './OutputClass'
import { AnonCredsCredentialOffer, AnonCredsProofRequest, V1OfferCredentialMessage, V1RequestPresentationMessage } from '@aries-framework/anoncreds'

export class Listener {
  public on: boolean
  private ui: BottomBar

  public constructor() {
    this.on = false
    this.ui = new ui.BottomBar()
  }

  private turnListenerOn() {
    this.on = true
  }

  private turnListenerOff() {
    this.on = false
  }

  private printCredentialAttributes(credentialOffer: V1OfferCredentialMessage | V2OfferCredentialMessage) {
    const attachment = credentialOffer.offerAttachments[0]
    const anonCredsOfferJson = attachment.getDataAsJson<AnonCredsCredentialOffer>()
    const w3cOffer = attachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    if (anonCredsOfferJson.cred_def_id) {
      if (credentialOffer.credentialPreview) {
        const attribute = credentialOffer.credentialPreview.attributes
        console.log('\nCredential preview:\n')
        console.log(purpleText(`Credential Definition ID:${Color.Reset} ${anonCredsOfferJson.cred_def_id}`))
        console.log(purpleText(`Credential attributes:${Color.Reset}  ${JSON.stringify(attribute, null, 2)}}\n\n`))
      }
    } else if (w3cOffer && isJsonObject(w3cOffer.credential.credentialSubject)) {
      console.log('\nCredential preview:\n')
      console.log(
        purpleText(
          `Credential attributes:${Color.Reset} ${JSON.stringify(w3cOffer.credential.credentialSubject, null, 2)}\n\n`
        )
      )
    }
  }

  private printRequestedAttributes(proofRequest: V1RequestPresentationMessage | V2RequestPresentationMessage) {
    const requestJson = proofRequest.requestAttachments[0].getDataAsJson<AnonCredsProofRequest>()
    console.log(purpleText(`\n\nPresentation request:${Color.Reset} ${JSON.stringify(requestJson, null, 2)}}\n\n`))
  }

  private async newCredentialPrompt(
    alice: Alice,
    credentialRecord: CredentialExchangeRecord,
    aliceInquirer: AliceInquirer
  ) {
    const credentialOffer = await alice.agent.credentials.findOfferMessage(credentialRecord.id)
    if (credentialOffer) {
      this.printCredentialAttributes(credentialOffer)
    }
    this.turnListenerOn()
    await aliceInquirer.acceptCredentialOffer(credentialRecord)
    this.turnListenerOff()
    await aliceInquirer.processAnswer()
  }

  public credentialOfferListener(alice: Alice, aliceInquirer: AliceInquirer) {
    alice.agent.events.on(
      CredentialEventTypes.CredentialStateChanged,
      async ({ payload }: CredentialStateChangedEvent) => {
        if (payload.credentialRecord.state === CredentialState.OfferReceived) {
          await this.newCredentialPrompt(alice, payload.credentialRecord, aliceInquirer)
        }
      }
    )
  }

  public messageListener(agent: Agent, name: string) {
    agent.events.on(BasicMessageEventTypes.BasicMessageStateChanged, async (event: BasicMessageStateChangedEvent) => {
      if (event.payload.basicMessageRecord.role === BasicMessageRole.Receiver) {
        this.ui.updateBottomBar(purpleText(`\n${name} received a message: ${event.payload.message.content}\n`))
      }
    })
  }

  private async newProofRequestPrompt(alice: Alice, proofRecord: ProofExchangeRecord, aliceInquirer: AliceInquirer) {
    const proofRequest = await alice.agent.proofs.findRequestMessage(proofRecord.id)
    if (proofRequest) {
      this.printRequestedAttributes(proofRequest)
    }

    this.turnListenerOn()
    await aliceInquirer.acceptProofRequest(proofRecord)
    this.turnListenerOff()
    await aliceInquirer.processAnswer()
  }


  public proofRequestListener(alice: Alice, aliceInquirer: AliceInquirer) {
    alice.agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.RequestReceived) {
        await this.newProofRequestPrompt(alice, payload.proofRecord, aliceInquirer)
      }
    })
  }

  public proofAcceptedListener(faber: Faber, faberInquirer: FaberInquirer) {
    faber.agent.events.on(ProofEventTypes.ProofStateChanged, async ({ payload }: ProofStateChangedEvent) => {
      if (payload.proofRecord.state === ProofState.Done) {
        await faberInquirer.processAnswer()
      }
    })
  }

  public async newAcceptedPrompt(title: string, faberInquirer: FaberInquirer) {
    this.turnListenerOn()
    await faberInquirer.exitUseCase(title)
    this.turnListenerOff()
    await faberInquirer.processAnswer()
  }
}
