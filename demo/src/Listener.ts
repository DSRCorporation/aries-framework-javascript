import type { Alice } from './Alice'
import type { AliceInquirer } from './AliceInquirer'
import type { Faber } from './Faber'
import type { FaberInquirer } from './FaberInquirer'
import type {
  V1OfferCredentialMessage,
  V1RequestPresentationMessage,
  AnonCredsProofRequest,
} from '@aries-framework/anoncreds'
import type {
  Agent,
  BasicMessageStateChangedEvent,
  CredentialExchangeRecord,
  CredentialStateChangedEvent,
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
} from '@aries-framework/core'
import { ui } from 'inquirer'

import { Color, purpleText } from './OutputClass'

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
    if (credentialOffer.credentialPreview) {
      const attribute = credentialOffer.credentialPreview.attributes
      console.log('\n\nCredential preview:')
      attribute.forEach((element) => {
        console.log(purpleText(`${element.name} ${Color.Reset}${element.value}`))
      })
      console.log('\n\n')
    }
  }

  private printRequestedAttributes(proofRequest: V1RequestPresentationMessage | V2RequestPresentationMessage) {
    const requestJson = proofRequest.requestAttachments[0].getDataAsJson<AnonCredsProofRequest>()
    console.log('\n\nPresentation request:')
    if (Object.keys(requestJson.requested_attributes).length > 0) {
      console.log(' Requested attributes:\n')
      for (const [, requested_attribute] of Object.entries(requestJson.requested_attributes)) {
        if (requested_attribute.name) {
          console.log(purpleText(` ${requested_attribute.name}`))
        }
        if (requested_attribute.names) {
          console.log(purpleText(` ${requested_attribute.names}`))
        }
      }
    }
    if (Object.keys(requestJson.requested_predicates).length > 0) {
      console.log(' Requested predicates:\n')
      for (const [, requested_predicate] of Object.entries(requestJson.requested_predicates)) {
        console.log(
          purpleText(
            ` Attribute: ${requested_predicate.name}, Type: ${requested_predicate.p_type}, Value: ${requested_predicate.p_value}`
          )
        )
      }
    }
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
    console.log('payload.proofRequest')
    console.log(proofRequest)
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
