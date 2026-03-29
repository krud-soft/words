---
title: Overview
---

# WORDS
### Workflow-Oriented Reactive Design Specifications

---

WORDS is a behavioral specification language for describing complex software systems. It operates at an intermediate level between a human requirement and a working implementation — structured enough to be machine-actionable, close enough to natural language to be written and reviewed without tooling.

## The Problem It Solves

Software development carries a persistent cost beyond the code itself. Technical debt accumulates through pressure for rapid delivery, insufficient attention to design, and documentation that is incomplete, ambiguous, or disconnected from what was actually built. These are not incidental failures — they are structural ones, built into the way most teams move from requirements to implementation.

LLMs have accelerated the pace of software delivery but have not resolved this structural problem. Given a loosely worded requirement, a model will appear to understand it — then quietly fill in the gaps: merging concepts, inventing transitions, misreading ownership. The output looks plausible. The errors are subtle and hard to catch. Across different model releases, the same prompt yields different architectural decisions. There is no stable contract between what the engineer intended and what the model produced.

WORDS addresses this directly. Rather than prompting a model from natural language requirements, an engineer describes the system in WORDS first. That description is explicit, structured, and unambiguous. Every behavioral decision is made visible. Nothing is left for the model to infer — and nothing changes between model versions, because the specification is the same.

## The Approach

WORDS sits between the engineer and the model. An engineer — or a lightly guided language model — produces a WORDS description from requirements. That description can then be deterministically transformed into formal diagrams, optimized prompts, or direct inputs to smaller, specialized models responsible for generating code, tests, and documentation.

This decomposition is deliberate. Rather than asking a single large model to go from requirements to implementation in one step, WORDS breaks the problem into well-defined units. Each unit can be handled by a focused agent. The system as a whole becomes auditable: the specification is readable, the transformations are traceable, and the outputs are verifiable against the WORDS parser before anything is handed to a downstream tool.

## How It Works

A WORDS specification describes a system as a set of **state-driven behaviors** coordinated by explicit **transitions**. The language is built on a small number of constructs:

| Layer | Constructs |
|---|---|
| Application | `system` |
| Organisation | `module` |
| Behaviour | `process`, `state` |
| Data | `context` |
| Component | `screen`, `view` |
| Component | `provider` |
| Component | `adapter` |
| Component | `interface` |

Each construct has a defined role, a defined relationship to other constructs, and a defined syntax. A state declares what it receives, what it can return, and what it mounts. A process declares every transition explicitly. An adapter is the only construct permitted to perform I/O. These constraints are not restrictions — they are the reason a WORDS specification can be handed to a model and reliably translated into correct, working code in any target language or framework.

The `system` construct exposes runtime access to modules and provides three built-in methods for sharing contexts across module boundaries: `system.getContext()` retrieves a stored context by name, `system.setContext()` stores a context while `system.dropContext()` clears it. These are the only behavioral concerns that live at the `system` level — everything else belongs to the modules themselves.

## Who It Is For

WORDS is designed for three audiences simultaneously:

- **Engineering and product teams** who need a precise, reviewable description of system behavior that does not require a dedicated modeling tool to read or write.
- **Large Language Models** acting as specification assistants, which can generate WORDS descriptions from requirements using one-shot prompting against this documentation.
- **Small Language Models** fine-tuned for specific tasks — from WORDS to implementation, from WORDS to tests, from WORDS to documentation — that can run on consumer hardware without cloud infrastructure, recurring subscription costs, or data leaving the local environment.

A WORDS specification written by an engineer can be passed directly to any of these consumers with confidence that all parties are working from the same understanding.

## What This Documentation Covers

This documentation is the complete language reference for WORDS. It covers:

- The **core constructs** and how they compose
- **Syntax rules** and naming conventions
- **Module boundaries** and cross-module communication patterns
- **Routing**, **context persistence**, and other system-level patterns
- **File structure** for organising a WORDS project

Start with [Overview](/words/docs/Words/intro) for a structured introduction, or jump directly to any section from the sidebar.
