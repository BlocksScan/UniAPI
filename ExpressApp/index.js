// dummy
const { ethers, Signer } = require("ethers");
const fs = require("fs");

const privateKey = fs.readFileSync(".secret").toString().trim();

const QUICKNODE_HTTP_ENDPOINT = "https://erpc.apothem.network";
const provider = new ethers.providers.JsonRpcProvider(QUICKNODE_HTTP_ENDPOINT);

const contractAddress = "0xc45Ce3e3ECA5c61a7168924C07F6B4DF90D749Ff";
const contractAbi = fs.readFileSync("abi.json").toString();
const contractInstance = new ethers.Contract(
  contractAddress,
  contractAbi,
  provider
);

const adminWallet = new ethers.Wallet(privateKey, provider);

async function getGasPrice() {
  let feeData = (await provider.getGasPrice()).toNumber();
  return feeData;
}

async function getNonce(signer) {
  let nonce = await provider.getTransactionCount(signer);
  return nonce;
}

async function mintNFT(ipfsUri, existingEntry) {
  try {
    var wallet = null;
    var walletInstance = null;
    const gasFee = await getGasPrice();

    if (existingEntry) {
        wallet = existingEntry.walletAddress
        walletInstance = new ethers.Wallet(existingEntry.privateKey, provider);
    } else {
        wallet = ethers.Wallet.createRandom();
        walletInstance = new ethers.Wallet(wallet.privateKey, provider);

        let balance = await adminWallet.getBalance();
        console.log("wallet address: ", walletInstance.address);
    
        if (balance < 1 + gasFee) {
          console.log("Not enough balance in admin account");
        } else {
          let tx = await adminWallet.sendTransaction({
            gasPrice: gasFee,
            to: walletInstance.address,
            value: ethers.utils.parseEther("1"),
          });
          if (tx) {
            console.log("1 XDC transfered to ", walletInstance.address);
          }
        }
    }

    let rawTxn = await contractInstance.populateTransaction.mintToken(
      walletInstance.address,
      ipfsUri,
      {
        gasPrice: gasFee,
        nonce: getNonce(walletInstance.address),
      }
    );
    console.log(
      "...Submitting transaction with gas price of:",
      ethers.utils.formatUnits(gasFee, "gwei")
    );
    let signedTxn = (await walletInstance).sendTransaction(rawTxn);
    let reciept = (await signedTxn).wait();
    if (reciept) {
      console.log(
        "Transaction is successful!!!" + "\n" + "Transaction Hash:",
        (await signedTxn).hash +
          "\n" +
          "Block Number: " +
          (await reciept).blockNumber +
          "\n" +
          "Navigate to https://explorer.apothem.network/txs/" +
          (await signedTxn).hash,
        "to see your transaction"
      );
      return {
        signedTxn: (await signedTxn).hash,
        blockNumber: (await reciept).blockNumber,
        privateKey: existingEntry ? existingEntry.privateKey : wallet.privateKey,
        walletAddress: walletInstance.address,
      };
    } else {
      console.log("Error submitting transaction");
    }
  } catch (e) {
    console.log("Error Caught in Catch Statement: ", e);
  }
}

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = 3000;
mongoose
  .connect("mongodb://localhost:27017/newdb")
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log(error);
  });

const schema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    privateKey: {
      type: String,
    },
    walletAddress: {
      type: String,
    },
    NFTtransfers: {
      type: [String],
    },
  },
  { collection: "accounts" }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const FormData = mongoose.model("data", schema);

app.get("/", (req, res) => {
  res.send("Our express app is up and running");
});

app.listen(port, () => {
  console.log(`Our server is up and running on port: ${port}`);
});

app.post("/submit-form", async (req, res) => {
  try {
    FormData.findOne({ email: req.body.email })
      .exec()
      .then(async (existingEntry) => {
        if (existingEntry) {
            console.log('Email is already registered, so new wallet is not created');
            const mintResult = await mintNFT(
                req.body.ipfsURI, existingEntry
              );
            const result = await FormData.updateOne(
                { _id: existingEntry._id },
                { $push: { NFTtransfers: mintResult.signedTxn } }
            );
            console.log(result);
            res
              .status(201)
              .json({
                message: "Form data updated successfully",
                XRC721: mintResult.signedTxn,
                savedFormData: result._id,
              });
        } else {
          const mintResult = await mintNFT(
                req.body.ipfsURI, null
          );
          const formData = new FormData({
            name: req.body.name,
            email: req.body.email,
            number: req.body.number,
            privateKey: mintResult.privateKey,
            walletAddress: mintResult.walletAddress,
            NFTtransfers: [mintResult.signedTxn],
          });
          const savedFormData = await formData.save();
          res
            .status(201)
            .json({
              message: "Form data saved successfully",
              XRC721: mintResult.signedTxn,
              savedFormData: savedFormData._id,
            });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `${error}` });
  }
});
