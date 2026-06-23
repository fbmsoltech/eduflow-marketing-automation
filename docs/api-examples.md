# API Examples

This walkthrough exercises the main EduFlow flow with synthetic data. It works against the local
API or a validated Render deployment.

The same requests can be explored and executed interactively through Swagger UI:

```txt
Local: http://localhost:3000/docs
Public demo: RENDER_API_URL/docs
```

Swagger shows request and response schemas, examples and documented status codes. Use the curl
sequence below when a repeatable terminal-based walkthrough is preferable.

Set the base URL before running the requests:

```bash
export API_URL="RENDER_API_URL"
```

For local development:

```bash
export API_URL="http://localhost:3000"
```

PowerShell users can set the same value with:

```powershell
$env:API_URL = 'RENDER_API_URL'
```

Replace each ID placeholder with the `id` returned by the preceding request:

```txt
ORGANIZATION_ID
CAMPAIGN_ID
LEAD_ID
AUTOMATION_ID
SCORE_AUTOMATION_ID
LEAD_EVENT_ID
```

Use a new organization slug, campaign slug, email and idempotency key when repeating the flow.

## 1. Create Organization

```bash
curl --fail-with-body -X POST "$API_URL/organizations" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EduFlow Portfolio Organization",
    "slug": "eduflow-portfolio-organization-001"
  }'
```

Copy the returned `id` and use it as `ORGANIZATION_ID`.

## 2. Create Campaign

```bash
curl --fail-with-body -X POST "$API_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORGANIZATION_ID",
    "name": "2026 Selection Process",
    "slug": "2026-selection-process",
    "metadata": {
      "channel": "portfolio-demo"
    }
  }'
```

Copy the returned `id` and use it as `CAMPAIGN_ID`.

## 3. Create Lead

```bash
curl --fail-with-body -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORGANIZATION_ID",
    "campaignId": "CAMPAIGN_ID",
    "email": "portfolio-lead-001@example.com",
    "fullName": "Portfolio Demo Lead",
    "metadata": {
      "source": "github-readme"
    }
  }'
```

Copy the returned `id` and use it as `LEAD_ID`. A new lead starts with score `0` and status `NEW`.

## 4. Update Lead Score, If Needed

This optional request resets the baseline used by the example:

```bash
curl --fail-with-body -X PATCH "$API_URL/leads/LEAD_ID/score" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 0
  }'
```

## 5. Create Automation

This automation reacts to `form.submitted` and adds 40 points. When the score changes, the
Automation Engine will create an internal `lead.score.updated` LeadEvent and matching OutboxMessage.

```bash
curl --fail-with-body -X POST "$API_URL/automations" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORGANIZATION_ID",
    "campaignId": "CAMPAIGN_ID",
    "name": "Score submitted candidates",
    "triggerEventType": "form.submitted",
    "conditions": [],
    "actions": [
      {
        "type": "INCREASE_LEAD_SCORE",
        "config": {
          "amount": 40
        }
      }
    ]
  }'
```

Copy the returned `id` and use it as `AUTOMATION_ID`. New automations start as `DRAFT`.

## 6. Activate Automation

```bash
curl --fail-with-body -X PATCH "$API_URL/automations/AUTOMATION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE"
  }'
```

## 7. Create Score-Based Automation

This automation reacts to the internal `lead.score.updated` event after the score action has been
persisted. It qualifies leads whose current score is greater than 30.

```bash
curl --fail-with-body -X POST "$API_URL/automations" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "ORGANIZATION_ID",
    "campaignId": "CAMPAIGN_ID",
    "name": "Qualify scored candidates",
    "triggerEventType": "lead.score.updated",
    "conditions": [
      {
        "fieldPath": "lead.score",
        "operator": "GREATER_THAN",
        "expectedValue": 30
      }
    ],
    "actions": [
      {
        "type": "UPDATE_LEAD_STATUS",
        "config": {
          "status": "QUALIFIED"
        }
      }
    ]
  }'
```

Copy the returned `id` and use it as `SCORE_AUTOMATION_ID`.

## 8. Activate Score-Based Automation

```bash
curl --fail-with-body -X PATCH "$API_URL/automations/SCORE_AUTOMATION_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE"
  }'
```

## 9. Register LeadEvent

```bash
curl --fail-with-body -X POST "$API_URL/lead-events" \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: portfolio-flow-001" \
  -d '{
    "organizationId": "ORGANIZATION_ID",
    "campaignId": "CAMPAIGN_ID",
    "leadId": "LEAD_ID",
    "eventType": "form.submitted",
    "occurredAt": "2026-06-22T12:00:00.000Z",
    "payload": {
      "formId": "selection-form",
      "source": "portfolio-demo"
    },
    "correlationId": "portfolio-flow-001",
    "idempotencyKey": "ORGANIZATION_ID:form.submitted:portfolio-flow-001"
  }'
```

Copy the returned `id` and use it as `LEAD_EVENT_ID`.

The API commits the LeadEvent and its OutboxMessage in the same PostgreSQL transaction. Sending the
same organization and idempotency key again returns the existing event without creating a duplicate
OutboxMessage.

## 10. Check OutboxMessages

```bash
curl --fail-with-body "$API_URL/outbox/messages"
```

Find the item whose `aggregateId` is `LEAD_EVENT_ID`. With the Outbox Publisher Worker running, the
original `form.submitted` message should eventually show:

```txt
status: PUBLISHED
attempts: at least 1
publishedAt: populated
```

After the Automation Worker processes the score action, a second LeadEvent with
`eventType: lead.score.updated` should exist, with its own OutboxMessage. Its payload includes:

```json
{
  "source": "automation_engine",
  "reason": "lead_score_changed",
  "previousScore": 0,
  "newScore": 40,
  "scoreDelta": 40,
  "automationFlowId": "AUTOMATION_ID",
  "automationExecutionId": "AUTOMATION_EXECUTION_ID",
  "triggerLeadEventId": "LEAD_EVENT_ID"
}
```

If the publisher worker is intentionally unavailable in an API-only demo, pending messages can be
published manually for diagnosis:

```bash
curl --fail-with-body -X POST "$API_URL/outbox/messages/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10
  }'
```

Manual publication still requires RabbitMQ or CloudAMQP. It does not replace the Automation Worker
that consumes the event.

## 11. Check Lead Status and Score

After both workers process the event:

```bash
curl --fail-with-body "$API_URL/leads/LEAD_ID"
```

Expected values for this example:

```json
{
  "status": "QUALIFIED",
  "score": 40
}
```

If remote background workers are not enabled, run the complete stack with Docker Compose and repeat
the flow locally:

```bash
npm run docker:build
npm run docker:up
```

For a manual Automation Engine diagnostic, use the registered LeadEvent:

```bash
curl --fail-with-body -X POST "$API_URL/automations/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "leadEventId": "LEAD_EVENT_ID"
  }'
```

Do not run both automatic and manual evaluation for the same demonstration unless the resulting
duplicate business action is intentional.

## 12. Check Dead Letter Messages, If Applicable

The score and status actions above should not create a Dead Letter message:

```bash
curl --fail-with-body "$API_URL/dead-letter/messages"
```

Dead Letter records are created when a `SEND_WEBHOOK` action exhausts its configured delivery
attempts. Inspect a known message with:

```bash
curl --fail-with-body "$API_URL/dead-letter/messages/DEAD_LETTER_MESSAGE_ID"
```

Mark a reviewed message as ignored:

```bash
curl --fail-with-body -X PATCH \
  "$API_URL/dead-letter/messages/DEAD_LETTER_MESSAGE_ID/ignore"
```

Automatic Dead Letter reprocessing is not implemented in the current scope.

## Health and Metrics

```bash
curl --fail-with-body "$API_URL/health/live"
curl --fail-with-body "$API_URL/health/ready"
curl --fail-with-body "$API_URL/health"
curl --fail-with-body "$API_URL/metrics"
```

On Render Free, the first request after an idle period may be delayed by a cold start.
