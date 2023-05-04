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

  it("Should deposit Ether, submit a transaction, approve it and check if it's in completed transactions", async function () {
    // Deposit Ether into the contract
    const depositAmount = ethers.utils.parseEther("1.0"); // 1 Ether
    await owner.sendTransaction({
      to: frontierMultisig.address,
      value: depositAmount,
    });

    // Check if the contract received the Ether
    const contractBalance = await frontierMultisig.getBalance();
    expect(contractBalance).to.equal(depositAmount);


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

    // Approve the transaction
    await frontierMultisig.connect(owner).approveTransaction(0);

    // Get the approval count
    const approvalCount = await frontierMultisig.getTransactionApprovalCount(0);

    // Check if the transaction has 1 approval (from the owner)
    expect(approvalCount).to.equal(1);

    // Check if the transaction is in completedTransactions
    const completedTransactions = await frontierMultisig.getCompleteTransactions();
    expect(completedTransactions[0][0]).to.equal(to);
    expect(completedTransactions[1][0]).to.equal(value);
    expect(completedTransactions[2][0]).to.equal(data);
    expect(completedTransactions[3][0]).to.equal(true); // executed
    expect(completedTransactions[4][0]).to.equal(false); // denied
    expect(completedTransactions[5][0]).to.equal(title);
    expect(completedTransactions[6][0]).to.equal(description);
  });
});
