
import styles from '@/styles/Home.module.css'
import { ethers } from 'ethers'
import window from 'global'
import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';


import {
  frontierMultisigAddress, frontierAddress
} from '../../config.js'

import Frontier from '../../artifacts/contracts/Frontier.sol/Frontier.json'
import FrontierMultisig from '../../artifacts/contracts/FrontierMultisig.sol/FrontierMultisig.json'


// const frontierContract = new ethers.Contract(frontierAddress, Frontier.abi, ethers.getDefaultProvider());
// const frontierMultisigContract = new ethers.Contract(frontierMultisigAddress, FrontierMultisig.abi, ethers.getDefaultProvider());

const transactionHistory = [
  { id: "Tx1234", tag: "Payment" },
  { id: "Tx5678", tag: "Refund" },
  { id: "Tx91011", tag: "Withdrawal" },
  { id: "Tx121314", tag: "Deposit" },
];


function IndexPage({ currentPage }) {

  const [userWallets, setUserWallets] = useState([]);
  const [addressToSend, setAddressToSend] = useState('');
  const [amountToSend, setAmountToSend] = useState('');
  const [pendingTx, setPendingTx] = useState([]);
  const [completeTx, setCompleteTx] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState('');
  const [balance, setBalance] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetAddress, setTargetAddress] = useState("");
  const [owners, setOwners] = useState([]);
  const [approvalsRequired, setApprovalsRequired] = useState('');
  const [displayedApprovals, setDisplayedApprovals] = useState(1);
  const [denialsRequired, setDenialsRequired] = useState('');
  const [displayedDenials, setDisplayedDenials] = useState(1);


  async function createNewWallet() {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const frontierContract = new ethers.Contract(frontierAddress, Frontier.abi, signer);
      const wallet = await frontierContract.createWallet();
      const receipt = await wallet.wait();
      if (receipt) {
        viewMyWallets();
      }
      console.log('New wallet address:', wallet);
    } catch (error) {
      setErrorMessage('Error creating a new wallet: ' + error.message);
    }
  }
  
  async function viewMyWallets() {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const frontierContract = new ethers.Contract(frontierAddress, Frontier.abi, signer);
      const userAddress = await signer.getAddress();
      const wallets = await frontierContract.getUserWallets(userAddress);
      if (wallets.length > 0) {
        setUserWallets(wallets);
        console.log('User wallets:', wallets);
      } else {
        console.log('No user wallets found');
      }
      console.log('User wallets:', wallets);
    } catch (error) {
      setErrorMessage('Error viewing wallets: ' + error.message);
    }
  }

  async function submitTransaction() {
    if (!activeWallet) {
        alert("Please select an active wallet first.");
        return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
        console.log("to: " + addressToSend, "value: " + parseUnits(amountToSend));
        const tx = await frontierMultisigContract.submitTransaction(addressToSend, parseUnits(amountToSend), "0x");
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        fetchPendingTransactions();
    } catch (error) {
        console.error("Error submitting transaction:", error.message);
    }
  }

  async function depositToMultisig() {
    console.log("Deposit button clicked");
  
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
  
    if (!depositAmount) {
      alert("Invalid deposit amount.");
      return;
    }
  
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: activeWallet,
        value: parseUnits(depositAmount),
      });

      const receipt = await tx.wait();
      console.log("Deposit transaction receipt:", receipt);
      fetchBalance();
    } catch (error) {
      console.error("Error depositing to multisig wallet:", error.message);
    }
  }

  async function fetchBalance() {
    if (!activeWallet) {
      return;
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const walletBalance = await provider.getBalance(activeWallet);
      setBalance(parseUnitsBack(walletBalance));
    } catch (error) {
      setErrorMessage("Error fetching wallet balance: " + error.message);
    }
  }

  async function fetchPendingTransactions() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    const pendingTransactionsResult = await frontierMultisigContract.getPendingTransactions();
    
    const pendingTransactions = pendingTransactionsResult[0].map((to, index) => {
      return {
        txId: pendingTransactionsResult[0][index], // Add this line
        to,
        value: pendingTransactionsResult[1][index],
        data: pendingTransactionsResult[2][index],
        executed: pendingTransactionsResult[3][index],
        denied: pendingTransactionsResult[4][index],
      };
    });
    console.log("Pending transactions:", pendingTransactions);
    const pendingTxWithDetails = await Promise.all(
      pendingTransactions.map(async (tx, index) => {
        const approvals = await frontierMultisigContract.getTransactionApprovals(index);
        const denials = await frontierMultisigContract.getTransactionDenials(index);
        const approvalsRequired = await frontierMultisigContract.getApprovalsRequired();
        const denialsRequired = await frontierMultisigContract.getDenialsRequired();
  
        console.log("Approvals:", approvals);
        console.log("Denials:", denials);
        console.log("Approvals required:", approvalsRequired);
        console.log("Denials required:", denialsRequired);
  
        return {
          ...tx,
          approvals,
          denials,
          approvalsRequired,
          denialsRequired,
        };
      })
    );
  
    setPendingTx(pendingTxWithDetails);
  }

  async function fetchCompleteTransactions() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    const completeTransactionsResult = await frontierMultisigContract.getCompleteTransactions();
    
    const completeTransactions = completeTransactionsResult[0].map((to, index) => {
      return {
        txId: completeTransactionsResult[0][index], // Add this line
        to,
        value: completeTransactionsResult[1][index],
        data: completeTransactionsResult[2][index],
        executed: completeTransactionsResult[3][index],
        denied: completeTransactionsResult[4][index],
      };
    });
    console.log("Complete transactions:", completeTransactions);
    const completeTxWithDetails = await Promise.all(
      completeTransactions.map(async (tx, index) => {
        const approvals = await frontierMultisigContract.getTransactionApprovals(index);
        const denials = await frontierMultisigContract.getTransactionDenials(index);
        const approvalsRequired = await frontierMultisigContract.getApprovalsRequired();
        const denialsRequired = await frontierMultisigContract.getDenialsRequired();
  
        console.log("Approvals:", approvals);
        console.log("Denials:", denials);
        console.log("Approvals required:", approvalsRequired);
        console.log("Denials required:", denialsRequired);
  
        return {
          ...tx,
          approvals,
          denials,
          approvalsRequired,
          denialsRequired,
        };
      })
    );
  
    setCompleteTx(completeTxWithDetails);
  }

  async function approveTransaction(txIndex) {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const tx = await frontierMultisigContract.approveTransaction(txIndex);
      const receipt = await tx.wait();
      console.log("Approve transaction receipt:", receipt);
      fetchPendingTransactions(); // Refresh pending transactions list after approval
    } catch (error) {
      console.error("Error approving transaction:", error.message);
    }
  }

  async function denyTransaction(txIndex) {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const tx = await frontierMultisigContract.denyTransaction(txIndex);
      const receipt = await tx.wait();
      console.log("Deny transaction receipt:", receipt);
      fetchPendingTransactions(); // Refresh pending transactions list after denial
    } catch (error) {
      console.error("Error denying transaction:", error.message);
    }
  }

  async function addOwner(newOwner) {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    console.log("Adding owner:", newOwner);
    try {
      const tx = await frontierMultisigContract.addOwner(newOwner);
      const receipt = await tx.wait();
      console.log("Add owner transaction receipt:", receipt);
      fetchOwners();
    } catch (error) {
      console.error("Error adding owner:", error.message);
    }
  }
  
  async function removeOwner(ownerToRemove) {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const tx = await frontierMultisigContract.removeOwner(ownerToRemove);
      const receipt = await tx.wait();
      console.log("Remove owner transaction receipt:", receipt);
      fetchOwners();
    } catch (error) {
      console.error("Error removing owner:", error.message);
    }
  }

  async function fetchOwners() {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const owners = await frontierMultisigContract.getOwners();
      setOwners(owners);
    }
    catch (error) {
      console.error("Error fetching owners:", error.message);
    }
  }

  async function fetchRequiredApprovals() {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const approvalsRequired = await frontierMultisigContract.getApprovalsRequired();
      console.log("Approvals required:", approvalsRequired);
      setApprovalsRequired(approvalsRequired);
      setDisplayedApprovals(approvalsRequired);
    }
    catch (error) {
      console.error("Error fetching required approvals:", error.message);
    }
  }

  async function fetchRequiredDenials() {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const denialsRequired = await frontierMultisigContract.getDenialsRequired();
      setDenialsRequired(denialsRequired);
    }
    catch (error) {
      console.error("Error fetching required denials:", error.message);
    }
  }

  async function changeApprovalsRequired() {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const tx = await frontierMultisigContract.changeApprovalsRequired(approvalsRequired);
      const receipt = await tx.wait();
      console.log("Change approvals required transaction receipt:", receipt);
      fetchRequiredApprovals();
    } catch (error) {
      console.error("Error changing approvals required:", error.message);
    }
  }

  async function changeDenialsRequired() {
    if (!activeWallet) {
      alert("Please select an active wallet first.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const frontierMultisigContract = new ethers.Contract(activeWallet, FrontierMultisig.abi, signer);
    try {
      const tx = await frontierMultisigContract.changeDenialsRequired(denialsRequired);
      const receipt = await tx.wait();
      console.log("Change denials required transaction receipt:", receipt);
      fetchRequiredDenials();
    } catch (error) {
      console.error("Error changing denials required:", error.message);
    }
  }
  
  function parseUnits(value) {
    const [integer, decimal] = value.split(".");
    const wei = integer + (decimal ? decimal.padEnd(18, "0") : "0".repeat(18));
    const weiBigInt = BigInt(wei);
  
    return weiBigInt;
  }
  
  function parseUnitsBack(wei, decimals = 18) {
    const weiBigInt = BigInt(wei);
    const factorBigInt = BigInt(10) ** BigInt(decimals);
    const etherBigInt = weiBigInt / factorBigInt;
    const remainderBigInt = weiBigInt % factorBigInt;
    const ether = Number(etherBigInt) + Number(remainderBigInt) / Number(factorBigInt);
  
    return ether;
  }  

  useEffect(() => {
    if (activeWallet) {
      fetchPendingTransactions();
    }
  }, [activeWallet]);
  
  useEffect(() => {
    fetchBalance();
  }, [activeWallet]);
  
  useEffect(() => {
    if (errorMessage) {
      alert(errorMessage);
      setErrorMessage('');
    }
  }, [errorMessage]);

  useEffect(() => {
    viewMyWallets();
  }, []);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    const fetchPromise = fetchPendingTransactions();
  
    const minSpinTime = 1000;
  
    const spinTimeout = new Promise((resolve) => {
      setTimeout(resolve, minSpinTime);
    });
  
    await Promise.all([fetchPromise, spinTimeout]);
    setIsRefreshing(false);
  };
  
  
    return (
        <main className={`${styles.main} grid grid-cols-1 gap-8 rounded-lg`}>
{currentPage === 'page1' ? (
  <div className="text-white">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Multisig Wallet</h2>
      <button
        onClick={() => {
          viewMyWallets();
          fetchBalance();
        }}
        className="bg-white text-blue-500 py-1 px-2 rounded shadow text-xs"
      >
        Refresh
      </button>
    </div>
    <h2 className="text-lg font-semibold mb-4">Create a New Wallet</h2>
    <button
      onClick={() => createNewWallet()}
      className="bg-white text-blue-500 py-2 px-4 rounded shadow mb-4"
    >
      Create New Wallet
    </button>
    <div className="mt-4">
      <h3 className="font-semibold">Active Wallet: {activeWallet || 'None'}</h3>
      <div className="space-y-2 mt-4">
        {userWallets.map((wallet) => (
          <div key={wallet} className="flex items-center space-x-2">
            <span className="font-mono text-sm">{wallet}</span>
            <button
              onClick={() => { setActiveWallet(wallet); fetchBalance(); }}
              className="bg-white text-blue-500 py-1 px-2 rounded shadow text-xs"
            >
              Set as Active
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Balance: {balance || '0'}</h4>
      </div>
      <div className="mt-4">
        <label htmlFor="depositAmount" className="block font-semibold mb-2">
          Deposit Amount (ETH):
        </label>
        <input
          type="text"
          id="depositAmount"
          className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
          style={{ maxWidth: '400px' }}
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
        <button
          onClick={() => depositToMultisig()}
          className="bg-white text-blue-500 py-2 px-4 rounded shadow"
        >
          Deposit
        </button>
      </div>
    </div>
  </div>
) : null}

  

{currentPage === 'page2' ? (
    <div className="mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl text-gray-200 font-semibold">Pending Transactions</h2>
        <button
          onClick={handleRefreshClick}
          className="flex items-center justify-center px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-600"
        >
          <FontAwesomeIcon icon={faSync} className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {!pendingTx=== 0 ? (
        <p className="text-gray-200">No pending transactions</p>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <ul className="divide-y divide-gray-200">
            {pendingTx.map((item, index) => {
              const approved = item.approvals;
              const denied = item.denials;
              const approvalsReq = item.approvalsRequired;
              const denialsReq = item.denialsRequired;

              return (
                <li key={index} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-gray-800">
                      <p className="font-semibold">Amount: {parseUnitsBack(item.value)}</p>
                      <p className='text-violet-500'>To: {item.to}</p>
                    </div>
                    <div className="flex items-center pl-8 space-x-4">
                      <p className="text-gray-600">{`${approved}/${approvalsReq}`}</p>
                      <button
                        onClick={() => approveTransaction(index)}
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Approve
                      </button>

                      <p className="text-gray-600">{`${denied}/${denialsReq}`}</p>
                      <button 
                        onClick={() => denyTransaction(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                        Deny
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
) : null}





      {currentPage === 'page3' ? (
        
<div className="mx-auto p-6">
      {/* <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl text-gray-200 font-semibold">Pending Transactions</h2>
        <button
          onClick={handleRefreshClick}
          className="flex items-center justify-center px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-600"
        >
          <FontAwesomeIcon icon={faSync} className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div> */}

      <button
        onClick={() => {fetchCompleteTransactions() }}
      >
        Refresh
      </button>
      {!completeTx=== 0 ? (
        <p className="text-gray-200">No complete transactions</p>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <ul className="divide-y divide-gray-200">
          {completeTx.map((item, index) => {
            const approved = item.approvals;
            const denied = item.denials;
            const approvalsReq = item.approvalsRequired;
            const denialsReq = item.denialsRequired;
            const isApproved = approved >= approvalsReq;
            const isDenied = denied >= denialsReq;

            return (
              <li key={index} className={`p-4 ${isApproved ? 'bg-green-100' : ''} ${isDenied ? 'bg-red-100' : ''}`}>
                <div className="flex justify-between items-center">
                  <div className="text-gray-800">
                    <p className="font-semibold">Amount: {parseUnitsBack(item.value)}</p>
                    <p className='text-violet-500'>To: {item.to}</p>                     
                  </div>
                  <div className="flex items-center pl-8 space-x-4">
                    <p className="text-gray-600">{`${approved}/${approvalsReq}`}</p>
                    <p className="text-gray-600">{`${denied}/${denialsReq}`}</p>
                  </div>
                </div>
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </div>

      ) : null}

      {currentPage === 'page4' ? (
        
      <div className="md:grid md:grid-cols-2 text-white h-1/2">
        <div className="flex flex-col justify-center items-center">
          <label htmlFor="address" className="mb-2">Address:</label>
          <input
            onChange={(e) => setAddressToSend(e.target.value)}
            className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
            style={{ maxWidth: "400px" }}
          />

          <label htmlFor="amount" className="mb-2">Amount:</label>
          <input
            onChange={(e) => setAmountToSend(e.target.value)}
            className="w-40 px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
          />

          <label htmlFor="tag" className="mb-2">Transaction Tag:</label>
          <input
            onChange={(e) => setTag(e.target.value)}
            className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
            style={{ maxWidth: "400px" }}
          />

          <button
            onClick={() => submitTransaction(addressToSend, amountToSend)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-300 ease-in-out"
          >
            Submit transaction
          </button>
        </div>
      </div>

      ) : null}

      {currentPage === 'page5' ? (
        <div className="mt-4">
          <input
              type="text"
              id="owner address"
              className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
              style={{ maxWidth: '400px' }}
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
            />
            <button
              onClick={() => addOwner(targetAddress)}
              className="bg-white text-blue-500 py-2 px-4 rounded shadow"
            >Add owner</button>
            <button
              onClick={() => removeOwner(targetAddress)}
              className="bg-white text-blue-500 py-2 px-4 rounded shadow"
            >Remove owner</button>
            
            <button
              onClick={() => {
                fetchOwners();
                fetchRequiredApprovals();
                fetchRequiredDenials();
              }}
              className="bg-white text-blue-500 py-2 px-4 rounded shadow"
            >Refresh</button>
  
            <div>
              <p className="text-gray-200">Owners:</p>
              <ul className="divide-y divide-gray-200">
                {owners.map((owner, index) => (
                  <li key={index} className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-gray-800">
                        <p className="font-semibold">{owner}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div>
                <p className="text-gray-200">Required approvals: {displayedApprovals.toString()}</p>
                <input
                  type="integer"
                  id="approvals required"
                  className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
                  style={{ maxWidth: '400px' }}
                  value={approvalsRequired}
                  onChange={(e) => setApprovalsRequired(e.target.value)}
                />
                <button
                  onClick={() => changeApprovalsRequired(approvalsRequired)}
                  className="bg-white text-blue-500 py-2 px-4 rounded shadow"
                >Change</button>
              </div>
              <div>
                <p className="text-gray-200">Required denials: {displayedDenials.toString()}</p>
                <input
                  type="integer"
                  id="denials required"
                  className="w-full px-2 py-1 rounded-md border border-gray-400 mb-4 text-gray-800"
                  style={{ maxWidth: '400px' }}
                  value={denialsRequired}
                  onChange={(e) => setDenialsRequired(e.target.value)}
                />
                <button
                  onClick={() => changeDenialsRequired(denialsRequired)}
                  className="bg-white text-blue-500 py-2 px-4 rounded shadow"
                >Change</button>
              </div>
            </div>
        </div>
      ) : null}

    </main>
  );
  
}

IndexPage.getInitialProps = async ({ query }) => {
  const initialPage = query.page || 'page1';
  return { initialPage };
};

export default IndexPage;
