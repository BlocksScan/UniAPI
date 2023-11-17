async function main() {
    const [deployer] = await ethers.getSigners();
  
    const XRC721 = await ethers.getContractFactory("XRC721");
    const myNFT = await XRC721.deploy("MyNFTToken", "myNFT", { gasLimit: "0x1000000"});
  
    await myNFT.waitForDeployment();
    
    console.log("Token Successfully Deployed!");
    console.log("Token address:", myNFT.target);
  
    // and now lets mint token
    const newItemId = await myNFT.mintToken(deployer.address, { gasLimit: "0x1000000"})
  
    console.log("NFT minted: ", newItemId)
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });