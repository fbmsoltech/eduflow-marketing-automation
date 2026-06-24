# Google Meet Interview Scheduler

This folder contains the demonstration Google Apps Script used by EduFlow Phase 27.

The script receives a `SEND_WEBHOOK` request from EduFlow, reads interview availability from
`body.schedule`, finds the first free Google Calendar slot and creates a Google Meet interview
event with the candidate as an attendee.

## Files

```txt
interview-scheduler.gs
```

## Backend Boundary

This integration intentionally does not add Google OAuth, Google Calendar modules or Google
credentials to the EduFlow backend.

EduFlow only sends a webhook. Google authorization is handled by the Google Apps Script Web App
owner when the script is deployed.

## Required Apps Script Services

Enable the advanced Google service:

```txt
Services > Add a service > Google Calendar API
```

Also enable the Google Calendar API in the linked Google Cloud project when prompted by Apps
Script.

## Required `appsscript.json`

Use a manifest similar to this:

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

## Safe Configuration

Do not commit:

- the real Apps Script Web App URL;
- real candidate emails;
- Google account credentials;
- screenshots containing private calendar data.

Use placeholders such as:

```txt
GOOGLE_APPS_SCRIPT_WEB_APP_URL
candidate@example.com
```

Full setup and testing instructions are documented in
[`docs/google-meet-interview-webhook.md`](../../docs/google-meet-interview-webhook.md).
