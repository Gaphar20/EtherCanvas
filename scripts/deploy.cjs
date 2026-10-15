const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`\n========================================`);
  console.log(`Deploying EtherCanvasNFT to network: ${network.name}`);
  console.log(`========================================\n`);

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account found. Check your PRIVATE_KEY in .env");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  const EtherCanvasNFTFactory = await ethers.getContractFactory("EtherCanvasNFT");
  console.log("Deploying EtherCanvasNFT contract...");
  const etherCanvasNFT = await EtherCanvasNFTFactory.deploy();
  await etherCanvasNFT.waitForDeployment();

  const contractAddress = await etherCanvasNFT.getAddress();
  console.log(`\n🎉 EtherCanvasNFT successfully deployed to: ${contractAddress}`);

  if (network.name === "sepolia") {
    console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  }

  // Save the deployed address to src/contracts/deployedAddress.json
  const contractsDir = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const deploymentData = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    address: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(contractsDir, "deployedAddress.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`Saved deployment info to src/contracts/deployedAddress.json`);

  // Export contract ABI for frontend
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "EtherCanvasNFT.sol",
    "EtherCanvasNFT.json"
  );
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(
      path.join(contractsDir, "EtherCanvasNFT.json"),
      JSON.stringify(
        {
          contractName: artifact.contractName,
          abi: artifact.abi,
        },
        null,
        2
      )
    );
    console.log(`Exported ABI to src/contracts/EtherCanvasNFT.json`);
  }

  console.log("\nNext Steps:");
  console.log(`1. Add to your .env: VITE_NFT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Test minting in the frontend studio.\n");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
