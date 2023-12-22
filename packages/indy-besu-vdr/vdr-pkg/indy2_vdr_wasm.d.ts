/* tslint:disable */
/* eslint-disable */
/**
*/
export class CredentialDefinitionRegistry {
  free(): void;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {any} cred_def
* @returns {Promise<Transaction>}
*/
  static buildCreateCredentialDefinitionTransaction(client: LedgerClient, from: string, cred_def: any): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} id
* @returns {Promise<Transaction>}
*/
  static buildResolveCredentialDefinitionTransaction(client: LedgerClient, id: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {Uint8Array} bytes
* @returns {any}
*/
  static parseResolveCredentialDefinitionResult(client: LedgerClient, bytes: Uint8Array): any;
}
/**
*/
export class IndyDidRegistry {
  free(): void;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {any} did_doc
* @returns {Promise<Transaction>}
*/
  static buildCreateDidTransaction(client: LedgerClient, from: string, did_doc: any): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {any} did_doc
* @returns {Promise<Transaction>}
*/
  static buildUpdateDidTransaction(client: LedgerClient, from: string, did_doc: any): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {string} did
* @returns {Promise<Transaction>}
*/
  static buildDeactivateDidTransaction(client: LedgerClient, from: string, did: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} did
* @returns {Promise<Transaction>}
*/
  static buildResolveDidTransaction(client: LedgerClient, did: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {Uint8Array} bytes
* @returns {any}
*/
  static parseResolveDidResult(client: LedgerClient, bytes: Uint8Array): any;
}
/**
*/
export class LedgerClient {
  free(): void;
/**
* @param {number} chain_id
* @param {string} node_address
* @param {any} contract_configs
*/
  constructor(chain_id: number, node_address: string, contract_configs: any);
/**
* @returns {Promise<any>}
*/
  ping(): Promise<any>;
/**
* @param {Transaction} transaction
* @returns {Promise<any>}
*/
  submitTransaction(transaction: Transaction): Promise<any>;
/**
* @param {Uint8Array} hash
* @returns {Promise<string>}
*/
  getReceipt(hash: Uint8Array): Promise<string>;
}
/**
*/
export class RoleControl {
  free(): void;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {number} role
* @param {string} account
* @returns {Promise<Transaction>}
*/
  static buildAssignRoleTransaction(client: LedgerClient, from: string, role: number, account: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {number} role
* @param {string} account
* @returns {Promise<Transaction>}
*/
  static buildRevokeRoleTransaction(client: LedgerClient, from: string, role: number, account: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {number} role
* @param {string} account
* @returns {Promise<Transaction>}
*/
  static buildHasRoleTransaction(client: LedgerClient, role: number, account: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} account
* @returns {Promise<Transaction>}
*/
  static buildGetRoleTransaction(client: LedgerClient, account: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {Uint8Array} bytes
* @returns {boolean}
*/
  static parseHasRoleResult(client: LedgerClient, bytes: Uint8Array): boolean;
/**
* @param {LedgerClient} client
* @param {Uint8Array} bytes
* @returns {number}
*/
  static parseGetRoleResult(client: LedgerClient, bytes: Uint8Array): number;
}
/**
*/
export class SchemaRegistry {
  free(): void;
/**
* @param {LedgerClient} client
* @param {string} from
* @param {any} schema
* @returns {Promise<Transaction>}
*/
  static buildCreateSchemaTransaction(client: LedgerClient, from: string, schema: any): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {string} id
* @returns {Promise<Transaction>}
*/
  static buildResolveSchemaTransaction(client: LedgerClient, id: string): Promise<Transaction>;
/**
* @param {LedgerClient} client
* @param {Uint8Array} bytes
* @returns {any}
*/
  static parseResolveSchemaResult(client: LedgerClient, bytes: Uint8Array): any;
}
/**
*/
export class Transaction {
  free(): void;
/**
* @returns {string}
*/
  to(): string;
/**
* @returns {Uint8Array}
*/
  getSigningBytes(): Uint8Array;
/**
* @param {any} signature_data
*/
  setSignature(signature_data: any): void;
}
