# Google Meet Interview Webhook

## Objective

Phase 27 adds a demonstrative EduFlow to Google Meet integration for qualified candidates.

When an automation triggered by `lead.score.updated` qualifies a candidate, EduFlow can execute a
`SEND_WEBHOOK` action that calls a Google Apps Script Web App. The script reads available interview
windows from the automation JSON, finds the first free Calendar slot, creates a Google Calendar
event with Google Meet and sends the invitation to the candidate.

This phase does not add Google OAuth, Google Calendar clients or interview availability tables to
the NestJS backend.

## Architecture

```txt
Google Forms / API event
        |
        v
EduFlow LeadEvent
        |
        v
Outbox -> RabbitMQ / CloudAMQP -> Automation Worker
        |
        v
lead.score.updated automation
        |
        v
SEND_WEBHOOK
        |
        v
Google Apps Script Web App
        |
        v
Google Calendar event + Google Meet + candidate email invite
```

EduFlow remains responsible for automation evaluation and webhook delivery. Apps Script owns Google
Calendar authorization and event creation.

## Prerequisites

- EduFlow API, Outbox Publisher Worker and Automation Worker running locally or remotely.
- A Google account with access to the destination Calendar.
- Permission to create a Google Apps Script project.
- Synthetic candidate data only.
- A non-secret placeholder in documentation and automation templates:

```txt
GOOGLE_APPS_SCRIPT_WEB_APP_URL
```

## Create The Apps Script

1. Open `https://script.google.com`.
2. Create a new Apps Script project.
3. Rename it to `EduFlow Interview Scheduler`.
4. Copy the contents of
   [`integrations/google-meet/interview-scheduler.gs`](../integrations/google-meet/interview-scheduler.gs)
   into the default script file.
5. Review `MEET_CONFIG.calendarId`. Keep `primary` for the signed-in account calendar or replace it
   with a non-secret calendar ID that belongs to your Google account.

Do not paste the deployed Web App URL into tracked files.

## Enable Advanced Google Calendar API

In Apps Script:

1. Open **Services**.
2. Click **Add a service**.
3. Select **Google Calendar API**.
4. Keep identifier `Calendar`.
5. Add the service.

If Apps Script asks to enable the API in the linked Google Cloud project, open the link and enable
Google Calendar API there too.

## Configure `appsscript.json`

Open project settings and enable **Show "appsscript.json" manifest file in editor**.

Use this manifest shape:

```json
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Calendar",
        "serviceId": "calendar",
        "version": "v3"
      }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

The `calendar` scope lets the script inspect and create Calendar events. Google will ask the script
owner to authorize these permissions during deployment or the first execution.

## Deploy As Web App

1. Click **Deploy > New deployment**.
2. Select **Web app**.
3. Set **Execute as** to **Me**.
4. Set access according to the demo context. For a private portfolio test, use the most restrictive
   option that still lets EduFlow call the endpoint.
5. Deploy and authorize the script.
6. Copy the Web App URL into a trusted local note or environment, not into Git.

Example placeholder:

```txt
GOOGLE_APPS_SCRIPT_WEB_APP_URL
```

## Test With Curl

Use synthetic data:

```bash
curl --fail-with-body -X POST "GOOGLE_APPS_SCRIPT_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -H "x-source: eduflow" \
  -H "x-demo: google-meet-interview" \
  -d '{
    "source": "eduflow",
    "eventType": "lead.score.updated",
    "lead": {
      "email": "candidate@example.com",
      "fullName": "Candidate Example",
      "score": 40,
      "status": "QUALIFIED"
    },
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
  }'
```

Expected successful response:

```json
{
  "statusCode": 201,
  "ok": true,
  "calendarEventId": "CALENDAR_EVENT_ID",
  "htmlLink": "https://www.google.com/calendar/event?eid=...",
  "hangoutLink": "https://meet.google.com/...",
  "candidateEmail": "candidate@example.com",
  "candidateName": "Candidate Example",
  "scheduledAt": "2026-06-24T22:00:00.000Z"
}
```

Apps Script `ContentService` returns a JSON body with `statusCode`; it does not behave exactly like
a full HTTP server for custom response codes.

## EduFlow Automation Example

Create the score-based automation after the score-producing automation exists.

```json
{
  "organizationId": "ORGANIZATION_ID",
  "campaignId": "CAMPAIGN_ID",
  "name": "Schedule interview for qualified candidates",
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

The important configuration is `actions[].config.body.schedule`. This is where the user defines
available dates and times for this phase.

## Webhook Payload Shape

`SEND_WEBHOOK` sends the configured body merged with EduFlow context:

```json
{
  "schedule": {
    "timezone": "America/Sao_Paulo",
    "durationMinutes": 30,
    "slots": []
  },
  "source": "eduflow",
  "eventType": "lead.score.updated",
  "organizationId": "ORGANIZATION_ID",
  "campaignId": "CAMPAIGN_ID",
  "leadId": "LEAD_ID",
  "lead": {
    "id": "LEAD_ID",
    "email": "candidate@example.com",
    "fullName": "Candidate Example",
    "status": "QUALIFIED",
    "score": 40
  },
  "leadEventId": "LEAD_EVENT_ID",
  "automationFlowId": "AUTOMATION_ID",
  "automationExecutionId": "AUTOMATION_EXECUTION_ID",
  "occurredAt": "2026-06-23T22:00:00.000Z",
  "payload": {
    "source": "automation_engine",
    "reason": "lead_score_changed"
  }
}
```

EduFlow context wins if `config.body` uses the same top-level keys. Keep custom fields under clear
names such as `schedule`.

## Scheduling Rules

The Apps Script:

- reads `schedule.timezone`;
- reads `schedule.durationMinutes`;
- reads `schedule.slots`;
- splits each availability window into blocks of `durationMinutes`;
- checks existing events in the configured Google Calendar;
- chooses the first block without conflict;
- creates a Google Calendar event;
- adds the candidate as an attendee;
- creates a Google Meet link with `conferenceData.createRequest`;
- uses `sendUpdates = all` so Google sends the invitation email.

If no available slot exists, the script returns:

```json
{
  "statusCode": 409,
  "ok": false,
  "error": "No available interview slot was found for the configured schedule."
}
```

EduFlow treats non-2xx responses or delivery failures according to the existing webhook retry and
Dead Letter behavior.

## Candidate Data Extraction

The script tries these paths before falling back to a recursive email search:

```txt
body.lead.email
body.payload.lead.email
body.data.lead.email
body.event.payload.answers.E-mail
body.leadEvent.payload.answers.E-mail
```

For names it checks common `fullName`, `name`, `Nome` and `Name` fields. If no name is found, the
email is used as the display name.

## Validate The Calendar Event

After a successful call:

1. Open Google Calendar for the account that deployed the Web App.
2. Find an event named `EduFlow Interview - Candidate Example`.
3. Confirm the selected time is the first free block from the configured slots.
4. Open the event and confirm the Google Meet link exists.
5. Confirm the candidate appears as an attendee.

## Validate The Candidate Email

Use only a synthetic mailbox you control.

1. Open the candidate mailbox.
2. Confirm a Google Calendar invitation was received.
3. Confirm the invite includes the interview time and Google Meet link.
4. Confirm accept/decline actions are available.

## Errors And Dead Letter

Common failures:

- missing candidate email;
- missing or invalid `schedule`;
- all configured slots already busy;
- Apps Script not authorized for Calendar access;
- Calendar advanced service not enabled;
- Web App URL not deployed or not accessible to EduFlow;
- Google account policy blocking attendee invitation emails.

EduFlow `SEND_WEBHOOK` retries delivery using `WEBHOOK_MAX_ATTEMPTS`,
`WEBHOOK_RETRY_DELAY_MS` and `WEBHOOK_TIMEOUT_MS`. After the final failed attempt, EduFlow stores a
`webhook.delivery_failed` DeadLetterMessage for inspection.

## Limitations

- Availability is configured in automation JSON, not in the database.
- The script books the first available block and does not expose a candidate self-scheduling page.
- Apps Script authorization belongs to the script owner.
- There is no backend-side OAuth Google flow.
- There is no Interview Availability module or administrative frontend.
- This is a portfolio integration and must use synthetic data.

## Future Improvements

- Add an Interview Availability module.
- Store reusable availability windows per campaign.
- Add an Interview entity and idempotent scheduling records.
- Add cancellation and rescheduling flows.
- Add Google OAuth or service-account strategy after the backend reaches the integration phase.
- Add `interview.scheduled` LeadEvent creation after successful webhook callbacks.
- Add richer Dead Letter reprocessing controls.
