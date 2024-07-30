# Overview

This document describes the caching strategy used in the Channel Partners application.

# Caching Strategy

> In-progress

# Components

## Mixins

### Notes

- [Related directly to a comment on `increment_version_by_id`](https://gitlab.nxvms.dev/dev/cloud_portal/-/merge_requests/8129#note_788028)
    - If method function fails, cache won't be updated, related object version won't be updated, but actual object data is updated, in case if Model.save() has been called from out atomic transaction. Not a big problem, but we need to be aware of this.

## Receivers
### Flow
```mermaid
graph LR
    CP[ChannelPartner]
    CPS[ChannelPartnerService]
    CPSR[ChannelPartnerServiceRecord]
    CPTU[ChannelPartnerToUser]
    CS[CloudSystem]
    CU[CloudUser]
    O[Organization]
    OTU[OrganizationToUser]
    SG[SystemGroup]

    CP -->|increment own version| CP
    CP -.->|increment ancestor's descendant version| CP

    CPS -->|increment version| CP

    CPSR -->|increment version| CS
    CPSR -->|increment descendant version| O

    CPTU -->|increment version| CU
    CPTU -->|increment version| CP
    CPTU -.->|increment ancestor's descendant version| CP

    CS -->|increment own version| CS
    CS -->|handle org change| O

    CU -->|increment own version| CU
    CU -->|increment version| CP
    CU -->|increment version| O

    O -->|increment own version| O
    O -->|increment version| CU

    OTU -->|increment version| CU
    OTU -->|increment version| O
    OTU -->|increment version| SG

    SG -->|increment own version| SG
    SG -->|handle org change| O
    SG -.->|increment ancestor's descendant version| SG

    CP -.->|related| CU
    CP -.->|related| CPS
    CP -.->|related| CPTU
    O -.->|related| CU
    O -.->|related| OTU
    O -.->|related| CS
    O -.->|related| SG
    CS -.->|related| CPSR
    SG -.->|related| CS

    classDef selfIncrement fill:#f9,stroke:#333,stroke-width:2px;
    classDef parentIncrement fill:#af,stroke:#333,stroke-width:2px;

    class CP,CS,CU,O,SG selfIncrement;
    class CP,SG parentIncrement;
```