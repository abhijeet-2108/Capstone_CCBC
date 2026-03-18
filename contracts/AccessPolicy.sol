// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessPolicy {
    struct AccessApproval {
        address user;
        string resourceId;
        string permission;
        string requestId;
        uint256 expirationTime;
        bool active;
    }

    mapping(bytes32 => AccessApproval) public approvals;

    event AccessApproved(
        bytes32 indexed approvalId,
        address indexed user,
        string resourceId,
        string permission,
        string requestId,
        uint256 expirationTime
    );

    event AccessRevoked(bytes32 indexed approvalId);

    function approveAccess(
        address _user,
        string calldata _resourceId,
        string calldata _permission,
        uint256 _durationSeconds,
        string calldata _requestId
    ) external returns (bytes32) {
        uint256 expiration = block.timestamp + _durationSeconds;

        bytes32 approvalId = keccak256(
            abi.encodePacked(_user, _resourceId, _permission, _requestId)
        );

        approvals[approvalId] = AccessApproval({
            user: _user,
            resourceId: _resourceId,
            permission: _permission,
            requestId: _requestId,
            expirationTime: expiration,
            active: true
        });

        emit AccessApproved(
            approvalId,
            _user,
            _resourceId,
            _permission,
            _requestId,
            expiration
        );

        return approvalId;
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

        return approval.active && block.timestamp <= approval.expirationTime;
    }

    function getApproval(bytes32 _approvalId)
        external
        view
        returns (
            address user,
            string memory resourceId,
            string memory permission,
            string memory requestId,
            uint256 expirationTime,
            bool active
        )
    {
        AccessApproval memory a = approvals[_approvalId];
        return (
            a.user,
            a.resourceId,
            a.permission,
            a.requestId,
            a.expirationTime,
            a.active
        );
    }
}