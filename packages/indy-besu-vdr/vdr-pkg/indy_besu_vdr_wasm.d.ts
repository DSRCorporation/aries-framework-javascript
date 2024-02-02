/* tslint:disable */
/* eslint-disable */
/**
 */
export class CredentialDefinitionRegistry {
  free(): void
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} cred_def
   * @returns {Promise<Transaction>}
   */
  static buildCreateCredentialDefinitionTransaction(
    client: LedgerClient,
    from: string,
    id: string,
    cred_def: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {any} cred_def
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildCreateSchemaEndorsingData(
    client: LedgerClient,
    id: string,
    cred_def: any
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} cred_def
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildCreateCredentialDefinitionSignedTransaction(
    client: LedgerClient,
    from: string,
    id: string,
    cred_def: any,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<Transaction>}
   */
  static buildGetCredentialDefinitionCreatedTransaction(client: LedgerClient, id: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetCredentialDefinitionQuery(
    client: LedgerClient,
    id: string,
    from_block?: bigint,
    to_block?: bigint
  ): Promise<EventQuery>
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseCredentialDefinitionCreatedResult(client: LedgerClient, bytes: Uint8Array): bigint
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseCredentialDefinitionCreatedEvent(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<any>}
   */
  static resolveCredentialDefinition(client: LedgerClient, id: string): Promise<any>
}
/**
 */
export class EthrDidRegistry {
  free(): void
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} new_owner
   * @returns {Promise<Transaction>}
   */
  static buildDidChangeOwnerTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    new_owner: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} new_owner
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidChangeOwnerEndorsingData(
    client: LedgerClient,
    did: string,
    new_owner: string
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} new_owner
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidChangeOwnerSignedTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    new_owner: string,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @returns {Promise<Transaction>}
   */
  static buildDidAddDelegateTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    delegate_type: string,
    delegate: string,
    validity: bigint
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidAddDelegateEndorsingData(
    client: LedgerClient,
    did: string,
    delegate_type: string,
    delegate: string,
    validity: bigint
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {bigint} validity
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidAddDelegateSignedTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    delegate_type: string,
    delegate: string,
    validity: bigint,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeDelegateTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    delegate_type: string,
    delegate: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidRevokeDelegateEndorsingData(
    client: LedgerClient,
    did: string,
    delegate_type: string,
    delegate: string
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {string} delegate_type
   * @param {string} delegate
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeDelegateSignedTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    delegate_type: string,
    delegate: string,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @returns {Promise<Transaction>}
   */
  static buildDidSetAttributeTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    attribute: any,
    validity: bigint
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidSetAttributeEndorsingData(
    client: LedgerClient,
    did: string,
    attribute: any,
    validity: bigint
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {bigint} validity
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidSetAttributeSignedTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    attribute: any,
    validity: bigint,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeAttributeTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    attribute: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} attribute
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildDidRevokeAttributeEndorsingData(
    client: LedgerClient,
    did: string,
    attribute: any
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} sender
   * @param {string} did
   * @param {any} attribute
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildDidRevokeAttributeSignedTransaction(
    client: LedgerClient,
    sender: string,
    did: string,
    attribute: any,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @returns {Promise<Transaction>}
   */
  static buildGetDidOwnerTransaction(client: LedgerClient, did: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @returns {Promise<Transaction>}
   */
  static buildGetDidChangedTransaction(client: LedgerClient, did: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} identity
   * @returns {Promise<Transaction>}
   */
  static buildGetIdentityNonceTransaction(client: LedgerClient, identity: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetDidEventsQuery(
    client: LedgerClient,
    did: string,
    from_block?: bigint,
    to_block?: bigint
  ): Promise<EventQuery>
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseDidChangedResult(client: LedgerClient, bytes: Uint8Array): bigint
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  static parseDidOwnerResult(client: LedgerClient, bytes: Uint8Array): string
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidAttributeChangedEventResponse(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidDelegateChangedEventResponse(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidOwnerChangedEventResponse(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseDidEventResponse(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {string} did
   * @param {any} options
   * @returns {Promise<any>}
   */
  static resolveDid(client: LedgerClient, did: string, options: any): Promise<any>
}
/**
 */
export class EventQuery {
  free(): void
}
/**
 */
export class LedgerClient {
  free(): void
  /**
   * @param {number} chain_id
   * @param {string} node_address
   * @param {any} contract_configs
   * @param {any} quorum_config
   */
  constructor(chain_id: number, node_address: string, contract_configs: any, quorum_config: any)
  /**
   * @returns {Promise<Promise<any>>}
   */
  ping(): Promise<Promise<any>>
  /**
   * @param {Transaction} transaction
   * @returns {Promise<Promise<any>>}
   */
  submitTransaction(transaction: Transaction): Promise<Promise<any>>
  /**
   * @param {EventQuery} query
   * @returns {Promise<Promise<any>>}
   */
  queryEvents(query: EventQuery): Promise<Promise<any>>
  /**
   * @param {Uint8Array} hash
   * @returns {Promise<Promise<any>>}
   */
  getReceipt(hash: Uint8Array): Promise<Promise<any>>
}
/**
 */
export class RoleControl {
  free(): void
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildAssignRoleTransaction(
    client: LedgerClient,
    from: string,
    role: number,
    account: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildRevokeRoleTransaction(
    client: LedgerClient,
    from: string,
    role: number,
    account: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {number} role
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildHasRoleTransaction(client: LedgerClient, role: number, account: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} account
   * @returns {Promise<Transaction>}
   */
  static buildGetRoleTransaction(client: LedgerClient, account: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {boolean}
   */
  static parseHasRoleResult(client: LedgerClient, bytes: Uint8Array): boolean
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {number}
   */
  static parseGetRoleResult(client: LedgerClient, bytes: Uint8Array): number
}
/**
 */
export class SchemaRegistry {
  free(): void
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} schema
   * @returns {Promise<Transaction>}
   */
  static buildCreateSchemaTransaction(client: LedgerClient, from: string, id: string, schema: any): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {any} schema
   * @returns {Promise<TransactionEndorsingData>}
   */
  static buildCreateSchemaEndorsingData(
    client: LedgerClient,
    id: string,
    schema: any
  ): Promise<TransactionEndorsingData>
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} id
   * @param {any} schema
   * @param {any} signature_data
   * @returns {Promise<Transaction>}
   */
  static buildCreateSchemaSignedTransaction(
    client: LedgerClient,
    from: string,
    id: string,
    schema: any,
    signature_data: any
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<Transaction>}
   */
  static buildGetSchemaCreatedTransaction(client: LedgerClient, id: string): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @param {bigint | undefined} [from_block]
   * @param {bigint | undefined} [to_block]
   * @returns {Promise<EventQuery>}
   */
  static buildGetSchemaQuery(
    client: LedgerClient,
    id: string,
    from_block?: bigint,
    to_block?: bigint
  ): Promise<EventQuery>
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {bigint}
   */
  static parseSchemaCreatedResult(client: LedgerClient, bytes: Uint8Array): bigint
  /**
   * @param {LedgerClient} client
   * @param {any} log
   * @returns {any}
   */
  static parseSchemaCreatedEvent(client: LedgerClient, log: any): any
  /**
   * @param {LedgerClient} client
   * @param {string} id
   * @returns {Promise<any>}
   */
  static resolveSchema(client: LedgerClient, id: string): Promise<any>
}
/**
 */
export class Transaction {
  free(): void
  /**
   * @returns {string}
   */
  to(): string
  /**
   * @returns {Uint8Array}
   */
  getSigningBytes(): Uint8Array
  /**
   * @param {any} signature_data
   */
  setSignature(signature_data: any): void
}
/**
 */
export class TransactionEndorsingData {
  free(): void
  /**
   * @returns {Uint8Array}
   */
  getSigningBytes(): Uint8Array
}
/**
 */
export class ValidatorControl {
  free(): void
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} validator_address
   * @returns {Promise<Transaction>}
   */
  static buildAddValidatorTransaction(
    client: LedgerClient,
    from: string,
    validator_address: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {string} from
   * @param {string} validator_address
   * @returns {Promise<Transaction>}
   */
  static buildRemoveValidatorTransaction(
    client: LedgerClient,
    from: string,
    validator_address: string
  ): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @returns {Promise<Transaction>}
   */
  static buildGetValidatorsTransaction(client: LedgerClient): Promise<Transaction>
  /**
   * @param {LedgerClient} client
   * @param {Uint8Array} bytes
   * @returns {any}
   */
  static parseGetValidatorsResult(client: LedgerClient, bytes: Uint8Array): any
}
