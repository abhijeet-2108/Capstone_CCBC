// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IncidentRegistry {

    enum Status { DETECTED, RESPONDING, RESOLVED }

    struct Incident {
        string incidentId;
        bytes32 actionHash;
        Status status;
        uint256 timestamp;
        address recordedBy;
    }

    Incident[] private incidents;

    event IncidentRecorded(
        uint256 indexed index,
        string incidentId,
        bytes32 actionHash,
        Status status,
        uint256 timestamp,
        address recordedBy
    );

    function recordIncident(
        string calldata _incidentId,
        bytes32 _actionHash,
        Status _status
    ) external {

        incidents.push(
            Incident({
                incidentId: _incidentId,
                actionHash: _actionHash,
                status: _status,
                timestamp: block.timestamp,
                recordedBy: msg.sender
            })
        );

        emit IncidentRecorded(
            incidents.length - 1,
            _incidentId,
            _actionHash,
            _status,
            block.timestamp,
            msg.sender
        );
    }

    function getIncident(uint256 _index)
        external
        view
        returns (
            string memory,
            bytes32,
            Status,
            uint256,
            address
        )
    {
        Incident memory i = incidents[_index];
        return (
            i.incidentId,
            i.actionHash,
            i.status,
            i.timestamp,
            i.recordedBy
        );
    }

    function totalIncidents() external view returns (uint256) {
        return incidents.length;
    }
}