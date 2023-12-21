import fs from 'fs'
import path from 'path'

export const contractConfigs = [
  {
    address: '0x0000000000000000000000000000000000003333',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/DidRegistryInterface.json'), 'utf8')),
  },
  {
    address: '0x0000000000000000000000000000000000005555',
    spec: JSON.parse(fs.readFileSync(path.resolve(__dirname, './abi/SchemaRegistryInterface.json'), 'utf8')),
  },
  {
    address: '0x0000000000000000000000000000000000004444',
    spec: JSON.parse(
      fs.readFileSync(path.resolve(__dirname, './abi/CredentialDefinitionRegistryInterface.json'), 'utf8')
    ),
  },
]
