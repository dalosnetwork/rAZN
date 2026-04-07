# Admin Guide

## Scope
This guide covers current admin operations only.
Legacy pages are intentionally excluded.

## Admin Responsibilities
As an admin, you are responsible for:
- supervising mint and redemption queues,
- reviewing KYB cases and decisions,
- monitoring treasury health and reserve reconciliation,
- watching risk indicators and alerts,
- managing blacklist restrictions,
- controlling sensitive contract actions.

## Main Navigation (Admin)
- **Admin Overview**: control-tower summary for queue workload and alerts.
- **Mint Ops**: review and decide mint requests.
- **Redemption Ops**: process redemption queue to completion.
- **KYB Review**: review verification cases and request updates/approve/reject.
- **Treasury**: monitor reserves, liabilities, reconciliation, and alerts.
- **Risk & Controls**: monitor risk indicators and active control alerts.
- **Blacklist**: add/edit/activate/deactivate restricted entities and addresses.
- **Contract Controls**: manage privileged contract actions and emergency controls.

## Daily Admin Workflow
1. Start in **Admin Overview** for backlog and critical alert snapshot.
2. Clear **Mint Ops** queue (approve/reject with timeline integrity).
3. Process **Redemption Ops** queue (move through processing to complete/reject).
4. Work **KYB Review** queue (approve, request update, or reject with notes).
5. Check **Treasury** for coverage, stale data, and unresolved reconciliation alerts.
6. Check **Risk & Controls** for critical/stale indicators.
7. Update **Blacklist** entries if new risk events appear.
8. Execute pending actions in **Contract Controls** only with proper operational confirmation.

## How To Use Each Admin Page

### Admin Overview
Use this as your first and recurring checkpoint:
- monitor total backlog across mint/redeem/KYB,
- review current operational alerts,
- inspect recent admin activity,
- jump directly into Mint Ops or Risk & Controls.

### Mint Ops
Use this queue to evaluate mint requests:
1. Filter/search queue by request or user.
2. Open request details to view amount, KYB state, risk flag, assignee, and timeline.
3. Approve or reject requests.
4. Confirm status transitions appear in timeline/history.

### Redemption Ops
Use this queue to drive payout execution:
1. Sort and review active queue positions.
2. Open a request and move status through processing stages.
3. Approve and complete payouts, or reject when necessary.
4. Confirm completed/rejected items are visible in processed history.

### KYB Review
Use this queue for compliance decisions:
1. Filter/search KYB cases.
2. Open case details and review submitted documents.
3. Add reviewer notes.
4. Approve, request update, or reject.
5. Verify history records every decision.

### Treasury
Use this page to maintain reserve confidence:
- monitor reserve/liability coverage and unreconciled values,
- review stale or warning snapshots,
- monitor treasury account balances,
- review treasury event history,
- run reconciliation and export snapshots when needed.

### Risk & Controls
Use this page for centralized monitoring:
- track reserve ratio trend and stale data signals,
- review platform indicators,
- inspect alert queue severity and ownership,
- prioritize critical and stale control issues.

### Blacklist
Use this page for restrictions governance:
1. Add or edit entries with reason, network, category, and risk level.
2. Move entries through review and active/inactive states.
3. Deactivate outdated or no-longer-valid restrictions.
4. Confirm all changes are reflected in entry history/timeline.

### Contract Controls
Use this page for sensitive operational actions:
- review deployment and environment status,
- monitor control signals,
- process pending control actions (approve/execute/reject),
- use emergency pause controls only when strictly required,
- verify all actions are captured in control history and timelines.

## Status Meanings (Admin)
- **Pending / Submitted**: newly entered queue item.
- **Under Review / In Progress**: actively being evaluated.
- **Approved**: accepted and ready for next stage or execution.
- **Queued / Processing**: in operational execution path.
- **Completed**: successfully executed.
- **Needs Update**: waiting for user re-submission or corrections.
- **Rejected**: closed without approval.
- **Active / Inactive**: currently enforced vs not enforced (commonly for controls/blacklist states).
- **Warning / Critical / Stale**: requires increased attention; critical and stale should be prioritized.

## Operational Good Practices
- Always leave clear decision notes where applicable.
- Use queue filters to focus on high-risk and aging items first.
- Resolve critical/stale alerts before non-urgent tasks.
- Ensure every sensitive action has visible timeline/audit continuity.
