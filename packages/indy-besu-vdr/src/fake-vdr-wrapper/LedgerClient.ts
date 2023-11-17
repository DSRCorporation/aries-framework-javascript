export class LedgerClient {}

export async function createClient(chainId: number, nodeAddress: string): Promise<LedgerClient> {
  return new LedgerClient()
}
