// dummy
const { ethers, Signer } = require("ethers")
const fs = require('fs')

const privateKey = fs.readFileSync(".secret").toString().trim()

const QUICKNODE_HTTP_ENDPOINT = "https://erpc.apothem.network"
const provider = new ethers.providers.JsonRpcProvider(QUICKNODE_HTTP_ENDPOINT);

const contractAddress = "0xC5AF1bbc15D1c99c75bEe92fa57a3a5B9FBFB705"
const contractAbi = fs.readFileSync("abi.json").toString()
const contractInstance = new ethers.Contract(contractAddress, contractAbi, provider)

const wallet = new ethers.Wallet(privateKey, provider)

async function getGasPrice() {
    let feeData = (await provider.getGasPrice()).toNumber()
    return feeData
}

async function getNonce(signer) {
    let nonce = await provider.getTransactionCount(wallet.address)
    return nonce
}

async function mintNFT(address) {
    try {
        const nonce = await getNonce(wallet)
        const gasFee = await getGasPrice()
        let rawTxn = await contractInstance.populateTransaction.mintToken(address, {
            gasPrice: gasFee, 
            nonce: nonce
        })
        console.log("...Submitting transaction with gas price of:", ethers.utils.formatUnits(gasFee, "gwei"), " - & nonce:", nonce)
        let signedTxn = (await wallet).sendTransaction(rawTxn)
        let reciept = (await signedTxn).wait()
        if (reciept) {
            console.log("Transaction is successful!!!" + '\n' + "Transaction Hash:", (await signedTxn).hash + '\n' + "Block Number: " + (await reciept).blockNumber + '\n' + "Navigate to https://explorer.apothem.network/txs/" + (await signedTxn).hash, "to see your transaction")
            return {"signedTxn": (await signedTxn).hash, "blockNumber": (await reciept).blockNumber}
        } else {
            console.log("Error submitting transaction")
        }
    } catch (e) {
        console.log("Error Caught in Catch Statement: ", e)
    }
}

//

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
      const formData = new FormData({
        name: req.body.name,
        email: req.body.email,
        number: req.body.number
      });

      const savedFormData = await formData.save();
      const mintResult = await mintNFT('0xBF740445feeC9AF4654438E0b2D96C0119884576')

      res.status(201).json({ message: 'Form data saved successfully', XRC721: mintResult, savedFormData: savedFormData._id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: `${error}` });
    }
  });