// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceLedger {

    enum Severity { LOW, MEDIUM, HIGH, CRITICAL }

    struct Finding {
        string title;
        bytes32 reportHash;
        Severity severity;
        uint256 timestamp;
        address recordedBy;
    }

    Finding[] private findings;

    event FindingRecorded(
        uint256 indexed findingId,
        string title,
        bytes32 reportHash,
        Severity severity,
        uint256 timestamp,
        address recordedBy
    );

    function recordFinding(
        string calldata _title,
        bytes32 _reportHash,
        Severity _severity
    ) external {

        findings.push(
            Finding({
                title: _title,
                reportHash: _reportHash,
                severity: _severity,
                timestamp: block.timestamp,
                recordedBy: msg.sender
            })
        );

        emit FindingRecorded(
            findings.length - 1,
            _title,
            _reportHash,
            _severity,
            block.timestamp,
            msg.sender
        );
    }

    function getFinding(uint256 _id)
        external
        view
        returns (
            string memory,
            bytes32,
            Severity,
            uint256,
            address
        )
    {
        Finding memory f = findings[_id];
        return (f.title, f.reportHash, f.severity, f.timestamp, f.recordedBy);
    }

    function totalFindings() external view returns (uint256) {
        return findings.length;
    }
}