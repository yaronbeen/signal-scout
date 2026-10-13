---
date: 2026-10-13
problem_type: [integration_issue]
component: Bright Data SERP discovery
root_cause: [config_error, missing_selection]
severity: high
tags: [bright-data, serp, zones, timeout]
---

# Active SERP zones are not interchangeable

## Problem and evidence

Instagram, LinkedIn, and X failed together while native YouTube/TikTok snapshot jobs remained pending. All three failed platforms share the search API. The relay selected the first active SERP zone returned by account metadata.

A bounded developer-account diagnostic using the Instagram `ai ugc` creator query timed out on the first active zone, while another active zone returned origin HTTP 200 and ten organic results. This establishes a zone-dependent failure in that probe; it does not establish the exact provider configuration fault or prove the user's pending snapshot jobs failed.

## Solution

- `/api/connect` lists active SERP zone names.
- The search form allows the visitor to choose a zone; start/resume passes it to discovery.
- When an account has multiple active zones, connecting leaves the choice empty. The UI and relay both require an explicit selection before discovery; a single active zone can be selected automatically. No zone is hard-coded for other visitors.
- The relay validates the chosen zone against that visitor's active account zones before dispatch. A missing/disabled/foreign zone never silently falls back.
- Origin errors identify the selected zone and origin HTTP status without exposing raw provider bodies.
- Changing a selection never dispatches a search. Failed paid requests retain uncertainty and require explicit retry authorization.

## Prevention and verification

An account's active flag establishes configuration availability, not successful search-engine access. Keep the selection visible, preserve successful platforms, and never automatically probe or fail over with extra paid calls. Unit tests cover zone ownership, disabled zones, selected dispatch, and safe origin errors. Desktop/mobile browser tests cover selecting a different zone without billing or replay.

YouTube/TikTok remain independent asynchronous jobs. Check existing snapshot status or resume polling rather than resubmitting discovery.
