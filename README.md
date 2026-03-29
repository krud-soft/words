# WORDS Documentation

> **Workflow-Oriented Reactive Design Specifications** — a behavioral specification language for describing complex software systems.

This repository contains the official documentation site for WORDS, built with [Docusaurus](https://docusaurus.io/).

---

## What is WORDS?

WORDS sits at an intermediate level between a human requirement and a working implementation — structured enough to be machine-actionable, close enough to natural language to be written and reviewed without tooling.

Rather than prompting a model from loosely worded requirements, an engineer describes the system in WORDS first. That description is explicit, structured, and unambiguous. Every behavioral decision is made visible. Nothing is left for a model to infer — and nothing changes between model versions, because the specification is the same.

```wds
module AuthModule "Handles authentication and deauthentication" (
    process Authentication (
        when Unauthenticated returns AccountCredentials
            enter StartAuthenticating "The user tries to authenticate"
        when StartAuthenticating returns SystemUser
            enter Authenticated "The user authenticated successfully"
        when StartAuthenticating returns AuthError
            enter Unauthenticated "Authentication failed"
    )

    start Unauthenticated
)
```

---

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm, yarn, or pnpm

### Installation

```bash
npm install
```

### Local Development

```bash
npm start
```

This starts a local development server and opens the documentation in your browser. Most changes are reflected live without restarting the server.

### Build

```bash
npm run build
```

This generates static content into the `build` directory, ready to be served by any static hosting service.

### Deployment

```bash
npm run deploy
```

Builds the site and deploys it to GitHub Pages (if configured). See the [Docusaurus deployment guide](https://docusaurus.io/docs/deployment) for other hosting options.

---

## The Language at a Glance

WORDS is built on a small number of constructs organized into two layers:

**System organization and behavior**

| Construct | Role |
|---|---|
| `system` | Names the product, declares which modules compose it |
| `module` | Groups processes, states, contexts, and components around a functionality |
| `process` | The transition map — every state, every outcome, every path |
| `state` | A stable condition; declares what it receives, returns, and uses |
| `context` | Structured, typed data that flows between states |

**Components** (closest to implementation)

| Construct | Role |
|---|---|
| `screen` | Top-level UI unit; used by a state; has direct access to state data |
| `view` | Reusable rendering unit; receives everything via props |
| `provider` | Computes in-memory derived data; no I/O |
| `adapter` | The only construct permitted to perform I/O |
| `interface` | Named, typed contracts — models, helpers, handler shapes |

---

## Contributing

Contributions to the documentation are welcome. Please open an issue before submitting a pull request for significant changes, so the direction can be discussed first.

When editing documentation:

- Keep examples self-contained and representative of real usage
- Include transition narratives in all `process` examples
- Follow the file naming conventions shown in each section's **File Location** guide
- Test your changes locally with `npm start` before submitting

---

## License

See [LICENSE](./LICENSE) for details.
