-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ENGAGED', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationFlowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN', 'LESS_THAN_OR_EQUALS', 'EXISTS', 'NOT_CONTAINS', 'NOT_EXISTS');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('CREATE_TASK', 'SEND_WEBHOOK', 'SEND_NOTIFICATION', 'UPDATE_LEAD_STATUS', 'INCREASE_LEAD_SCORE', 'DECREASE_LEAD_SCORE');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboxMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTERED');

-- CreateEnum
CREATE TYPE "DeadLetterMessageStatus" AS ENUM ('PENDING', 'REPROCESSED', 'IGNORED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "lead_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "lead_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flows" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "name" TEXT NOT NULL,
    "status" "AutomationFlowStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger_event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_conditions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "field_path" TEXT NOT NULL,
    "operator" "AutomationConditionOperator" NOT NULL,
    "expected_value" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_actions" (
    "id" UUID NOT NULL,
    "flow_id" UUID NOT NULL,
    "type" "AutomationActionType" NOT NULL,
    "config" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "campaign_id" UUID,
    "flow_id" UUID NOT NULL,
    "lead_id" UUID,
    "lead_event_id" UUID,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "correlation_id" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "outbox_message_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "error_details" JSONB,
    "status" "DeadLetterMessageStatus" NOT NULL DEFAULT 'PENDING',
    "failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprocessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letter_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_organization_id_status_idx" ON "tasks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "tasks_campaign_id_status_idx" ON "tasks"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "tasks_lead_id_status_idx" ON "tasks"("lead_id", "status");

-- CreateIndex
CREATE INDEX "tasks_priority_due_at_idx" ON "tasks"("priority", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "campaigns_organization_id_status_idx" ON "campaigns"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_organization_id_slug_key" ON "campaigns"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "leads_organization_id_status_idx" ON "leads"("organization_id", "status");

-- CreateIndex
CREATE INDEX "leads_campaign_id_status_idx" ON "leads"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organization_id_email_key" ON "leads"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_events_event_id_key" ON "lead_events"("event_id");

-- CreateIndex
CREATE INDEX "lead_events_organization_id_event_type_occurred_at_idx" ON "lead_events"("organization_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "lead_events_campaign_id_event_type_idx" ON "lead_events"("campaign_id", "event_type");

-- CreateIndex
CREATE INDEX "lead_events_lead_id_occurred_at_idx" ON "lead_events"("lead_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "lead_events_organization_id_idempotency_key_key" ON "lead_events"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "automation_flows_organization_id_status_idx" ON "automation_flows"("organization_id", "status");

-- CreateIndex
CREATE INDEX "automation_flows_campaign_id_status_idx" ON "automation_flows"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "automation_flows_trigger_event_type_status_idx" ON "automation_flows"("trigger_event_type", "status");

-- CreateIndex
CREATE INDEX "automation_conditions_flow_id_sort_order_idx" ON "automation_conditions"("flow_id", "sort_order");

-- CreateIndex
CREATE INDEX "automation_actions_flow_id_sort_order_idx" ON "automation_actions"("flow_id", "sort_order");

-- CreateIndex
CREATE INDEX "automation_executions_organization_id_status_started_at_idx" ON "automation_executions"("organization_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "automation_executions_flow_id_status_idx" ON "automation_executions"("flow_id", "status");

-- CreateIndex
CREATE INDEX "automation_executions_lead_id_started_at_idx" ON "automation_executions"("lead_id", "started_at");

-- CreateIndex
CREATE INDEX "outbox_messages_idempotency_key_idx" ON "outbox_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_messages_status_occurred_at_idx" ON "outbox_messages"("status", "occurred_at");

-- CreateIndex
CREATE INDEX "outbox_messages_aggregate_type_aggregate_id_idx" ON "outbox_messages"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbox_messages_organization_id_status_idx" ON "outbox_messages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "dead_letter_messages_status_failed_at_idx" ON "dead_letter_messages"("status", "failed_at");

-- CreateIndex
CREATE INDEX "dead_letter_messages_organization_id_status_idx" ON "dead_letter_messages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "dead_letter_messages_outbox_message_id_idx" ON "dead_letter_messages"("outbox_message_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_conditions" ADD CONSTRAINT "automation_conditions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "automation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_lead_event_id_fkey" FOREIGN KEY ("lead_event_id") REFERENCES "lead_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_messages" ADD CONSTRAINT "dead_letter_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_messages" ADD CONSTRAINT "dead_letter_messages_outbox_message_id_fkey" FOREIGN KEY ("outbox_message_id") REFERENCES "outbox_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
