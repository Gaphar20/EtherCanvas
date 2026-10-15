const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EtherCanvasNFT", function () {
  let etherCanvasNFT;
  let owner;
  let artist;
  let collector;

  beforeEach(async function () {
    [owner, artist, collector] = await ethers.getSigners();
    const EtherCanvasNFTFactory = await ethers.getContractFactory("EtherCanvasNFT");
    etherCanvasNFT = await EtherCanvasNFTFactory.deploy();
    await etherCanvasNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await etherCanvasNFT.name()).to.equal("EtherCanvas");
      expect(await etherCanvasNFT.symbol()).to.equal("ECANVAS");
    });

    it("Should initialize with zero minted tokens and nextTokenId at 1", async function () {
      expect(await etherCanvasNFT.totalMinted()).to.equal(0n);
      expect(await etherCanvasNFT.nextTokenId()).to.equal(1n);
    });
  });

  describe("Minting", function () {
    const sampleUri1 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/1.json";
    const sampleUri2 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/2.json";

    it("Should allow any user to mint an NFT to themselves", async function () {
      const tx = await etherCanvasNFT.connect(artist).mint(artist.address, sampleUri1);
      await tx.wait();

      expect(await etherCanvasNFT.totalMinted()).to.equal(1n);
      expect(await etherCanvasNFT.nextTokenId()).to.equal(2n);
      expect(await etherCanvasNFT.ownerOf(1n)).to.equal(artist.address);
      expect(await etherCanvasNFT.balanceOf(artist.address)).to.equal(1n);
      expect(await etherCanvasNFT.tokenURI(1n)).to.equal(sampleUri1);
    });

    it("Should allow minting to a different recipient address", async function () {
      const tx = await etherCanvasNFT.connect(artist).mint(collector.address, sampleUri1);
      await tx.wait();

      expect(await etherCanvasNFT.ownerOf(1n)).to.equal(collector.address);
      expect(await etherCanvasNFT.balanceOf(collector.address)).to.equal(1n);
      expect(await etherCanvasNFT.balanceOf(artist.address)).to.equal(0n);
    });

    it("Should increment token IDs sequentially for consecutive mints", async function () {
      await etherCanvasNFT.connect(artist).mint(artist.address, sampleUri1);
      await etherCanvasNFT.connect(collector).mint(collector.address, sampleUri2);

      expect(await etherCanvasNFT.totalMinted()).to.equal(2n);
      expect(await etherCanvasNFT.nextTokenId()).to.equal(3n);

      expect(await etherCanvasNFT.ownerOf(1n)).to.equal(artist.address);
      expect(await etherCanvasNFT.tokenURI(1n)).to.equal(sampleUri1);

      expect(await etherCanvasNFT.ownerOf(2n)).to.equal(collector.address);
      expect(await etherCanvasNFT.tokenURI(2n)).to.equal(sampleUri2);
    });

    it("Should emit the Minted event with correct indexed args and URI", async function () {
      await expect(etherCanvasNFT.connect(artist).mint(collector.address, sampleUri1))
        .to.emit(etherCanvasNFT, "Minted")
        .withArgs(collector.address, 1n, sampleUri1);
    });

    it("Should revert if recipient is zero address", async function () {
      await expect(
        etherCanvasNFT.connect(artist).mint(ethers.ZeroAddress, sampleUri1)
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should revert if URI is empty", async function () {
      await expect(
        etherCanvasNFT.connect(artist).mint(artist.address, "")
      ).to.be.revertedWith("URI cannot be empty");
    });

    it("Should revert when querying tokenURI for non-existent token", async function () {
      await expect(
        etherCanvasNFT.tokenURI(999n)
      ).to.be.reverted;
    });
  });
});
