const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FrontierMultisig", function () {
  let FrontierMultisig;
  let frontierMultisig;
  let owner;
  let owner2;

  beforeEach(async () => {
    FrontierMultisig = await ethers.getContractFactory("FrontierMultisig");
    [owner, owner2] = await ethers.getSigners();
    frontierMultisig = await FrontierMultisig.deploy(owner.address);
  });

  it("Submit a transaction, add owner2, increase required approvals, approve and deny transaction", async function () {

    const depositAmount = ethers.utils.parseEther("1.0"); // 1 Ether
    await owner.sendTransaction({
      to: frontierMultisig.address,
      value: depositAmount,
    });

    // Check if the contract received the Ether
    const contractBalance = await frontierMultisig.getBalance();
    expect(contractBalance).to.equal(depositAmount);



    // Submit a transaction
    const to = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const value = 1000;
    const data = "0x";
    const title = "Test transaction";
    const description = "This is a test transaction.";

    await frontierMultisig.connect(owner).submitTransaction(to, value, data, title, description);

    // Add owner2
    await frontierMultisig.connect(owner).addOwner(owner2.address);

    // Increase required approvals to 2
    await frontierMultisig.connect(owner).changeApprovalsRequired(2);

    await frontierMultisig.connect(owner).changeDenialsRequired(2);

    // Approve the transaction with owner2
    await frontierMultisig.connect(owner).approveTransaction(0);

    // Check if the transaction is still pending
    const pendingTransactions = await frontierMultisig.getCompleteTransactions();
    expect(pendingTransactions[0][0]).to.equal(to);
    expect(pendingTransactions[1][0]).to.equal(value);
    expect(pendingTransactions[2][0]).to.equal(data);
    expect(pendingTransactions[3][0]).to.equal(true); // executed
    expect(pendingTransactions[4][0]).to.equal(false); // denied
    expect(pendingTransactions[5][0]).to.equal(title);
    expect(pendingTransactions[6][0]).to.equal(description);
  });
});
