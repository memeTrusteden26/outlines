// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AgentSubscription is Ownable {
    struct Plan {
        uint256 price; // Price in Wei or token
        uint256 duration; // Duration in seconds
        bool isActive;
        address token; // Address(0) for ETH
    }

    struct Subscription {
        uint256 planId;
        uint256 startTime;
        uint256 endTime;
    }

    uint256 public nextPlanId;
    mapping(uint256 => Plan) public plans;
    mapping(address => mapping(uint256 => Subscription)) public subscriptions; // user => planId => sub

    event PlanCreated(uint256 indexed planId, uint256 price, uint256 duration, address token);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 startTime, uint256 endTime);
    event Renewed(address indexed user, uint256 indexed planId, uint256 newEndTime);

    constructor() Ownable(msg.sender) {}

    function createPlan(uint256 _price, uint256 _duration, address _token) external onlyOwner returns (uint256) {
        plans[nextPlanId] = Plan(_price, _duration, true, _token);
        emit PlanCreated(nextPlanId, _price, _duration, _token);
        return nextPlanId++;
    }

    function subscribe(uint256 _planId) external payable {
        Plan storage plan = plans[_planId];
        require(plan.isActive, "Plan not active");

        if (plan.token == address(0)) {
            require(msg.value == plan.price, "Incorrect ETH amount");
        } else {
            IERC20(plan.token).transferFrom(msg.sender, address(this), plan.price);
        }

        uint256 newStartTime = block.timestamp;
        uint256 newEndTime = newStartTime + plan.duration;

        // Check if existing sub is still valid, extend it
        if (subscriptions[msg.sender][_planId].endTime > block.timestamp) {
             newEndTime = subscriptions[msg.sender][_planId].endTime + plan.duration;
             newStartTime = subscriptions[msg.sender][_planId].startTime; // Keep original start time
             emit Renewed(msg.sender, _planId, newEndTime);
        } else {
             emit Subscribed(msg.sender, _planId, newStartTime, newEndTime);
        }

        subscriptions[msg.sender][_planId] = Subscription(_planId, newStartTime, newEndTime);
    }

    function checkSubscription(address _user, uint256 _planId) external view returns (bool) {
        return subscriptions[_user][_planId].endTime > block.timestamp;
    }

    function withdraw(address _token) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(_token).transfer(owner(), IERC20(_token).balanceOf(address(this)));
        }
    }
}
