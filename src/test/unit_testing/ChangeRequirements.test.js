const { expect } = require("chai");

describe("FrontierMultisig", function () {
  let Frontier;
  let frontier;
  let FrontierMultisig;
  let multisig;
  let owner;
  let addr1;
  let addrs;

  beforeEach(async function () {
    Frontier = await ethers.getContractFactory("Frontier");
    frontier = await Frontier.deploy();
    await frontier.deployed();

    FrontierMultisig = await ethers.getContractFactory("FrontierMultisig");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const createWalletTx = await frontier.createWallet();
    const createWalletReceipt = await createWalletTx.wait();
    const newWalletEvent = createWalletReceipt.events.find(
      (event) => event.event === "WalletCreated"
    );
    const newWalletAddress = newWalletEvent.args.wallet;

    multisig = await FrontierMultisig.attach(newWalletAddress);
  });

  describe("Multisig operations", function () {
    it("Should add, remove, and re-add an owner, change approvals and denials required", async function () {

      expect(multisig.connect(owner).getOriginalOwners());
      expect(await multisig.isOwner(addr1.address)).to.equal(false);

      // Add a new owner
      await multisig.connect(owner).addOwner(addr1.address);
      expect(await multisig.isOwner(addr1.address)).to.equal(true);

      // Remove the added owner
      await multisig.connect(owner).removeOwner(addr1.address);
      expect(await multisig.isOwner(addr1.address)).to.equal(false);

      // Re-add the owner
      await multisig.connect(owner).addOwner(addr1.address);
      expect(await multisig.isOwner(addr1.address)).to.equal(true);

      // Change approvals required to 2
      await multisig.connect(owner).changeApprovalsRequired(2);
      expect(await multisig.getApprovalsRequired()).to.equal(2);

      // Change denials required to 2
      await multisig.connect(owner).changeDenialsRequired(2);
      expect(await multisig.getDenialsRequired()).to.equal(2);
    });
  });
});
