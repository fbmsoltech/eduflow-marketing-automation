const MEET_CONFIG = {
  calendarId: 'primary',
  defaultTimezone: 'America/Sao_Paulo',
  defaultDurationMinutes: 30,
  eventTitlePrefix: 'EduFlow Interview',
};

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    const candidate = extractCandidateData(body);
    const schedule = extractScheduleConfig(body);
    const slot = findFirstAvailableSlot(schedule);

    if (!slot) {
      return jsonResponse(
        {
          ok: false,
          error: 'No available interview slot was found for the configured schedule.',
        },
        409,
      );
    }

    const event = createGoogleMeetInterview(candidate, slot, schedule, body);

    return jsonResponse(
      {
        ok: true,
        calendarEventId: event.id,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        scheduledAt: slot.start.toISOString(),
      },
      201,
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Request body is required.');
  }

  try {
    const body = JSON.parse(e.postData.contents);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Request body must be a JSON object.');
    }
    return body;
  } catch (error) {
    throw new Error('Request body must be valid JSON.');
  }
}

function extractCandidateData(body) {
  const email =
    getNestedValue(body, 'lead.email') ||
    getNestedValue(body, 'payload.lead.email') ||
    getNestedValue(body, 'data.lead.email') ||
    getNestedValue(body, 'event.payload.answers.E-mail') ||
    getNestedValue(body, 'leadEvent.payload.answers.E-mail') ||
    findEmailRecursively(body);

  if (!email) {
    throw new Error('Candidate email was not found in the webhook payload.');
  }

  const name =
    getNestedValue(body, 'lead.fullName') ||
    getNestedValue(body, 'lead.name') ||
    getNestedValue(body, 'payload.lead.fullName') ||
    getNestedValue(body, 'payload.lead.name') ||
    getNestedValue(body, 'data.lead.fullName') ||
    getNestedValue(body, 'data.lead.name') ||
    getNestedValue(body, 'event.payload.answers.Nome') ||
    getNestedValue(body, 'event.payload.answers.Name') ||
    getNestedValue(body, 'leadEvent.payload.answers.Nome') ||
    getNestedValue(body, 'leadEvent.payload.answers.Name') ||
    email;

  return {
    email: String(email).trim(),
    name: String(name).trim(),
  };
}

function extractScheduleConfig(body) {
  const schedule = getNestedValue(body, 'schedule') || getNestedValue(body, 'body.schedule');

  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    throw new Error('schedule must be provided in the webhook payload.');
  }

  const timezone = schedule.timezone || MEET_CONFIG.defaultTimezone;
  const durationMinutes = Number(schedule.durationMinutes || MEET_CONFIG.defaultDurationMinutes);
  const slots = schedule.slots;

  if (typeof timezone !== 'string' || !timezone.trim()) {
    throw new Error('schedule.timezone must be a non-empty string.');
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('schedule.durationMinutes must be a positive integer.');
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('schedule.slots must contain at least one slot.');
  }

  return {
    timezone: timezone.trim(),
    durationMinutes,
    slots,
  };
}

function findFirstAvailableSlot(schedule) {
  const candidateSlots = generateCandidateSlots(schedule);

  for (const slot of candidateSlots) {
    if (isCalendarSlotAvailable(slot.start, slot.end)) {
      return slot;
    }
  }

  return null;
}

function generateCandidateSlots(schedule) {
  const slots = [];
  const durationMs = schedule.durationMinutes * 60 * 1000;

  schedule.slots.forEach(function (window) {
    if (
      !window ||
      typeof window.date !== 'string' ||
      typeof window.startTime !== 'string' ||
      typeof window.endTime !== 'string'
    ) {
      throw new Error('Each schedule slot must contain date, startTime and endTime.');
    }

    const windowStart = buildDateInTimezone(window.date, window.startTime, schedule.timezone);
    const windowEnd = buildDateInTimezone(window.date, window.endTime, schedule.timezone);

    if (windowEnd.getTime() <= windowStart.getTime()) {
      throw new Error('schedule.slots endTime must be after startTime.');
    }

    for (
      let cursor = new Date(windowStart.getTime());
      cursor.getTime() + durationMs <= windowEnd.getTime();
      cursor = new Date(cursor.getTime() + durationMs)
    ) {
      slots.push({
        start: new Date(cursor.getTime()),
        end: new Date(cursor.getTime() + durationMs),
      });
    }
  });

  return slots;
}

function isCalendarSlotAvailable(startDate, endDate) {
  const response = Calendar.Events.list(MEET_CONFIG.calendarId, {
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return !response.items || response.items.length === 0;
}

function createGoogleMeetInterview(candidate, slot, schedule, body) {
  const event = {
    summary: MEET_CONFIG.eventTitlePrefix + ' - ' + candidate.name,
    description:
      'Interview scheduled automatically by EduFlow.\n\n' +
      'Automation execution: ' +
      (body.automationExecutionId || 'not provided') +
      '\nLead event: ' +
      (body.leadEventId || 'not provided'),
    start: {
      dateTime: slot.start.toISOString(),
      timeZone: schedule.timezone,
    },
    end: {
      dateTime: slot.end.toISOString(),
      timeZone: schedule.timezone,
    },
    attendees: [
      {
        email: candidate.email,
        displayName: candidate.name,
      },
    ],
    conferenceData: {
      createRequest: {
        requestId:
          'eduflow-' +
          String(body.automationExecutionId || body.leadEventId || new Date().getTime()),
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };

  return Calendar.Events.insert(event, MEET_CONFIG.calendarId, {
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });
}

function getNestedValue(object, path) {
  return path.split('.').reduce(function (current, key) {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, object);
}

function findEmailRecursively(value) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (typeof value === 'string' && emailPattern.test(value.trim())) {
    return value.trim();
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEmailRecursively(item);
      if (found) return found;
    }
    return null;
  }

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const found = findEmailRecursively(value[key]);
      if (found) return found;
    }
  }

  return null;
}

function jsonResponse(payload, statusCode) {
  return ContentService.createTextOutput(
    JSON.stringify(
      {
        statusCode: statusCode,
        ...payload,
      },
      null,
      2,
    ),
  ).setMimeType(ContentService.MimeType.JSON);
}

function buildDateInTimezone(date, time, timezone) {
  const dateParts = date.split('-').map(Number);
  const timeParts = time.split(':').map(Number);

  if (dateParts.length !== 3 || timeParts.length < 2) {
    throw new Error('Invalid slot date or time format.');
  }

  const utcGuess = new Date(
    Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0),
  );
  const formattedInTimezone = Utilities.formatDate(
    utcGuess,
    timezone,
    "yyyy-MM-dd'T'HH:mm:ss",
  );
  const timezoneDateAsUtc = new Date(formattedInTimezone + 'Z');
  const offsetMs = timezoneDateAsUtc.getTime() - utcGuess.getTime();

  return new Date(utcGuess.getTime() - offsetMs);
}
