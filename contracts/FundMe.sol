// Get funds from users
// Withdraw funds
// Set a minimum funding value in USD
// Transaction: Value Transfer or function call

// SPDX-License-Identifier: MIT
// Pragma
pragma solidity ^0.8.7;
// Imports
// import directly from Github - npm package
// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

// Error Codes
error FundMe__NotOwner(); // so we know the error comes from FundMe contract not from AggregatorV3Interface

// Interfaces, Libraries, Contracts

/** @title A contract for crowd funding
 * @author Dexter Yang
 * @notice This contract is to demo a sample funding contract
 * @dev This implements price feeds as our library
 */
contract FundMe {
    // Type Declarations
    using PriceConverter for uint256;

    // State Variables

    uint256 public constant MINIMUM_USD = 50 * 1e18;

    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;

    address private immutable i_owner;

    AggregatorV3Interface private s_priceFeed;

    // do whatever here first
    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Sender is not owner!");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }

        _; // doing the rest of the code
    }

    // constructor will be immediately called after setting up the contract
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // Someone sends this contract ETH without calling the fund function
    // receive() external payable {
    //     fund();
    // }

    // fallback() external payable {
    //     fund();
    // }

    /**
     * @notice This function funds this contract
     * @dev This implements price feeds as our library
     */
    function fund() public payable {
        // want to be able to set a minimum fund amount in USD
        // require(getConversionRate(msg.value) > MINIMUM_USD, "Didn't send enough");
        // msg.value is considered as the first parameter for the library
        require(
            msg.value.getConversionRate(s_priceFeed) >= MINIMUM_USD,
            "Didn't send enough"
        );
        // msg.value has 18 decimal places uint
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
    }

    // only the owner of the contract can call this function
    function withdraw() public onlyOwner {
        // require(msg.sender == owner, "Sender is not owner!");

        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length; // we are reading from the storage
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        // reset the array
        s_funders = new address[](0); // new address array with 0 objects

        // withdraw the funds

        //There are three ways to send Ether
        // transfer, return error if fails
        // payable(msg.sender).transfer(address(this).balance);
        // send, return boolean if fails
        // bool sendSuccess = payable(msg.sender).send(address(this).balance);
        // require(sendSuccess, "Send failed");
        // call, lower-level command, call any function without ABI, recommended way to send and receive ether or other tokens
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() public onlyOwner {
        address[] memory funders = s_funders;

        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }

        s_funders = new address[](0);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
