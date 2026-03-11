// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessPolicy {

    struct AccessApproval {
        address user;
        string resourceId;
        uint256 expirationTime;
        bool active;
    }

    mapping(bytes32 => AccessApproval) public approvals;

    event AccessApproved(
        bytes32 indexed approvalId,
        address indexed user,
        string resourceId,
        uint256 expirationTime
    );

    event AccessRevoked(bytes32 indexed approvalId);

    function approveAccess(
        address _user,
        string calldata _resourceId,
        uint256 _durationSeconds
    ) external {

        uint256 expiration = block.timestamp + _durationSeconds;

        bytes32 approvalId = keccak256(
            abi.encodePacked(_user, _resourceId, block.timestamp)
        );

        approvals[approvalId] = AccessApproval({
            user: _user,
            resourceId: _resourceId,
            expirationTime: expiration,
            active: true
        });

        emit AccessApproved(
            approvalId,
            _user,
            _resourceId,
            expiration
        );
    }

    function revokeAccess(bytes32 _approvalId) external {
        approvals[_approvalId].active = false;
        emit AccessRevoked(_approvalId);
    }

    function isAccessValid(bytes32 _approvalId)
        external
        view
        returns (bool)
    {
        AccessApproval memory approval = approvals[_approvalId];

        return (
            approval.active &&
            block.timestamp <= approval.expirationTime
        );
    }
}