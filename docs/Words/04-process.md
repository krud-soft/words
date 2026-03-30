---
title: Process
---

# Process

A `process` is the transition map for a module's functionality. It declares every state the module can be in under a given scenario, and for each state it declares what context triggers a move and where the module goes next. A module can have more than one process — each covering a distinct scenario within the same functionality.

## Purpose

A process makes behavior explicit. Rather than leaving transition logic scattered across implementation files or implicit in a model's interpretation of natural language, a process collects every possible movement in one place and names each one. An engineer reading a process block can answer three questions without reading anything else: what states exist in this scenario, what does each state produce to move forward, and where does the module go when it does.

This completeness is not incidental. A WORDS specification is only as useful as its coverage of the real behavior. A process that omits an error path is a process that will produce an implementation that silently ignores that error. WORDS makes omission visible — if a transition is not written down, it does not exist.

## Syntax

The `process` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body is a sequence of `when` rules:

```wds title="AuthModule/AuthModule.wds"
module AuthModule "Handles authentication and deauthentication" (
    process Authentication "Covers the flow from an unauthenticated state through credential submission to either a successful session or a returned error" (
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

Each `when` rule reads as a sentence: *when the module is in this state and returns this context, enter this next state*. The quoted string at the end is a transition narrative — a human-readable explanation of why the system moves. It is optional but strongly recommended. A process written with narratives is readable without prior knowledge of the system. A process without them requires the reader to reconstruct intent from names alone.

## The `when` Rule

The `when` rule is the only construct inside a process body and it follows the same structure:

```
when [CurrentState] returns [Context]
    enter [NextState] "narrative"
```

- `[CurrentState]` — the state the module is currently in
- `[Context]` — the context that state produced
- `[NextState]` — the state to enter as a result
- `"narrative"` — an optional human-readable explanation of why the transition occurs

The same state can appear as `CurrentState` in multiple `when` rules, each with a different `ProducedContext`. This is how branching is expressed: a state that can produce more than one context results in more than one `when` rule, one for each outcome.

```wds title="AuthModule/AuthModule.wds"
process PasswordReset "Covers the flow from a reset request through token issuance to credential update, including rate limiting and token expiry" (
    when ResetRequested returns ResetToken
        enter ResetPending "A reset token was issued and the user is waiting"
    when ResetRequested returns RateLimitError
        enter ResetRequested "Too many attempts — the user must try again"
    when ResetPending returns NewCredentials
        enter Unauthenticated "The password was reset and the session was cleared"
    when ResetPending returns TokenExpiredError
        enter ResetRequested "The token expired — the user must restart the process"
)
```

Each branch is a first-class part of the process. There is no default path and no fallthrough. Every outcome a state can produce must be covered by a corresponding `when` rule.

## Multiple Processes

A module can define more than one process. Each process covers a distinct scenario within the same functionality. The states and contexts involved in one process may overlap with those of another — a state can appear in multiple processes, and a context produced in one scenario may trigger a transition in another.

```wds title="AuthModule/AuthModule.wds"
module AuthModule "Handles authentication and deauthentication" (
    process Authentication "Covers the flow from an unauthenticated state through credential submission to either a successful session or a returned error" (
        when Unauthenticated returns AccountCredentials
            enter StartAuthenticating "The user tries to authenticate"
        when StartAuthenticating returns SystemUser
            enter Authenticated "The user authenticated successfully"
        when StartAuthenticating returns AuthError
            enter Unauthenticated "Authentication failed"
    )

    process Deauthentication "Covers the flow from an active session to a signed-out state" (
        when Authenticated returns SignOutRequest
            enter Unauthenticated "The user signed out"
    )

    start Unauthenticated
)
```

Splitting behavior into separate processes is a design decision, not a structural requirement. A single process can cover multiple scenarios if they are tightly related. The guiding principle is readability: a process should describe one coherent story about what the module does. When a second story begins — a different trigger, a different starting condition, a different outcome — a second process is usually the clearer choice.

## File Location

A process is declared inside its owning module's file. It is not a standalone construct and does not have its own file. The module file is the only place a process appears:

```
/my-project/
  AuthModule/
    AuthModule.wds        ← processes are declared here
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
      Authenticated.wds
    contexts/
      AccountCredentials.wds
      SystemUser.wds
      AuthError.wds
```

Each state and context referenced in the process must have a corresponding standalone construct file in the module's directory. The process declares the map — the individual files define the detail.

## Examples

A session module with two distinct processes — one for validating an existing session on load, one for handling expiry during an active session:

```wds title="SessionModule/SessionModule.wds"
module SessionModule "Manages session lifecycle" (
    process SessionValidation "Covers the check for an existing stored session on application load, resolving to either an active session or an unauthenticated state" (
        when SessionIdle returns StoredSession
            enter ValidatingSession "A stored session was found and is being checked"
        when ValidatingSession returns SessionUser
            enter ActiveSession "The session is valid and the user is active"
        when ValidatingSession returns SessionValidationError
            enter SessionIdle "The session was invalid or expired"
    )

    process SessionExpiry "Covers the transition out of an active session when the session token expires during use" (
        when ActiveSession returns SessionExpiredSignal
            enter SessionIdle "The session expired during use"
    )

    start SessionIdle
)
```

A checkout module handling the multi-step flow from cart review through payment confirmation:

```wds title="CheckoutModule/CheckoutModule.wds"
module CheckoutModule "Manages the purchase flow from cart to confirmation" (
    process Checkout "Covers the linear progression from cart review through shipping and payment to order confirmation, including back-navigation and payment failure" (
        when CartReview returns CartSummary
            enter ShippingDetails "The user confirmed the cart and is entering shipping details"
        when ShippingDetails returns ShippingSelection
            enter PaymentDetails "Shipping was selected and payment details are next"
        when ShippingDetails returns CartReviewRequest
            enter CartReview "The user went back to review the cart"
        when PaymentDetails returns PaymentMethod
            enter OrderConfirmation "Payment details were provided and the order is being confirmed"
        when PaymentDetails returns ShippingReviewRequest
            enter ShippingDetails "The user went back to change shipping details"
        when OrderConfirmation returns OrderReceipt
            enter OrderComplete "The order was placed successfully"
        when OrderConfirmation returns PaymentError
            enter PaymentDetails "Payment failed — the user must re-enter details"
    )

    start CartReview
)
```

## What a Process Does Not Contain

A process does not implement behavior — it maps it. The logic of what happens inside a state, what components it uses, what data it accepts, is defined in the state itself. A process only says: given this state and this output, go here next.

A process does not define contexts. Contexts are standalone constructs. A process references them by name.

A process does not define states. States are standalone constructs. A process references them by name.

This separation keeps the process readable as a map. Anyone — engineer, reviewer, or model — can read a process block and understand the full shape of a scenario without reading the detail of any individual state or context. That detail lives where it belongs: one level down.

## Relationship to Other Constructs

A process lives inside a `module`. It references `state` constructs by name — every state named in a `when` rule must have a corresponding state definition in the module's directory. It references `context` constructs by name — every context named after `returns` must have a corresponding context definition in the module's directory. The process itself is not referenced by any other construct — it is owned by the module and read as part of understanding the module's behavior.
