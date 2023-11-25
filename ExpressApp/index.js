// dummy
const { ethers, Signer } = require("ethers")
const fs = require('fs')

const privateKey = fs.readFileSync(".secret").toString().trim()

const QUICKNODE_HTTP_ENDPOINT = "https://erpc.apothem.network"
const provider = new ethers.providers.JsonRpcProvider(QUICKNODE_HTTP_ENDPOINT);

const contractAddress = "0xc45Ce3e3ECA5c61a7168924C07F6B4DF90D749Ff"
const contractAbi = fs.readFileSync("abi.json").toString()
const contractInstance = new ethers.Contract(contractAddress, contractAbi, provider)

const adminWallet = new ethers.Wallet(privateKey, provider)

async function getGasPrice() {
    let feeData = (await provider.getGasPrice()).toNumber()
    return feeData
}

async function getNonce(signer) {
    let nonce = await provider.getTransactionCount(signer)
    return nonce
}

async function mintNFT(ipfsUri) {
    try {
        const wallet = ethers.Wallet.createRandom()
        const gasFee = await getGasPrice()
        const walletInstance = new ethers.Wallet(wallet.privateKey, provider)

        let balance = await adminWallet.getBalance();
        console.log("Admin wallet balance: ", balance)
        console.log("wallet address: ", wallet.address)

        if (balance < 15+gasFee) {
            console.log('Not enough balance in admin account');
        } else {
            let tx = await adminWallet.sendTransaction({
                gasPrice: gasFee,
                to: walletInstance.address,
                value: ethers.utils.parseEther('15')
            });
            if(tx) {
                console.log('15 XDC transfered to ', walletInstance.address)
            }
        }

        let rawTxn = await contractInstance.populateTransaction.mintToken(walletInstance.address, ipfsUri, {
            gasPrice: gasFee, 
            nonce: getNonce(walletInstance.address)
        })
        console.log("...Submitting transaction with gas price of:", ethers.utils.formatUnits(gasFee, "gwei"))
        let signedTxn = (await walletInstance).sendTransaction(rawTxn)
        let reciept = (await signedTxn).wait()
        if (reciept) {
            console.log("Transaction is successful!!!" + '\n' + "Transaction Hash:", (await signedTxn).hash + '\n' + "Block Number: " + (await reciept).blockNumber + '\n' + "Navigate to https://explorer.apothem.network/txs/" + (await signedTxn).hash, "to see your transaction")
            return {"signedTxn": (await signedTxn).hash, "blockNumber": (await reciept).blockNumber, "privateKey": wallet.privateKey, "walletAddress": wallet.address}
        } else {
            console.log("Error submitting transaction")
        }
    } catch (e) {
        console.log("Error Caught in Catch Statement: ", e)
    }
}

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = 3000;
mongoose.connect("mongodb://localhost:27017/newdb").then(() => {
    console.log('connected to MongoDB')
}).catch((error) => {
    console.log(error)
});

const schema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    number: {
        type: Number,
        required: true
    },
    privateKey: {
        type: String
    },
    walletAddress: {
        type: String
    }
}, {collection: 'accounts'})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const FormData = mongoose.model('data', schema);

app.get("/", (req, res) => {
    res.send("Our express app is up and running");
});

app.listen(port, () => {
    console.log(`Our server is up and running on port: ${port}`);
});

app.post('/submit-form', async (req, res) => {
    try {
      const mintResult = await mintNFT('https://app.xdcdomains.xyz/api/nftdomains/metadata/silis.xdc')

      if(mintResult) {
        const formData = new FormData({
            name: req.body.name,
            email: req.body.email,
            number: req.body.number,
            privateKey: mintResult.privateKey,
            walletAddress: mintResult.walletAddress
          });

        const savedFormData = await formData.save();
        res.status(201).json({ message: 'Form data saved successfully', XRC721: mintResult.signedTxn, savedFormData: savedFormData._id });
      } else {
        console.log("Error occured while minting")
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `${error}` });
    }
  });