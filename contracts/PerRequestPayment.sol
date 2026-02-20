// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PerRequestPayment {
    event PaymentReceived(address indexed from, address indexed to, uint256 amount, string referenceId);

    function pay(address payable _to, string calldata _referenceId) external payable {
        require(msg.value > 0, "Payment must be > 0");
        (bool success, ) = _to.call{value: msg.value}("");
        require(success, "Payment failed");
        emit PaymentReceived(msg.sender, _to, msg.value, _referenceId);
    }
}
