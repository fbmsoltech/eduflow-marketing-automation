# Google Forms Selection Process Demo

This demo shows how Google Forms-style submissions can feed EduFlow and then schedule interviews
through the Google Meet webhook integration.

The repository does not remove or replace Google Forms. In this phase, Google Forms remains an
external source of candidate data, while EduFlow owns event ingestion, score automation and webhook
dispatch.

## Flow

```txt
Google Forms response
        |
        v
POST /lead-events form.submitted
        |
        v
Automation increases lead score
        |
        v
Internal lead.score.updated event
        |
        v
Automation qualifies candidate and calls SEND_WEBHOOK
        |
        v
Google Apps Script creates Calendar event and Google Meet
```

## Candidate Payload Example

When adapting a Forms response to EduFlow, keep candidate contact fields in the Lead and optionally
in the event payload answers:

```json
{
  "organizationId": "ORGANIZATION_ID",
  "campaignId": "CAMPAIGN_ID",
  "leadId": "LEAD_ID",
  "eventType": "form.submitted",
  "occurredAt": "2026-06-23T22:00:00.000Z",
  "payload": {
    "formId": "selection-process-2026",
    "answers": {
      "Nome": "Candidate Example",
      "E-mail": "candidate@example.com",
      "WhatsApp": "+55 11 90000-0000"
    }
  },
  "correlationId": "google-forms-demo-001",
  "idempotencyKey": "ORGANIZATION_ID:form.submitted:google-forms-demo-001"
}
```

Use only synthetic data in demos and documentation.

## Score Automation

Create a first automation that reacts to `form.submitted` and increases the score:

```json
{
  "organizationId": "ORGANIZATION_ID",
  "campaignId": "CAMPAIGN_ID",
  "name": "Score submitted selection forms",
  "triggerEventType": "form.submitted",
  "conditions": [],
  "actions": [
    {
      "type": "INCREASE_LEAD_SCORE",
      "config": {
        "amount": 40
      },
      "sortOrder": 1
    }
  ]
}
```

The score action creates an internal `lead.score.updated` event after the new score is persisted.

## Interview Automation

Create a second automation that reacts to `lead.score.updated`, qualifies the candidate and calls
the Google Apps Script Web App:

```json
{
  "organizationId": "ORGANIZATION_ID",
  "campaignId": "CAMPAIGN_ID",
  "name": "Schedule Google Meet interview",
  "triggerEventType": "lead.score.updated",
  "conditions": [
    {
      "fieldPath": "lead.score",
      "operator": "GREATER_THAN_OR_EQUALS",
      "expectedValue": 30,
      "sortOrder": 1
    }
  ],
  "actions": [
    {
      "type": "UPDATE_LEAD_STATUS",
      "config": {
        "status": "QUALIFIED"
      },
      "sortOrder": 1
    },
    {
      "type": "SEND_WEBHOOK",
      "config": {
        "url": "GOOGLE_APPS_SCRIPT_WEB_APP_URL",
        "method": "POST",
        "headers": {
          "x-source": "eduflow",
          "x-demo": "google-meet-interview"
        },
        "body": {
          "schedule": {
            "timezone": "America/Sao_Paulo",
            "durationMinutes": 30,
            "slots": [
              {
                "date": "2026-06-24",
                "startTime": "19:00",
                "endTime": "21:00"
              },
              {
                "date": "2026-06-25",
                "startTime": "18:00",
                "endTime": "20:00"
              }
            ]
          }
        }
      },
      "sortOrder": 2
    }
  ]
}
```

The interview availability is configured in `config.body.schedule`. No availability table is
created in this phase.

## Validation

1. Submit or simulate the Google Forms response.
2. Confirm `form.submitted` was registered.
3. Confirm the first automation increased the lead score.
4. Confirm the internal `lead.score.updated` LeadEvent exists.
5. Confirm the lead status becomes `QUALIFIED`.
6. Confirm the `SEND_WEBHOOK` action reaches Apps Script.
7. Confirm a Google Calendar event with Google Meet is created.
8. Confirm the synthetic candidate mailbox receives the invitation.

See [Google Meet Interview Webhook](google-meet-interview-webhook.md) for Apps Script setup and
manual curl tests.
