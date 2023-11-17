// Indy-Besu VDR Transaction

enum TransactionType {
  Read,
  Write,
}

interface Transaction {
  type_: TransactionType
  from?: string
  to: string
  chainId: number
  data: Uint8Array
  signed?: Uint8Array
}
