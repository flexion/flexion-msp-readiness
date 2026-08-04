#!/bin/bash

# Create remaining governance templates
cat > templates/governance/operational-readiness.md << 'EOF'
---
requirementId: GOV-004
title: Operational Readiness
category: governance
description: Operational Readiness process with checklists for personnel, tools, and operational processes
---

# Operational Readiness Checklist

[Detailed operational readiness checklist covering personnel training, tools setup, processes verification, and customer-specific readiness - content similar to onboarding but focused on new customer readiness]
EOF

cat > templates/governance/shared-responsibility.md << 'EOF'
---
requirementId: GOV-005
title: Shared Responsibility Model
category: governance
description: Defines security requirements and operational expectations via RACI matrix between Partner and Customer
---

# Shared Responsibility Model and RACI Matrix

[RACI matrix template defining Partner vs Customer responsibilities for AWS infrastructure, security, operations, compliance]
EOF

cat > templates/governance/sustainability.md << 'EOF'
---
requirementId: GOV-006
title: Sustainability Best Practices
category: governance
description: AWS Partner optimizes workload placement and architecture for energy efficiency
---

# Sustainability Best Practices and Optimization

[Template for documenting sustainability initiatives: right-sizing, region selection, serverless adoption, spot instances, etc.]
EOF

# Create platform templates
cat > templates/platform/account-management.md << 'EOF'
---
requirementId: PLAT-001
title: Account Management
category: platform
description: AWS accounts are not shared across customers (except multi-tenant SaaS products owned by Partner)
---

# Account Management and Isolation Policy

[Account isolation policy, account vending process, multi-tenant SaaS exception handling]
EOF

cat > templates/platform/solution-capabilities.md << 'EOF'
---
requirementId: PLAT-002
title: Solution Capabilities
category: platform
description: Detailed design documents for 2 customers reviewed by AWS certified Solutions Architect
---

# Solution Design Documentation Template

[Template for customer solution design docs: requirements, architecture, diagrams, SA review sign-off]
EOF

cat > templates/platform/nfr-documentation.md << 'EOF'
---
requirementId: PLAT-003
title: Non-Functional Requirements
category: platform
description: Design documents include performance, capacity, availability requirements, SLAs, monitoring, testing
---

# Non-Functional Requirements Documentation

[Template for NFR documentation: performance targets, scalability requirements, availability SLAs, monitoring approach, testing strategy]
EOF

cat > templates/platform/well-architected.md << 'EOF'
---
requirementId: PLAT-004
title: Well-Architected
category: platform
description: Customer infrastructure is well-architected per AWS Well-Architected Framework with zero HRIs
---

# Well-Architected Framework Review Template

[Template for WAFR documentation: assessment process, findings, HRI remediation, ongoing reviews]
EOF

cat > templates/platform/service-expertise.md << 'EOF'
---
requirementId: PLAT-005
title: AWS Service Expertise
category: platform
description: Two customer workloads each using ≥4 AWS services beyond basic compute/network/storage
---

# AWS Service Expertise Documentation

[Template for documenting customer workloads using diverse AWS services to demonstrate breadth of expertise]
EOF

echo "Templates created successfully"
