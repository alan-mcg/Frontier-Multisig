const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FrontierMultisig", function () {
  let FrontierMultisig;
  let frontierMultisig;
  let owner;

  beforeEach(async () => {
    FrontierMultisig = await ethers.getContractFactory("FrontierMultisig");
    [owner] = await ethers.getSigners();
    frontierMultisig = await FrontierMultisig.deploy(owner.address);
  });

  it("Should submit a transaction and check if it's a pending transaction", async function () {
    const to = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const value = 1000;
    const data = "0x";
    const title = "Test transaction";
    const description = "This is a test transaction.";

    await frontierMultisig.connect(owner).submitTransaction(to, value, data, title, description);

    const pendingTransactions = await frontierMultisig.getPendingTransactions();
    expect(pendingTransactions[0][0]).to.equal(to);
    expect(pendingTransactions[1][0]).to.equal(value);
    expect(pendingTransactions[2][0]).to.equal(data);
    expect(pendingTransactions[3][0]).to.equal(false); // executed
    expect(pendingTransactions[4][0]).to.equal(false); // denied
    expect(pendingTransactions[5][0]).to.equal(title);
    expect(pendingTransactions[6][0]).to.equal(description);
  });
});
