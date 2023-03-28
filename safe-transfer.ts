import * as dotenv from 'dotenv'
import Safe, { SafeFactory, SafeAccountConfig, ConnectSafeConfig, ContractNetworksConfig } from '@safe-global/safe-core-sdk'
import { SafeTransactionDataPartial } from '@safe-global/safe-core-sdk-types'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import SafeServiceClient from '@safe-global/safe-service-client'
import { ethers } from 'ethers'

dotenv.config()

async function main() {

// Any address can be used. In this example you will use vitalik.eth
const destination = '0x03AD407840b1C794E4D68803FA101C465289880e'
const amount = ethers.utils.parseUnits('0.0001', 'ether').toString()

const safeTransactionData: SafeTransactionDataPartial = {
  to: destination,
  data: '0x',
  value: amount
}

const RPC_URL = 'https://eth-goerli.public.blastapi.io'
const provider = new ethers.providers.JsonRpcProvider(RPC_URL)

// Initialize signers
const owner1Signer = new ethers.Wallet(process.env.OWNER_1_PRIVATE_KEY!, provider)
const owner2Signer = new ethers.Wallet(process.env.OWNER_2_PRIVATE_KEY!, provider)
const owner3Signer = new ethers.Wallet(process.env.OWNER_3_PRIVATE_KEY!, provider)

const ethAdapterOwner1 = new EthersAdapter({
  ethers,
  signerOrProvider: owner1Signer
})

// Additional one: 0x9b33135543548560Ae6d64bF6337CA4C040c8b52
const safeSdkOwner1 = await Safe.create({
  ethAdapter: ethAdapterOwner1,
  safeAddress: '0xAaFD508D3142467EE0d351F0Eaf2c8ef6aE6d651'
});

// Create a Safe transaction with the provided parameters
const safeTransaction = await safeSdkOwner1.createTransaction({ safeTransactionData })

const txServiceUrl = 'https://safe-transaction-goerli.safe.global'
const safeService = new SafeServiceClient({ txServiceUrl, ethAdapter: ethAdapterOwner1 })

// Deterministic hash based on transaction parameters
const safeTxHash = await safeSdkOwner1.getTransactionHash(safeTransaction)

// Sign transaction to verify that the transaction is coming from owner 1
const senderSignature = await safeSdkOwner1.signTransactionHash(safeTxHash)
console.log("Sender Signature", senderSignature);

const safeAddress = safeSdkOwner1.getAddress()
console.log('SafeAddress', safeAddress);

await safeService.proposeTransaction({
  safeAddress,
  safeTransactionData: safeTransaction.data,
  safeTxHash,
  senderAddress: await owner1Signer.getAddress(),
  senderSignature: senderSignature.data,
})

const pendingTransactions = await (await safeService.getPendingTransactions(safeAddress)).results
console.log('Pending Transactions', pendingTransactions);

const transaction = pendingTransactions[0]
const safeTxHash2 = transaction.safeTxHash

const ethAdapterOwner2 = new EthersAdapter({
  ethers,
  signerOrProvider: owner2Signer
})

const safeSdkOwner2 = await Safe.create({
  ethAdapter: ethAdapterOwner2,
  safeAddress
})

const signature = await safeSdkOwner2.signTransactionHash(safeTxHash2)
console.log("Owner #2 Signature", signature);

const response = await safeService.confirmTransaction(safeTxHash2, signature.data)
console.log('Response from Signer#2 signature from Safe Service', response);

const safeTransaction2 = await safeService.getTransaction(safeTxHash2)
console.log('Safe Transaction response from service', safeTransaction2);

const executeTxResponse = await safeSdkOwner1.executeTransaction(safeTransaction2)
const receipt = await executeTxResponse.transactionResponse?.wait()

console.log('Transaction executed:')
console.log(`https://goerli.etherscan.io/tx/${receipt!.transactionHash}`)

}

main();