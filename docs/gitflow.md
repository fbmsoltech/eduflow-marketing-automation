# GitFlow Strategy

This project follows a GitFlow-based workflow to keep the repository organized and to simulate a professional software delivery process.

## Main Branches

### main

The `main` branch represents production-ready code.

Rules:

- Only receives merges from `release/*` or `hotfix/*` branches.
- Every production release must generate a Git tag.
- Direct commits are not allowed.

### develop

The `develop` branch represents the integration environment.

Rules:

- Receives merges from `feature/*`, `fix/*`, `docs/*`, `chore/*` and `release/*`.
- Must always be in a deployable state for the development environment.
- Direct commits should be avoided.

## Supporting Branches

### feature/*

Used for new application features.

Examples:

```txt
feature/project-bootstrap
feature/organizations-module
feature/campaigns-module
feature/leads-module
feature/event-ingestion
feature/outbox-pattern
feature/automation-engine
```

### fix/*

Used for bug fixes before production release.

Examples:

```txt
fix/lead-event-validation
fix/automation-condition-evaluator
```

### hotfix/*

Used for urgent production fixes.

Examples:

```txt
hotfix/1.0.1-webhook-retry
```

### release/*

Used to prepare a production release.

Examples:

```txt
release/1.0.0
release/1.1.0
```

### docs/*

Used for documentation changes.

Examples:

```txt
docs/project-documentation
docs/api-documentation
```

### chore/*

Used for tooling, dependencies, repository configuration and non-feature changes.

Examples:

```txt
chore/eslint-prettier
chore/docker-compose
chore/dependency-upgrade
```

## Commit Pattern

The project uses Conventional Commits.

Format:

```txt
type(scope): description
```

Examples:

```txt
feat(leads): add lead creation endpoint
fix(events): validate duplicated idempotency key
docs(architecture): add event-driven architecture overview
test(automations): add condition evaluator unit tests
chore(docker): add postgres service to compose
ci(github): add pull request validation workflow
```

## Allowed Commit Types

```txt
feat
fix
docs
test
chore
ci
refactor
perf
build
```

## Pull Request Rules

Every pull request must include:

- what was changed;
- why it was changed;
- how to test;
- evidence when applicable;
- checklist.

## Release Flow

```txt
develop -> release/x.y.z -> main
                         -> develop
```

After merging into `main`, create a tag:

```bash
git tag vx.y.z
git push origin vx.y.z
```

## Hotfix Flow

```txt
main -> hotfix/x.y.z-description -> main
                                  -> develop
```

## Environment Mapping

```txt
feature/*  -> no automatic deploy
docs/*     -> no automatic deploy
chore/*    -> no automatic deploy
develop    -> development deploy
release/*  -> staging deploy
main tag   -> production deploy
```
