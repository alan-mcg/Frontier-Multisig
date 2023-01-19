// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract FrontierMultisig {
    event Deposit(address indexed sender, uint value);
    event SubmitTransaction(address indexed owner, uint indexed txIndex, address indexed to, uint value, bytes data);
    event ApproveTransaction(address indexed owner, uint indexed txIndex);
    event RevokeTransaction(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);
    event OwnerAddition(address indexed owner);  // Add new owner
    event OwnerRemoval(address indexed owner);   // Remove owner, must be done by original owner, decrease required approvals
    // event ApprovalRequirementChange(uint required);  // Change the number of approvals required to execute a transaction
    // event DenyTransaction(address indexed owner, uint indexed txIndex); // Make a way to create a number of owners that can deny a transaction before it is cancelled
    // event DenyRequirementChange(uint required);  // Change the number of deny's required to cancel a transaction

    /* Create an array of owners */
    address[] public owners;
    address[] public originalOwners;
    mapping (address => bool) public isOwner;
    mapping (address => bool) public isOriginalOwner;

    /* Create an array of transactions */
    Transaction[] public transactions;

    /* Create a transaction type with the to address, value of tx,
     data being sent & if the tx is executed */
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
    }


    /* Create a mapping of transactions to owners and if they have approved */
    mapping (uint => mapping (address => bool)) public approvals;
    
    /* Make sure the owners added in the constructor can't be removed */
    constructor (address[] memory _owners) payable {
        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "owner is the zero address");
            require(!isOwner[owner], "owner already added");
            isOwner[owner] = true;
            owners.push(owner);
            isOriginalOwner[owner] = true;
            originalOwners.push(owner);
        }
        require(owners.length >= 1, "owners must be at least 1");
    }

    /* Function to allow deposits into the contract */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /* Function to submit a transaction to the contract */
    function submitTransaction(address to, uint value, bytes memory data) public {
        require(isOwner[msg.sender], "User is not an owner");   // Must be an owner to submit tx
        uint txIndex = transactions.length;
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false
        }));
        emit SubmitTransaction(msg.sender, txIndex, to, value, data);
    }

    /* Function to approve a transaction */
    function approveTransaction(uint txIndex) public {
        require(isOwner[msg.sender], "User is not an owner");                                       // Must be an owner to approve tx
        require(!approvals[txIndex][msg.sender], "User has already approved this transaction");     // Don't allow duplicate approvals
    approvals[txIndex][msg.sender] = true;                                                          // Set approval from the owner to true
        emit ApproveTransaction(msg.sender, txIndex);
    }
    
    /* Function to revoke a transaction */
    function revokeTransaction(uint txIndex) public {
        require(isOwner[msg.sender], "User is not an owner");                                       // Must be an owner to revoke tx
        require(approvals[txIndex][msg.sender], "User has not approved this transaction");          // Don't allow revoking if not approved
        approvals[txIndex][msg.sender] = false;                                                     // Set approval from the owner to false
        emit RevokeTransaction(msg.sender, txIndex);
    }

    /* Function to get current number of approvals */
    function getApprovals(uint txIndex) public view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (approvals[txIndex][owners[i]]) {
                count += 1;
            }
        }
        return count;
    }

    /* Function to execute a transaction */
    function executeTransaction(uint txIndex) public payable {
        require(isOwner[msg.sender], "User is not an owner");                                                           // Must be an owner to execute tx
        require(getApprovals(txIndex) >= 2, "Transaction has not been approved by enough owners");      // Number of approvals must be greater than the set requirement
        require(!transactions[txIndex].executed, "Transaction has already been executed");                              // Don't allow duplicate executions
        transactions[txIndex].executed = true;
        (bool success, ) = transactions[txIndex].to.call{value: transactions[txIndex].value}(transactions[txIndex].data);
        require(success, "Transaction failed");
        emit ExecuteTransaction(msg.sender, txIndex);
    }

    /* Function to set the number of approvals required */
    // function setApprovalsRequired(uint _approvalsRequired) public {
    //     require(isOwner[msg.sender], "User is not an owner");   // Must be an owner to set approvals required
    //     require(_approvalsRequired > 0 && _approvalsRequired <= owners.length, "Approvals required must be greater than 0 and less than or equal to the number of owners");
    //     uint approvalsRequired = _approvalsRequired;
    //     emit ApprovalRequirementChange(_approvalsRequired);
    // }

    /* Function to add an owner */
    function addOwner(address owner) public {
        require(isOwner[msg.sender], "User is not an owner");   // Must be an owner to add an owner
        require(owner != address(0), "owner is the zero address");
        require(!isOwner[owner], "owner already added");
        isOwner[owner] = true;
        owners.push(owner);
        emit OwnerAddition(owner);
    }
    
    /* Function to remove an owner */
    function removeOwner(address owner) public {       
        require(!isOriginalOwner[owner], "User is an original owner so cannot be removed");
        require(isOwner[msg.sender], "User is not an owner");   // Must be an owner to remove an owner
        require(owner != address(0), "owner is the zero address");
        require(isOwner[owner], "owner is not an owner");
        isOwner[owner] = false;
        for (uint i = 0; i < owners.length - 1; i++) {
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                break;
            }
        }
        owners.pop();
        emit OwnerRemoval(owner);
    }
    
    /* Function to get the contract balance */
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
    
    /* Function to get the number of owners */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /* Function to get the original owners */
    // function getOriginalOwners() public view returns (address[] memory) {
    //     return owners;
    // }
    
    /* Function to get the number of transactions */
    function getTransactions() public view returns (Transaction[] memory) {
        return transactions;
    }




}
// Byte data example --> 0xe73620c3000000000000000000000000000000000000000000000000000000000000007b
