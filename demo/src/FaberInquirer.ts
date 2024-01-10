import { clear } from 'console'
import { textSync } from 'figlet'
import { Answers, prompt } from 'inquirer'

import { BaseInquirer, ConfirmOptions } from './BaseInquirer'
import { Faber, RegistryOptions } from './Faber'
import { Listener } from './Listener'
import { Title } from './OutputClass'

export const runFaber = async () => {
  clear()
  console.log(textSync('Faber', { horizontalLayout: 'full' }))
  const faber = await FaberInquirer.build()
  await faber.requestCredentialType()
  await faber.processAnswer()
}

enum CredentialType {
  AnonCreds = 'CL AnonCreds',
  JsonLd = 'W3C JSON-LD',
}

enum PromptOptions {
  CreateConnection = 'Create connection invitation',
  CreateDid = 'Create DID',
  RegisterSchema = 'Register Schema',
  RegisterCredentialDefinition = 'Register Credential Definition',
  OfferCredential = 'Offer credential',
  RequestProof = 'Request proof',
  SendMessage = 'Send message',
  Exit = 'Exit',
  Restart = 'Restart',
}

export class FaberInquirer extends BaseInquirer {
  public faber: Faber
  public listener: Listener
  public credentialType: CredentialType = CredentialType.AnonCreds

  public constructor(faber: Faber) {
    super()
    this.faber = faber
    this.listener = new Listener()
    this.listener.messageListener(this.faber.agent, this.faber.name)
  }

  public static async build(): Promise<FaberInquirer> {
    const faber = await Faber.build()
    return new FaberInquirer(faber)
  }

  private async getJsonLdPromptChoice() {
    let promtOptions = Object.values(PromptOptions)

    this.removeOption(promtOptions, PromptOptions.RegisterCredentialDefinition)
    this.removeOption(promtOptions, PromptOptions.RegisterSchema)

    if (!this.faber.issuerId || !this.faber.outOfBandId) {
      this.removeOption(promtOptions, PromptOptions.OfferCredential)
      this.removeOption(promtOptions, PromptOptions.RequestProof)
    }

    if (!this.faber.outOfBandId) {
      this.removeOption(promtOptions, PromptOptions.SendMessage)
    }

    return prompt([this.inquireOptions(promtOptions)])
  }

  private async getAnonCredsPromptChoice() {
    let promtOptions = Object.values(PromptOptions)

    if (!this.faber.credentialDefinition || !this.faber.outOfBandId) {
      this.removeOption(promtOptions, PromptOptions.OfferCredential)
      this.removeOption(promtOptions, PromptOptions.RequestProof)
    }

    if (!this.faber.outOfBandId) {
      this.removeOption(promtOptions, PromptOptions.SendMessage)
    }

    if (!this.faber.schema) {
      this.removeOption(promtOptions, PromptOptions.RegisterCredentialDefinition)
    }

    if (!this.faber.issuerId) {
      this.removeOption(promtOptions, PromptOptions.RegisterSchema)
    }

    return prompt([this.inquireOptions(promtOptions)])
  }

  private removeOption(options: Array<String>, option: string) {
    const index = options.indexOf(option, 0)
    if (index > -1) {
      options.splice(index, 1)
    }
  }

  public async requestCredentialType() {
    let promtOptions = Object.values(CredentialType)

    const choice = await prompt([this.inquireOptions(promtOptions)])

    this.credentialType = choice.options
  }

  public async processAnswer() {
    let choice: Answers

    if (this.credentialType === CredentialType.AnonCreds) {
      choice = await this.getAnonCredsPromptChoice()
    } else {
      choice = await this.getJsonLdPromptChoice()
    }

    if (this.listener.on) return

    switch (choice.options) {
      case PromptOptions.CreateConnection:
        await this.connection()
        break
      case PromptOptions.CreateDid:
        await this.did()
        break
      case PromptOptions.RegisterSchema:
        await this.schema()
        break
      case PromptOptions.RegisterCredentialDefinition:
        await this.credentialDefinition()
        break
      case PromptOptions.OfferCredential:
        await this.credential()
        break
      case PromptOptions.RequestProof:
        await this.proof()
        break
      case PromptOptions.SendMessage:
        await this.message()
        break
      case PromptOptions.Exit:
        await this.exit()
        break
      case PromptOptions.Restart:
        await this.restart()
        return
    }
    await this.processAnswer()
  }

  public async connection() {
    await this.faber.setupConnection()
  }

  public async exitUseCase(title: string) {
    const confirm = await prompt([this.inquireConfirmation(title)])
    if (confirm.options === ConfirmOptions.No) {
      return false
    } else if (confirm.options === ConfirmOptions.Yes) {
      return true
    }
  }

  public async did() {
    const registry = await prompt([
      this.inquireOptions([RegistryOptions.indy, RegistryOptions.cheqd, RegistryOptions.indyBesu]),
    ])
    if (registry.options === RegistryOptions.indyBesu) {
      if (this.credentialType === CredentialType.AnonCreds) {
        await this.faber.createIndy2Did()
      } else {
        await this.faber.createW3CIndy2Did()
      }
    } else {
      await this.faber.importDid(registry.options)
    }
  }

  public async schema() {
    await this.faber.registerSchema()
  }

  public async credentialDefinition() {
    await this.faber.registerCredentialDefinition()
  }

  public async credential() {
    if (this.credentialType === CredentialType.AnonCreds) {
      await this.faber.issueAnonCredsCredential()
    } else {
      await this.faber.issueJsonLdCredential()
    }
  }

  public async proof() {
    await this.faber.sendProofRequest()
  }

  public async message() {
    const message = await this.inquireMessage()
    if (!message) return

    await this.faber.sendMessage(message)
  }

  public async exit() {
    const confirm = await prompt([this.inquireConfirmation(Title.ConfirmTitle)])
    if (confirm.options === ConfirmOptions.No) {
      return
    } else if (confirm.options === ConfirmOptions.Yes) {
      await this.faber.exit()
    }
  }

  public async restart() {
    const confirm = await prompt([this.inquireConfirmation(Title.ConfirmTitle)])
    if (confirm.options === ConfirmOptions.No) {
      await this.processAnswer()
      return
    } else if (confirm.options === ConfirmOptions.Yes) {
      await this.faber.restart()
      await runFaber()
    }
  }
}

void runFaber()
